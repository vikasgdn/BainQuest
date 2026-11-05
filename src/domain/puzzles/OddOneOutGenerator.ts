import type { PuzzleGenerator } from '../models/puzzle';
import {
  ALL_AGE_BANDS,
  difficultyScale,
  generated,
  randomInt,
} from './generatorUtils';
import { createSeededRandom } from '../../shared/SeededRandom';

export const oddOneOutGenerator: PuzzleGenerator = {
  id: 'ODD_ONE_OUT',
  version: 1,
  supportedAgeBands: ALL_AGE_BANDS,
  generate(seed, difficulty) {
    const random = createSeededRandom(seed);
    const divisor = difficultyScale(difficulty) + 2;
    const base = randomInt(random, 2, 8);
    const correct = String(base * divisor + 1);
    const multiples = [
      base * divisor,
      (base + 1) * divisor,
      (base + 2) * divisor,
    ].map(String);
    return generated(
      this,
      seed,
      `Which number does not belong with the others? ${[
        ...multiples,
        correct,
      ].join(', ')}`,
      correct,
      multiples,
      `The other numbers are all divisible by ${divisor}; ${correct} is not.`,
    );
  },
};
