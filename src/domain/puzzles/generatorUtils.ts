import { createSeededRandom, shuffle } from '../../shared/SeededRandom';
import type { AgeBand, AnswerOption, Difficulty } from '../models/types';
import type { GeneratedQuestion, PuzzleGenerator } from '../models/puzzle';

export const ALL_AGE_BANDS: ReadonlySet<AgeBand> = new Set([
  'EXPLORER_7_9',
  'CHALLENGER_10_12',
  'MASTER_13_14',
]);
export const OLDER_AGE_BANDS: ReadonlySet<AgeBand> = new Set([
  'CHALLENGER_10_12',
  'MASTER_13_14',
]);

export function randomInt(
  random: { next(): number },
  min: number,
  max: number,
): number {
  return min + Math.floor(random.next() * (max - min + 1));
}

export function optionsFor(
  correct: string,
  distractors: readonly string[],
  seed: number,
): readonly AnswerOption[] {
  const values = [correct, ...distractors];
  const unique = [...new Set(values)];
  if (unique.length !== 4)
    throw new Error('generator produced duplicate options');
  return shuffle(unique, createSeededRandom(seed)).map((text, index) => ({
    id: String.fromCharCode(65 + index),
    text,
  }));
}

export function generated(
  generator: PuzzleGenerator,
  seed: number,
  prompt: string,
  correct: string,
  distractors: readonly string[],
  explanation: string,
  presentation: GeneratedQuestion['presentation'] = {
    kind: 'TEXT',
    accessibilityLabel: 'A multiple choice pattern question',
  },
): GeneratedQuestion {
  const options = optionsFor(correct, distractors, seed);
  const correctOptionId = options.find(option => option.text === correct)?.id;
  if (!correctOptionId) throw new Error('correct option was not generated');
  const result: GeneratedQuestion = {
    instanceId: `${generator.id}-${generator.version}-${seed}`,
    generatorId: generator.id,
    generatorVersion: generator.version,
    seed,
    prompt,
    options,
    correctOptionId,
    explanation,
    presentation,
  };
  validateGeneratedQuestion(result);
  return result;
}

export function validateGeneratedQuestion(question: GeneratedQuestion): void {
  if (!question.prompt.trim() || !question.explanation.trim())
    throw new Error('generated question text must not be blank');
  if (question.options.length !== 4)
    throw new Error('generated question must have four options');
  const optionTexts = question.options.map(option =>
    option.text.trim().toLocaleLowerCase('en'),
  );
  if (new Set(optionTexts).size !== optionTexts.length)
    throw new Error('generated options must be unique');
  if (
    question.options.filter(option => option.id === question.correctOptionId)
      .length !== 1
  )
    throw new Error('generated question must have one correct option');
}

export function difficultyScale(difficulty: Difficulty): number {
  return difficulty === 'EASY' ? 1 : difficulty === 'MEDIUM' ? 2 : 3;
}
