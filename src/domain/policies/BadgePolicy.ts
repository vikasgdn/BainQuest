import type { BadgeCode, SessionMode } from '../models/types';

export type BadgeFacts = Readonly<{
  completedSessions: number;
  currentDailyStreak: number;
  answeredQuestions: number;
  scienceCorrect: number;
  spaceCorrect: number;
  generatedPuzzlesCorrect: number;
  lastSessionMode: SessionMode;
  lastSessionItemCount: number;
  lastSessionCorrectCount: number;
}>;

export function eligibleBadges(
  facts: BadgeFacts,
  alreadyEarned: readonly BadgeCode[],
): readonly BadgeCode[] {
  const conditions: readonly [BadgeCode, boolean][] = [
    ['FIRST_STEPS', facts.completedSessions >= 1],
    ['DAILY_7', facts.currentDailyStreak >= 7],
    ['QUESTIONS_100', facts.answeredQuestions >= 100],
    [
      'PERFECT_10',
      facts.lastSessionMode === 'DAILY_10' &&
        facts.lastSessionItemCount === 10 &&
        facts.lastSessionCorrectCount === 10,
    ],
    ['SCIENCE_EXPLORER', facts.scienceCorrect >= 50],
    ['SPACE_EXPLORER', facts.spaceCorrect >= 50],
    ['PUZZLE_SOLVER', facts.generatedPuzzlesCorrect >= 50],
  ];
  return conditions
    .filter(([code, met]) => met && !alreadyEarned.includes(code))
    .map(([code]) => code);
}
