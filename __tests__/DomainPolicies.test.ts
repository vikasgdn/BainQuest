import {
  ageBandForAge,
  allowedDifficulties,
} from '../src/domain/policies/AgeBandPolicy';
import { eligibleBadges } from '../src/domain/policies/BadgePolicy';
import { dailySeed } from '../src/domain/policies/DailyPlanPolicy';
import { adaptDifficulty } from '../src/domain/policies/DifficultyPolicy';
import {
  applySessionCompletion,
  levelForXp,
  xpRequiredForLevel,
} from '../src/domain/policies/ProgressionPolicy';
import {
  scoreAnswer,
  scoreCompletedSession,
} from '../src/domain/policies/ScoringPolicy';
import { selectQuestions } from '../src/domain/policies/SelectionPolicy';
import { advanceStreak } from '../src/domain/policies/StreakPolicy';
import type {
  Question,
  PlayerProgress,
  SessionResult,
} from '../src/domain/models/types';
import { createSeededRandom, shuffle } from '../src/shared/SeededRandom';

const progress: PlayerProgress = {
  profileId: 'child',
  xp: 100,
  level: 1,
  coins: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastDailyDate: null,
  completedSessionIds: [],
  earnedBadges: [],
};
const result: SessionResult = {
  sessionId: 'session',
  profileId: 'child',
  mode: 'DAILY_10',
  itemCount: 10,
  correctCount: 7,
  score: 900,
  xpAwarded: 950,
  completedAt: '2026-09-22T10:00:00.000Z',
  localDate: '2026-09-22',
  completionToken: 'session:complete',
};
const badgeFacts = {
  completedSessions: 1,
  currentDailyStreak: 1,
  answeredQuestions: 10,
  scienceCorrect: 0,
  spaceCorrect: 0,
  generatedPuzzlesCorrect: 0,
  lastSessionMode: 'DAILY_10' as const,
  lastSessionItemCount: 10,
  lastSessionCorrectCount: 7,
};

function question(id: string, overrides: Partial<Question> = {}): Question {
  return {
    id,
    type: 'MCQ',
    category: 'GK',
    subcategory: 'GENERAL',
    ageMin: 7,
    ageMax: 14,
    difficulty: 'EASY',
    prompt: `Question ${id}`,
    options: [{ id: 'A', text: 'Answer' }],
    correctOptionId: 'A',
    explanation: 'Explanation',
    assetRef: null,
    contentVersion: 1,
    status: 'PUBLISHED',
    ...overrides,
  };
}

describe('scoring', () => {
  it('awards base, difficulty, first attempt and bounded speed points', () => {
    expect(
      scoreAnswer({
        correct: true,
        difficulty: 'EASY',
        durationMs: 0,
        firstAttempt: true,
        extendedTime: false,
      }),
    ).toBe(160);
    expect(
      scoreAnswer({
        correct: true,
        difficulty: 'MEDIUM',
        durationMs: 12500,
        firstAttempt: false,
        extendedTime: false,
      }),
    ).toBe(145);
    expect(
      scoreAnswer({
        correct: true,
        difficulty: 'HARD',
        durationMs: 20000,
        firstAttempt: true,
        extendedTime: false,
      }),
    ).toBe(170);
    expect(
      scoreAnswer({
        correct: true,
        difficulty: 'HARD',
        durationMs: 0,
        firstAttempt: false,
        extendedTime: true,
      }),
    ).toBe(150);
    expect(
      scoreAnswer({
        correct: false,
        difficulty: 'HARD',
        durationMs: 0,
        firstAttempt: true,
        extendedTime: false,
      }),
    ).toBe(0);
    expect(() =>
      scoreAnswer({
        correct: true,
        difficulty: 'EASY',
        durationMs: -1,
        firstAttempt: true,
        extendedTime: false,
      }),
    ).toThrow(RangeError);
  });

  it('awards completion once and perfect Daily 10 only for ten correct', () => {
    expect(scoreCompletedSession([100, 0], 'PRACTICE', 1)).toBe(150);
    expect(scoreCompletedSession(Array(10).fill(100), 'DAILY_10', 10)).toBe(
      1150,
    );
    expect(scoreCompletedSession(Array(9).fill(100), 'DAILY_10', 9)).toBe(950);
    expect(() => scoreCompletedSession([100], 'PRACTICE', 2)).toThrow(
      RangeError,
    );
  });
});

