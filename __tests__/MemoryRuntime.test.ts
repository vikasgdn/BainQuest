import { memoryObjectsGenerator } from '../src/domain/puzzles';
import { validateGeneratedQuestion } from '../src/domain/puzzles/generatorUtils';
import {
  advanceMemory,
  initialMemoryRuntime,
  memoryPresentation,
} from '../src/domain/use-cases/memoryRuntime';

const question = memoryObjectsGenerator.generate(42, 'EASY');

test('memory objects are deterministic, bounded and unambiguous for 10,000 seeds at each difficulty', () => {
  for (const difficulty of ['EASY', 'MEDIUM', 'HARD'] as const) {
    for (let seed = 0; seed < 10_000; seed++) {
      const item = memoryObjectsGenerator.generate(seed, difficulty);
      expect(item).toEqual(memoryObjectsGenerator.generate(seed, difficulty));
      validateGeneratedQuestion(item);
      if (item.presentation.kind !== 'MEMORY_OBJECTS')
        throw new Error('Missing objects');
      const { objects, targetPosition } = item.presentation;
      expect(objects).toHaveLength(
        difficulty === 'EASY' ? 4 : difficulty === 'MEDIUM' ? 6 : 9,
      );
      expect(new Set(objects.map(object => object.id)).size).toBe(
        objects.length,
      );
      const correct = objects[targetPosition - 1]!.label;
      expect(
        item.options.find(option => option.id === item.correctOptionId)?.text,
      ).toBe(correct);
      expect(item.explanation).toBe(
        `The ${correct.toLowerCase()} was in position ${targetPosition}.`,
      );
    }
  }
});

test.each([
  ['EXPLORER_7_9', 8000],
  ['CHALLENGER_10_12', 6000],
  ['MASTER_13_14', 5000],
] as const)(
  'memory timing for %s includes accessibility extension',
  (age, duration) => {
    expect(initialMemoryRuntime(age, false).remainingMs).toBe(duration);
    expect(initialMemoryRuntime(age, true).remainingMs).toBe(duration * 1.5);
  },
);

test('memory journey pauses in background, hides objects and locks the answer', () => {
  let state = initialMemoryRuntime('EXPLORER_7_9', false);
  expect(memoryPresentation(state, question).objects).toEqual([]);
  expect(advanceMemory(state, { type: 'ASK' }, question)).toBe(state);
  state = advanceMemory(state, { type: 'START' }, question);
  expect(memoryPresentation(state, question).objects).toHaveLength(4);
  expect(
    advanceMemory(
      state,
      { type: 'TICK', elapsedMs: 10000, active: false },
      question,
    ),
  ).toBe(state);
  state = advanceMemory(
    state,
    { type: 'TICK', elapsedMs: 7999, active: true },
    question,
  );
  expect(state.phase).toBe('MEMORIZE');
  expect(state.remainingMs).toBe(1);
  state = advanceMemory(
    state,
    { type: 'TICK', elapsedMs: 1, active: true },
    question,
  );
  expect(state.phase).toBe('HIDDEN');
  expect(memoryPresentation(state, question)).toEqual({
    phase: 'HIDDEN',
    objects: [],
    prompt: null,
    options: [],
    feedback: null,
  });
  state = advanceMemory(state, { type: 'ASK' }, question);
  expect(memoryPresentation(state, question).objects).toEqual([]);
  expect(memoryPresentation(state, question).feedback).toBeNull();
  expect(() =>
    advanceMemory(state, { type: 'ANSWER', answerId: 'invalid' }, question),
  ).toThrow('Unknown answer');
  const wrong = question.options.find(
    option => option.id !== question.correctOptionId,
  )!;
  state = advanceMemory(
    state,
    { type: 'ANSWER', answerId: wrong.id },
    question,
  );
  expect(memoryPresentation(state, question).feedback?.correct).toBe(false);
  expect(memoryPresentation(state, question).feedback?.correctOptionId).toBe(
    question.correctOptionId,
  );
  expect(
    advanceMemory(
      state,
      { type: 'ANSWER', answerId: question.correctOptionId },
      question,
    ),
  ).toBe(state);
  state = advanceMemory(state, { type: 'COMPLETE' }, question);
  expect(state.phase).toBe('COMPLETE');
  expect(advanceMemory(state, { type: 'START' }, question)).toBe(state);
});

test.each([-1, NaN, Infinity])('rejects invalid elapsed time %s', elapsedMs => {
  expect(() =>
    advanceMemory(
      initialMemoryRuntime('MASTER_13_14', false),
      { type: 'TICK', elapsedMs, active: true },
      question,
    ),
  ).toThrow(RangeError);
});

test('correct feedback is shown only after answering and runtime snapshots can be restored', () => {
  let state = initialMemoryRuntime('MASTER_13_14', false);
  state = advanceMemory(state, { type: 'START' }, question);
  state = advanceMemory(
    state,
    { type: 'TICK', elapsedMs: 6000, active: true },
    question,
  );
  expect(state.remainingMs).toBe(0);
  state = advanceMemory(
    JSON.parse(JSON.stringify(state)),
    { type: 'ASK' },
    question,
  );
  state = advanceMemory(
    state,
    { type: 'ANSWER', answerId: question.correctOptionId },
    question,
  );
  expect(memoryPresentation(state, question).feedback?.correct).toBe(true);
  expect(memoryPresentation(state, question).objects).toEqual([]);
});
