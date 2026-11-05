import type { AgeBand, Difficulty } from '../models/types';
import { allowedDifficulties } from './AgeBandPolicy';

const ORDER: readonly Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];

export function adaptDifficulty(
  input: Readonly<{
    ageBand: AgeBand;
    current: Difficulty;
    attempts: number;
    correct: number;
  }>,
): Difficulty {
  const { ageBand, current, attempts, correct } = input;
  if (
    !Number.isSafeInteger(attempts) ||
    !Number.isSafeInteger(correct) ||
    attempts < 0 ||
    correct < 0 ||
    correct > attempts
  ) {
    throw new RangeError('invalid attempt counts');
  }
  const allowed = allowedDifficulties(ageBand);
  if (!allowed.includes(current)) {
    throw new RangeError('current difficulty is not allowed for age band');
  }
  if (attempts < 20) {
    return current;
  }
  const index = ORDER.indexOf(current);
  const target =
    correct / attempts > 0.85
      ? index + 1
      : correct / attempts < 0.55
      ? index - 1
      : index;
  return ORDER[
    Math.max(
      ORDER.indexOf(allowed[0] as Difficulty),
      Math.min(
        ORDER.indexOf(allowed[allowed.length - 1] as Difficulty),
        target,
      ),
    )
  ] as Difficulty;
}