describe('progression and duplicate completion', () => {
  it('uses exact XP thresholds and starts at level one', () => {
    expect(xpRequiredForLevel(1)).toBe(100);
    expect(xpRequiredForLevel(3)).toBe(900);
    expect([0, 99, 100, 399, 400, 899, 900].map(levelForXp)).toEqual([
      1, 1, 1, 1, 2, 2, 3,
    ]);
    expect(() => levelForXp(-1)).toThrow(RangeError);
    expect(() => xpRequiredForLevel(0)).toThrow(RangeError);
  });

  it('applies a completion token only once without changing the prior snapshot', () => {
    const first = applySessionCompletion(progress, result, badgeFacts);
    expect(first.applied).toBe(true);
    expect(first.progress.xp).toBe(1050);
    expect(first.progress.level).toBe(3);
    expect(first.progress.currentStreak).toBe(1);
    expect(first.newlyEarnedBadges).toEqual(['FIRST_STEPS']);
    const retry = applySessionCompletion(first.progress, result, badgeFacts);
    expect(retry).toEqual({
      progress: first.progress,
      newlyEarnedBadges: [],
      applied: false,
    });
    expect(progress.xp).toBe(100);
    expect(() =>
      applySessionCompletion(
        progress,
        { ...result, profileId: 'other' },
        badgeFacts,
      ),
    ).toThrow();
  });
});

describe('streak dates', () => {
  it('keeps same-day completions, increments yesterday and resets after a gap', () => {
    const first = advanceStreak(progress, '2026-09-22');
    expect(first.currentStreak).toBe(1);
    expect(advanceStreak(first, '2026-09-22')).toBe(first);
    const next = advanceStreak(first, '2026-09-23');
    expect(next).toMatchObject({ currentStreak: 2, longestStreak: 2 });
    expect(advanceStreak(next, '2026-09-25')).toMatchObject({
      currentStreak: 1,
      longestStreak: 2,
    });
  });

  it('handles month, year and leap-day transitions as calendar dates', () => {
    expect(
      advanceStreak(
        { ...progress, currentStreak: 3, lastDailyDate: '2024-02-28' },
        '2024-02-29',
      ).currentStreak,
    ).toBe(4);
    expect(
      advanceStreak(
        { ...progress, currentStreak: 3, lastDailyDate: '2024-02-29' },
        '2024-03-01',
      ).currentStreak,
    ).toBe(4);
    expect(
      advanceStreak(
        { ...progress, currentStreak: 3, lastDailyDate: '2025-12-31' },
        '2026-01-01',
      ).currentStreak,
    ).toBe(4);
    expect(() => advanceStreak(progress, '2025-02-29')).toThrow(RangeError);
    expect(() =>
      advanceStreak({ ...progress, lastDailyDate: '2026-09-22' }, '2026-09-21'),
    ).toThrow(RangeError);
  });
});

describe('age, difficulty and badges', () => {
  it('maps ages at every band boundary and rejects out-of-range ages', () => {
    expect([7, 9, 10, 12, 13, 14].map(ageBandForAge)).toEqual([
      'EXPLORER_7_9',
      'EXPLORER_7_9',
      'CHALLENGER_10_12',
      'CHALLENGER_10_12',
      'MASTER_13_14',
      'MASTER_13_14',
    ]);
    expect(() => ageBandForAge(6)).toThrow(RangeError);
    expect(() => ageBandForAge(14.5)).toThrow(RangeError);
    expect(allowedDifficulties('EXPLORER_7_9')).toEqual(['EASY', 'MEDIUM']);
  });

  it('moves at most one allowed step after 20 attempts with strict thresholds', () => {
    const base = {
      ageBand: 'CHALLENGER_10_12' as const,
      current: 'MEDIUM' as const,
    };
    expect(adaptDifficulty({ ...base, attempts: 19, correct: 19 })).toBe(
      'MEDIUM',
    );
    expect(adaptDifficulty({ ...base, attempts: 20, correct: 18 })).toBe(
      'HARD',
    );
    expect(adaptDifficulty({ ...base, attempts: 20, correct: 17 })).toBe(
      'MEDIUM',
    );
    expect(adaptDifficulty({ ...base, attempts: 20, correct: 11 })).toBe(
      'MEDIUM',
    );
    expect(adaptDifficulty({ ...base, attempts: 20, correct: 10 })).toBe(
      'EASY',
    );
    expect(
      adaptDifficulty({
        ageBand: 'EXPLORER_7_9',
        current: 'MEDIUM',
        attempts: 20,
        correct: 20,
      }),
    ).toBe('MEDIUM');
    expect(() =>
      adaptDifficulty({ ...base, attempts: 20, correct: 21 }),
    ).toThrow(RangeError);
  });

  it('evaluates all initial badge thresholds and excludes earned codes', () => {
    const facts = {
      completedSessions: 1,
      currentDailyStreak: 7,
      answeredQuestions: 100,
      scienceCorrect: 50,
      spaceCorrect: 50,
      generatedPuzzlesCorrect: 50,
      lastSessionMode: 'DAILY_10' as const,
      lastSessionItemCount: 10,
      lastSessionCorrectCount: 10,
    };
    expect(eligibleBadges(facts, ['FIRST_STEPS'])).toEqual([
      'DAILY_7',
      'QUESTIONS_100',
      'PERFECT_10',
      'SCIENCE_EXPLORER',
      'SPACE_EXPLORER',
      'PUZZLE_SOLVER',
    ]);
    expect(
      eligibleBadges({ ...facts, lastSessionItemCount: 9 }, []),
    ).not.toContain('PERFECT_10');
  });
});

