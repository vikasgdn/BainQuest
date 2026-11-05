import {
  generatePatternQuestion,
  patternGenerators,
} from '../src/domain/puzzles';
import { validateGeneratedQuestion } from '../src/domain/puzzles/generatorUtils';

describe('pattern generators', () => {
  for (const generator of patternGenerators) {
    test(`${generator.id} is deterministic and valid across 10,000 seeds`, () => {
      for (let seed = 0; seed < 10_000; seed += 1) {
        const difficulty = seed % 2 === 0 ? 'MEDIUM' : 'HARD';
        const first = generatePatternQuestion(
          generator,
          'MASTER_13_14',
          seed,
          difficulty,
        );
        const second = generatePatternQuestion(
          generator,
          'MASTER_13_14',
          seed,
          difficulty,
        );
        expect(first).toEqual(second);
        validateGeneratedQuestion(first);
        expect(
          first.options.filter(option => option.id === first.correctOptionId),
        ).toHaveLength(1);
      }
    });
  }
});

test('older-only generators reject Explorer age band', () => {
  const multiplication = patternGenerators.find(
    item => item.id === 'MULTIPLICATION_SEQUENCE',
  );
  const grid = patternGenerators.find(
    item => item.id === 'MISSING_NUMBER_GRID',
  );
  expect(multiplication).toBeDefined();
  expect(grid).toBeDefined();
  expect(() =>
    generatePatternQuestion(multiplication!, 'EXPLORER_7_9', 1, 'EASY'),
  ).toThrow('does not support');
  expect(() =>
    generatePatternQuestion(grid!, 'EXPLORER_7_9', 1, 'EASY'),
  ).toThrow('does not support');
});

test('all generators expose stable identity and accessibility presentation', () => {
  for (const generator of patternGenerators) {
    const ageBand = generator.supportedAgeBands.has('EXPLORER_7_9')
      ? 'EXPLORER_7_9'
      : 'MASTER_13_14';
    const question = generatePatternQuestion(
      generator,
      ageBand,
      42,
      ageBand === 'EXPLORER_7_9' ? 'EASY' : 'MEDIUM',
    );
    expect(question.instanceId).toContain(
      `${generator.id}-${generator.version}`,
    );
    expect(question.presentation.accessibilityLabel.length).toBeGreaterThan(0);
    expect(question.explanation.length).toBeGreaterThan(0);
  }
});
