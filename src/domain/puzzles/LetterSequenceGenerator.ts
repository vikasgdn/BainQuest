import type { PuzzleGenerator } from '../models/puzzle';
import {
  ALL_AGE_BANDS,
  difficultyScale,
  generated,
  randomInt,
} from './generatorUtils';
import { createSeededRandom } from '../../shared/SeededRandom';

const letter = (value: number) => String.fromCharCode(65 + value);
export const letterSequenceGenerator: PuzzleGenerator = {
  id: 'LETTER_SEQUENCE',
  version: 1,
  supportedAgeBands: ALL_AGE_BANDS,
  generate(seed, difficulty) {
    const random = createSeededRandom(seed);
    const step = randomInt(random, 1, 2 + difficultyScale(difficulty));
    const start = randomInt(random, 0, 25 - step * 4);
    const values = Array.from(
      { length: 5 },
      (_, index) => start + index * step,
    );
    const fifth = values[4] as number;
    const correct = letter(fifth);
    return generated(
      this,
      seed,
      `Which letter comes next? ${values
        .slice(0, 4)
        .map(letter)
        .join(', ')}, ?`,
      correct,
      [letter(fifth - step), letter(fifth - 2 * step), letter(fifth + step)],
      `The letters move forward by ${step} place${
        step === 1 ? '' : 's'
      } each time, so the answer is ${correct}.`,
    );
  },
};
