import type { PuzzleGenerator } from '../models/puzzle';
import { createSeededRandom, shuffle } from '../../shared/SeededRandom';
import { ALL_AGE_BANDS, generated, randomInt } from './generatorUtils';

const labels = [
  'Apple',
  'Ball',
  'Book',
  'Cup',
  'Key',
  'Leaf',
  'Moon',
  'Shoe',
  'Star',
  'Tree',
  'Hat',
  'Bell',
];

export const memoryObjectsGenerator: PuzzleGenerator = {
  id: 'MEMORY_OBJECTS',
  version: 1,
  supportedAgeBands: ALL_AGE_BANDS,
  generate(seed, difficulty) {
    const random = createSeededRandom(seed);
    const count = difficulty === 'EASY' ? 4 : difficulty === 'MEDIUM' ? 6 : 9;
    const objects = shuffle(labels, random)
      .slice(0, count)
      .map(label => ({ id: label.toLowerCase(), label }));
    const targetPosition = randomInt(random, 1, count);
    const correct = objects[targetPosition - 1]!.label;
    const distractors = shuffle(
      objects.filter(object => object.label !== correct),
      random,
    )
      .slice(0, 3)
      .map(object => object.label);
    return generated(
      this,
      seed,
      `Which object was in position ${targetPosition}?`,
      correct,
      distractors,
      `The ${correct.toLowerCase()} was in position ${targetPosition}.`,
      {
        kind: 'MEMORY_OBJECTS',
        accessibilityLabel: 'Remember the objects in numbered order.',
        objects,
        targetPosition,
      },
    );
  },
};