describe('deterministic selection and randomness', () => {
  const request = {
    age: 9,
    ageBand: 'EXPLORER_7_9' as const,
    count: 3,
    categories: ['GK', 'SCIENCE'] as const,
    types: ['MCQ'] as const,
    allowedDifficulties: ['EASY'] as const,
    recentQuestionIds: [] as readonly string[],
    weakCategories: ['SCIENCE'] as const,
    seed: 42,
  };
  const bank = [
    question('g1'),
    question('g2'),
    question('g3'),
    question('s1', { category: 'SCIENCE' }),
    question('s2', { category: 'SCIENCE' }),
  ];

  it('reproduces random streams, shuffles and daily seeds', () => {
    const a = createSeededRandom(123);
    const b = createSeededRandom(123);
    expect(Array.from({ length: 10 }, () => a.next())).toEqual(
      Array.from({ length: 10 }, () => b.next()),
    );
    expect(shuffle([1, 2, 3, 4], createSeededRandom(123))).toEqual(
      shuffle([1, 2, 3, 4], createSeededRandom(123)),
    );
    expect(dailySeed('child', '2026-09-22', 1)).toBe(
      dailySeed('child', '2026-09-22', 1),
    );
    expect(dailySeed('child', '2026-09-22', 1)).not.toBe(
      dailySeed('child', '2026-09-23', 1),
    );
    expect(() => createSeededRandom(Number.NaN)).toThrow(RangeError);
  });

  it('keeps at least 40 percent mixed and filters age, status and duplicates', () => {
    const selected = selectQuestions(
      [
        ...bank,
        question('old', { status: 'RETIRED' }),
        question('older', { ageMin: 10 }),
        question('duplicate', { prompt: '  QUESTION G1  ' }),
      ],
      request,
    );
    expect(selected.kind).toBe('selected');
    if (selected.kind === 'selected') {
      expect(
        selected.questions.filter(item => item.category === 'GK'),
      ).toHaveLength(2);
      expect(
        selected.questions.every(
          item => item.status === 'PUBLISHED' && item.ageMin <= 9,
        ),
      ).toBe(true);
      expect(
        new Set(
          selected.questions.map(item => item.prompt.trim().toLowerCase()),
        ).size,
      ).toBe(3);
      expect(selectQuestions(bank, request)).toEqual(
        selectQuestions(bank, request),
      );
    }
  });

  it('avoids recent items when possible and reports insufficient content', () => {
    const selected = selectQuestions(bank, {
      ...request,
      count: 2,
      recentQuestionIds: ['g1', 's1'],
    });
    expect(selected.kind).toBe('selected');
    if (selected.kind === 'selected') {
      expect(selected.questions.map(item => item.id)).not.toContain('g1');
    }
    expect(
      selectQuestions([question('too-old', { ageMin: 10 })], request),
    ).toEqual({ kind: 'insufficient-content', requested: 3, available: 0 });
    expect(() =>
      selectQuestions(bank, { ...request, ageBand: 'MASTER_13_14' }),
    ).toThrow(RangeError);
  });
});
