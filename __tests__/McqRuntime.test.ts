import type {
  ChildProfile,
  Question,
  SessionPlan,
} from '../src/domain/models/types';
import { createMcqSession } from '../src/domain/use-cases/createMcqSession';
import {
  initialMcqRuntime,
  selectMcqAnswer,
  showMcqFeedback,
  advanceMcqQuestion,
} from '../src/domain/use-cases/mcqRuntime';
import type {
  QuestionRepository,
  SessionRepository,
} from '../src/domain/repositories/contracts';

const clock = {
  now: () => '2026-09-25T10:00:00.000Z',
  localDate: () => '2026-09-25',
};
const profile: ChildProfile = {
  id: 'profile-1',
  displayName: 'Nova',
  age: 9,
  ageBand: 'EXPLORER_7_9',
  createdAt: clock.now(),
};
const question = (id: string): Question => ({
  id,
  type: 'MCQ',
  category: 'GK',
  subcategory: 'TEST',
  ageMin: 7,
  ageMax: 9,
  difficulty: 'EASY',
  prompt: `Question ${id}`,
  options: [
    { id: 'A', text: 'One' },
    { id: 'B', text: 'Two' },
    { id: 'C', text: 'Three' },
    { id: 'D', text: 'Four' },
  ],
  correctOptionId: 'A',
  explanation: 'A is correct.',
  assetRef: null,
  contentVersion: 1,
  status: 'PUBLISHED',
});

test('creates a deterministic age-appropriate MCQ category plan', async () => {
  const questions = [question('q1'), question('q2')];
  const questionRepository: QuestionRepository = {
    prepareContent: async () => ({
      kind: 'ready',
      contentVersion: 1,
      importedCount: 2,
    }),
    selectQuestions: async () => ({ kind: 'selected', questions }),
    getQuestion: async id => questions.find(item => item.id === id) ?? null,
  };
  const created: SessionPlan[] = [];
  const sessions: SessionRepository = {
    create: async plan => {
      created.push(plan);
      return {
        plan,
        status: 'PLANNED',
        attempts: [],
        startedAt: null,
        completedAt: null,
      };
    },
    get: async () => null,
    recordAnswer: async () => {
      throw new Error('unused');
    },
    complete: async () => {
      throw new Error('unused');
    },
  };
  const first = await createMcqSession(
    { clock, questions: questionRepository, sessions },
    { profile, category: 'GK', count: 2 },
  );
  const second = await createMcqSession(
    { clock, questions: questionRepository, sessions },
    { profile, category: 'GK', count: 2 },
  );
  expect(first.kind).toBe('ready');
  expect(second.kind).toBe('ready');
  expect(created[0]).toEqual(created[1]);
  expect(created[0]?.mode).toBe('CATEGORY_PRACTICE');
  expect(created[0]?.questionIds).toEqual(['q1', 'q2']);
});

test('runtime prevents changing selection after feedback and advances once', () => {
  const questions = [question('q1'), question('q2')];
  const initial = initialMcqRuntime(questions, []);
  const selected = selectMcqAnswer(initial, 'A');
  const attempt = {
    id: 'a1',
    profileId: profile.id,
    questionId: 'q1',
    sessionId: 's1',
    answerId: 'A',
    correct: true,
    durationMs: 1000,
    attemptedAt: clock.now(),
  } as const;
  const feedback = showMcqFeedback(selected, attempt);
  expect(selectMcqAnswer(feedback, 'B')).toBe(feedback);
  const next = advanceMcqQuestion(feedback);
  expect(next.status).toBe('ready');
  expect(next.index).toBe(1);
  expect(next.selectedAnswerId).toBeNull();
});
