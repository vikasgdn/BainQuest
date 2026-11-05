import type { PuzzleGenerator } from '../models/puzzle';
import {
  OLDER_AGE_BANDS,
  difficultyScale,
  generated,
  randomInt,
} from './generatorUtils';
import { createSeededRandom } from '../../shared/SeededRandom';

export const multiplicationSequenceGenerator: PuzzleGenerator = {
  id: 'MULTIPLICATION_SEQUENCE',
  version: 1,
  supportedAgeBands: OLDER_AGE_BANDS,
  generate(seed, difficulty) {
    const random = createSeededRandom(seed);
    const factor = randomInt(random, 2, difficultyScale(difficulty) + 2);
    const start = randomInt(random, 1, 4);
    const values = Array.from(
      { length: 5 },
      (_, index) => start * factor ** index,
    );
    const fifth = values[4] as number;
    const correct = String(fifth);
    return generated(
      this,
      seed,
      `What number comes next? ${values.slice(0, 4).join(', ')}, ?`,
      correct,
      [
        String(fifth + factor),
        String(fifth * (factor + 1)),
        String(fifth - factor),
      ],
      `Each number is multiplied by ${factor}, so the next number is ${correct}.`,
    );
  },
};
