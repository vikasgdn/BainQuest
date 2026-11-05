import type { PuzzleGenerator } from '../models/puzzle';
import {
  OLDER_AGE_BANDS,
  difficultyScale,
  generated,
  randomInt,
} from './generatorUtils';
import { createSeededRandom } from '../../shared/SeededRandom';

export const missingNumberGridGenerator: PuzzleGenerator = {
  id: 'MISSING_NUMBER_GRID',
  version: 1,
  supportedAgeBands: OLDER_AGE_BANDS,
  generate(seed, difficulty) {
    const random = createSeededRandom(seed);
    const step = randomInt(random, 2, 4 + difficultyScale(difficulty));
    const first = randomInt(random, 1, 8);
    const correct = first + step * 2;
    return generated(
      this,
      seed,
      `Find the missing number: [${first}, ${first + step}, ${correct}] and [${
        first + 1
      }, ${first + step + 1}, ?]`,
      String(correct + 1),
      [String(correct - 1), String(correct + 2), String(correct + 2 * step)],
      `The second row is one more than the first row in each position, so the missing number is ${
        correct + 1
      }.`,
    );
  },
};
