import type { Difficulty, SessionMode } from '../models/types';

export type AnswerScoreInput = Readonly<{
  correct: boolean;
  difficulty: Difficulty;
  durationMs: number;
  firstAttempt: boolean;
  extendedTime: boolean;
}>;

/** Speed awards 40 points through 5 seconds, then falls linearly to zero at 20 seconds. */
export function scoreAnswer(input: AnswerScoreInput): number {
  if (!Number.isFinite(input.durationMs) || input.durationMs < 0) {
    throw new RangeError('durationMs must be nonnegative');
  }
  if (!input.correct) {
    return 0;
  }
  const difficultyBonus = { EASY: 0, MEDIUM: 25, HARD: 50 }[input.difficulty];
  const speedBonus = input.extendedTime
    ? 0
    : Math.round(
        Math.max(0, Math.min(40, ((20000 - input.durationMs) / 15000) * 40)),
      );
  return 100 + difficultyBonus + speedBonus + (input.firstAttempt ? 20 : 0);
}

export function scoreCompletedSession(
  answerScores: readonly number[],
  mode: SessionMode,
  correctCount: number,
): number {
  if (
    answerScores.some(score => !Number.isSafeInteger(score) || score < 0) ||
    !Number.isSafeInteger(correctCount) ||
    correctCount < 0 ||
    correctCount > answerScores.length
  ) {
    throw new RangeError('invalid session scores');
  }
  const perfectDaily =
    mode === 'DAILY_10' && answerScores.length === 10 && correctCount === 10;
  return (
    answerScores.reduce((total, score) => total + score, 0) +
    50 +
    (perfectDaily ? 100 : 0)
  );
}
