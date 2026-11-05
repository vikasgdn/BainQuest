import type { PuzzleGenerator } from '../models/puzzle';
import { ALL_AGE_BANDS, generated, randomInt } from './generatorUtils';
import { createSeededRandom, shuffle } from '../../shared/SeededRandom';

const words = [
  'PLANET',
  'GARDEN',
  'ROCKET',
  'SILVER',
  'BRIDGE',
  'JUNGLE',
  'COMET',
  'MARBLE',
];
function scramble(word: string, seed: number): string {
  const letters = shuffle([...word], createSeededRandom(seed));
  const result = letters.join('');
  return result === word ? `${result.slice(1)}${result[0]}` : result;
}
export const wordScrambleGenerator: PuzzleGenerator = {
  id: 'WORD_SCRAMBLE',
  version: 1,
  supportedAgeBands: ALL_AGE_BANDS,
  generate(seed) {
    const random = createSeededRandom(seed);
    const word = words[randomInt(random, 0, words.length - 1)] as string;
    const correct = word;
    const distractors = words
      .filter(candidate => candidate !== word)
      .slice(0, 3);
    return generated(
      this,
      seed,
      `Unscramble the letters: ${scramble(word, seed)}`,
      correct,
      distractors,
      `${correct} is the word made by rearranging all the letters.`,
    );
  },
};
