import type {
  PlayerProgress,
  ProgressUpdate,
  SessionResult,
} from '../models/types';
import { eligibleBadges, type BadgeFacts } from './BadgePolicy';
import { advanceStreak } from './StreakPolicy';

export function xpRequiredForLevel(level: number): number {
  if (!Number.isSafeInteger(level) || level < 1) {
    throw new RangeError('level must be a positive integer');
  }
  const required = 100 * level * level;
  if (!Number.isSafeInteger(required)) {
    throw new RangeError('level is too large');
  }
  return required;
}

export function levelForXp(xp: number): number {
  if (!Number.isSafeInteger(xp) || xp < 0) {
    throw new RangeError('xp must be a nonnegative safe integer');
  }
  return Math.max(1, Math.floor(Math.sqrt(xp / 100)));
}

/** Pure guard for duplicate completion; persistence must also enforce this atomically. */
export function applySessionCompletion(
  progress: PlayerProgress,
  result: SessionResult,
  badgeFacts: BadgeFacts,
): ProgressUpdate {
  if (progress.profileId !== result.profileId) {
    throw new Error('session belongs to another profile');
  }
  if (progress.completedSessionIds.includes(result.sessionId)) {
    return { progress, newlyEarnedBadges: [], applied: false };
  }
  if (!Number.isSafeInteger(result.xpAwarded) || result.xpAwarded < 0) {
    throw new RangeError('xpAwarded must be nonnegative');
  }
  const xp = progress.xp + result.xpAwarded;
  if (!Number.isSafeInteger(xp)) {
    throw new RangeError('XP exceeds the safe integer range');
  }
  const streak =
    result.mode === 'DAILY_10'
      ? advanceStreak(progress, result.localDate)
      : {
          currentStreak: progress.currentStreak,
          longestStreak: progress.longestStreak,
          lastDailyDate: progress.lastDailyDate,
        };
  const newlyEarnedBadges = eligibleBadges(
    { ...badgeFacts, currentDailyStreak: streak.currentStreak },
    progress.earnedBadges.map(badge => badge.code),
  );
  return {
    progress: {
      ...progress,
      ...streak,
      xp,
      level: levelForXp(xp),
      completedSessionIds: [...progress.completedSessionIds, result.sessionId],
      earnedBadges: [
        ...progress.earnedBadges,
        ...newlyEarnedBadges.map(code => ({
          code,
          earnedAt: result.completedAt,
        })),
      ],
    },
    newlyEarnedBadges,
    applied: true,
  };
}
