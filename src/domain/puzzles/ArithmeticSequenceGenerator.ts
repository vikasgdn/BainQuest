import type { PuzzleGenerator } from '../models/puzzle';
import {
  ALL_AGE_BANDS,
  difficultyScale,
  generated,
  randomInt,
} from './generatorUtils';
import { createSeededRandom } from '../../shared/SeededRandom';

export const arithmeticSequenceGenerator: PuzzleGenerator = {
  id: 'ARITHMETIC_SEQUENCE',
  version: 1,
  supportedAgeBands: ALL_AGE_BANDS,
  generate(seed, difficulty) {
    const random = createSeededRandom(seed);
    const scale = difficultyScale(difficulty);
    const step = randomInt(random, 1, 3 + scale * 2);
    const start = randomInt(random, 1, 10 + scale * 8);
    const values = Array.from(
      { length: 5 },
      (_, index) => start + index * step,
    );
    const fifth = values[4] as number;
    const correct = String(fifth);
    return generated(
      this,
      seed,
      `What number comes next? ${values.slice(0, 4).join(', ')}, ?`,
      correct,
      [String(fifth + step), String(fifth - 1), String(fifth + 2 * step)],
      `Each number increases by ${step}, so the next number is ${correct}.`,
    );
  },
};
