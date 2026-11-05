import type { AppServices } from '../../shared/AppServices';
import { sha256 } from '../../shared/sha256';
import { createSeededRandom, shuffle } from '../../shared/SeededRandom';
import type {
  Category,
  ChildProfile,
  Difficulty,
  SessionItem,
} from '../models/types';
import { allowedDifficulties } from '../policies/AgeBandPolicy';
import { dailySeed } from '../policies/DailyPlanPolicy';
import { adaptDifficulty } from '../policies/DifficultyPolicy';
import { normalizePrompt } from '../policies/SelectionPolicy';
import {
  memoryObjectsGenerator,
  patternGenerators,
  generatePatternQuestion,
} from '../puzzles';
import type { McqSessionPreparation } from './createMcqSession';

/** The ID excludes content version so an existing daily plan always wins. */
export async function createDailySession(
  services: AppServices,
  profile: ChildProfile,
): Promise<McqSessionPreparation> {
  const localDate = services.clock.localDate();
  const id = `daily-${sha256(`${profile.id}|${localDate}`).slice(0, 32)}`;
  const existing = await services.sessions.get(id);
  if (existing) return { kind: 'ready', session: existing };
  const metadata = await services.contentMetadata.get('bundled_questions_v1');
  if (!metadata)
    throw new Error('Daily content is not ready. Please restart the app.');
  const seed = dailySeed(profile.id, localDate, metadata.contentVersion);
  const random = createSeededRandom(seed);
  const history = await services.attempts.listForProfile(profile.id);
  const historyQuestions = await Promise.all(
    history.map(a => services.questions.getQuestion(a.questionId)),
  );
  const categories: readonly Category[] = ['GK', 'SCIENCE', 'SPORTS', 'SPACE'];
  const allowed = allowedDifficulties(profile.ageBand);
  const base = allowed[0] as Difficulty;
  const stats = (category: Category) => {
    const records = history
      .filter((_, index) => historyQuestions[index]?.category === category)
      .slice(-20);
    return {
      attempts: records.length,
      correct: records.filter(a => a.correct).length,
    };
  };
  const difficulty = (category: Category) => {
    const last = [...historyQuestions]
      .reverse()
      .find(q => q?.category === category);
    return adaptDifficulty({
      ageBand: profile.ageBand,
      current:
        last && allowed.includes(last.difficulty) ? last.difficulty : base,
      ...stats(category),
    });
  };
  const weak = [...categories]
    .filter(c => stats(c).attempts > 0)
    .sort((a, b) => {
      const x = stats(a),
        y = stats(b);
      return x.correct / x.attempts - y.correct / y.attempts;
    });
  const items: SessionItem[] = [];
  async function mcq(preferred: readonly Category[]): Promise<boolean> {
    for (const category of preferred) {
      const target = difficulty(category);
      // Small banks may need another age-allowed difficulty; never widen age limits.
      for (const difficulties of [[target], allowed]) {
        const selection = await services.questions.selectQuestions({
          age: profile.age,
          ageBand: profile.ageBand,
          count: 1,
          categories: [category],
          types: ['MCQ'],
          allowedDifficulties: difficulties,
          recentQuestionIds: history.map(a => a.questionId),
          weakCategories: [],
          excludedPrompts: items.map(q => normalizePrompt(q.prompt)),
          seed: Math.floor(random.next() * 0x100000000),
        });
        if (selection.kind === 'selected' && selection.questions[0]) {
          items.push(selection.questions[0]);
          return true;
        }
      }
    }
    return false;
  }
  const rotation = seed % categories.length;
  const rotated = [
    ...categories.slice(rotation),
    ...categories.slice(0, rotation),
  ];
  for (const category of rotated.slice(0, 3)) {
    if (!(await mcq([category])))
      return {
        kind: 'insufficient-content',
        requested: 10,
        available: items.length,
      };
  }
  const generators = shuffle(
    patternGenerators.filter(g => g.supportedAgeBands.has(profile.ageBand)),
    random,
  );
  function puzzle(memory: boolean, index: number, level: Difficulty) {
    const generator = memory
      ? memoryObjectsGenerator
      : generators[index % generators.length]!;
    for (let retry = 0; retry < 100; retry++) {
      const puzzleSeed = Math.floor(random.next() * 0x100000000);
      const generated = generatePatternQuestion(
        generator,
        profile.ageBand,
        puzzleSeed,
        level,
      );
      if (
        items.some(
          q => normalizePrompt(q.prompt) === normalizePrompt(generated.prompt),
        )
      )
        continue;
      items.push({
        id: `${id}:item:${items.length}`,
        type: memory ? 'MEMORY' : 'PATTERN',
        category: 'LOGIC',
        subcategory: generator.id,
        ageMin: profile.age,
        ageMax: profile.age,
        difficulty: level,
        prompt: generated.prompt,
        options: generated.options,
        correctOptionId: generated.correctOptionId,
        explanation: generated.explanation,
        assetRef: null,
        contentVersion: metadata!.contentVersion,
        status: 'RETIRED',
        generated,
      });
      return;
    }
    throw new Error(
      'Could not prepare a varied puzzle round. Please try again.',
    );
  }
  for (let i = 0; i < 3; i++) puzzle(false, i, difficulty('LOGIC'));
  puzzle(true, 0, difficulty('LOGIC'));
  for (let i = 0; i < 2; i++) {
    if (!(await mcq([...new Set([...weak, ...rotated])])))
      return {
        kind: 'insufficient-content',
        requested: 10,
        available: items.length,
      };
  }
  const logic = stats('LOGIC');
  const bonus =
    logic.attempts >= 20 && logic.correct / logic.attempts > 0.85
      ? 'MEDIUM'
      : base;
  puzzle(false, 3, bonus);
  const session = await services.sessions.create({
    id,
    profileId: profile.id,
    mode: 'DAILY_10',
    questionIds: items.map(q => q.id),
    items,
    extendedTime: services.settings.get().extendedTime,
    seed,
    contentVersion: metadata.contentVersion,
    localDate,
    createdAt: services.clock.now(),
  });
  return { kind: 'ready', session };
}
