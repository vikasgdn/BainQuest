import type { LocalDate, PlayerProgress } from '../models/types';

function dayNumber(value: LocalDate): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new RangeError('local date must be YYYY-MM-DD');
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [
    31,
    leap ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > (monthDays[month - 1] ?? 0)
  ) {
    throw new RangeError('invalid local date');
  }
  const previousYear = year - 1;
  const priorDays =
    previousYear * 365 +
    Math.floor(previousYear / 4) -
    Math.floor(previousYear / 100) +
    Math.floor(previousYear / 400);
  return (
    priorDays +
    monthDays.slice(0, month - 1).reduce((sum, days) => sum + days, 0) +
    day
  );
}

export function advanceStreak(
  progress: Pick<
    PlayerProgress,
    'currentStreak' | 'longestStreak' | 'lastDailyDate'
  >,
  today: LocalDate,
): Pick<PlayerProgress, 'currentStreak' | 'longestStreak' | 'lastDailyDate'> {
  const todayNumber = dayNumber(today);
  const previous =
    progress.lastDailyDate === null ? null : dayNumber(progress.lastDailyDate);
  if (previous !== null && todayNumber < previous) {
    throw new RangeError('daily completion date precedes last completion');
  }
  if (todayNumber === previous) {
    return progress;
  }
  const currentStreak =
    previous === todayNumber - 1 ? progress.currentStreak + 1 : 1;
  return {
    currentStreak,
    longestStreak: Math.max(progress.longestStreak, currentStreak),
    lastDailyDate: today,
  };
}
