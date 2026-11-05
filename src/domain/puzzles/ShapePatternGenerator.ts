import type { PuzzleGenerator } from '../models/puzzle';
import { ALL_AGE_BANDS, generated, randomInt } from './generatorUtils';
import { createSeededRandom } from '../../shared/SeededRandom';

const patterns = [
  ['○', '△'],
  ['□', '☆'],
  ['◇', '●'],
] as const;
export const shapePatternGenerator: PuzzleGenerator = {
  id: 'SHAPE_PATTERN',
  version: 1,
  supportedAgeBands: ALL_AGE_BANDS,
  generate(seed) {
    const random = createSeededRandom(seed);
    const pattern = patterns[
      randomInt(random, 0, patterns.length - 1)
    ] as (typeof patterns)[number];
    const correct = pattern[0];
    return generated(
      this,
      seed,
      `Which shape comes next? ${pattern[0]} ${pattern[1]} ${pattern[0]} ${pattern[1]} ?`,
      correct,
      [pattern[1], '⬟', '✚'],
      `The two shapes alternate, so the next shape is ${correct}.`,
      {
        kind: 'SHAPES',
        accessibilityLabel:
          'A repeating shape pattern with alternating symbols',
      },
    );
  },
};
