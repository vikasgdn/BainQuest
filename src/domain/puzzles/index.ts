export { arithmeticSequenceGenerator } from './ArithmeticSequenceGenerator';
export { multiplicationSequenceGenerator } from './MultiplicationSequenceGenerator';
export { letterSequenceGenerator } from './LetterSequenceGenerator';
export { oddOneOutGenerator } from './OddOneOutGenerator';
export { missingNumberGridGenerator } from './MissingNumberGridGenerator';
export { shapePatternGenerator } from './ShapePatternGenerator';
export { wordScrambleGenerator } from './WordScrambleGenerator';
export { memoryObjectsGenerator } from './MemoryObjectsGenerator';

import type { PuzzleGenerator } from '../models/puzzle';
import { arithmeticSequenceGenerator } from './ArithmeticSequenceGenerator';
import { multiplicationSequenceGenerator } from './MultiplicationSequenceGenerator';
import { letterSequenceGenerator } from './LetterSequenceGenerator';
import { oddOneOutGenerator } from './OddOneOutGenerator';
import { missingNumberGridGenerator } from './MissingNumberGridGenerator';
import { shapePatternGenerator } from './ShapePatternGenerator';
import { wordScrambleGenerator } from './WordScrambleGenerator';
import type { AgeBand, Difficulty } from '../models/types';
import type { GeneratedQuestion } from '../models/puzzle';
import { allowedDifficulties } from '../policies/AgeBandPolicy';

export const patternGenerators: readonly PuzzleGenerator[] = [
  arithmeticSequenceGenerator,
  multiplicationSequenceGenerator,
  letterSequenceGenerator,
  oddOneOutGenerator,
  missingNumberGridGenerator,
  shapePatternGenerator,
  wordScrambleGenerator,
];

export function generatePatternQuestion(
  generator: PuzzleGenerator,
  ageBand: AgeBand,
  seed: number,
  difficulty: Difficulty,
): GeneratedQuestion {
  if (!generator.supportedAgeBands.has(ageBand))
    throw new RangeError(`${generator.id} does not support ${ageBand}`);
  if (!allowedDifficulties(ageBand).includes(difficulty))
    throw new RangeError(`${difficulty} is not allowed for ${ageBand}`);
  return generator.generate(seed, difficulty);
}
