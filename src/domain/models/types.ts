import type { GeneratedQuestion } from './puzzle';

export type AgeBand = 'EXPLORER_7_9' | 'CHALLENGER_10_12' | 'MASTER_13_14';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type QuestionType = 'MCQ' | 'PATTERN' | 'MEMORY';
export type Category = 'LOGIC' | 'GK' | 'SCIENCE' | 'SPORTS' | 'SPACE';
export type ContentStatus = 'DRAFT' | 'VERIFIED' | 'PUBLISHED' | 'RETIRED';
/** PRACTICE remains readable for Version 1 persisted sessions created by Phase 2. */
export type SessionMode =
  | 'DAILY_10'
  | 'CATEGORY_PRACTICE'
  | 'QUICK_PRACTICE'
  | 'PRACTICE';
export type SessionStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';
export type LocalDate = string;
export type IsoInstant = string;
export type ProfileId = string;
export type QuestionId = string;
export type SessionId = string;

export type AnswerOption = Readonly<{ id: string; text: string }>;
export type Question = Readonly<{
  id: QuestionId;
  type: QuestionType;
  category: Category;
  subcategory: string;
  ageMin: number;
  ageMax: number;
  difficulty: Difficulty;
  prompt: string;
  options: readonly AnswerOption[];
  correctOptionId: string;
  explanation: string;
  assetRef: string | null;
  contentVersion: number;
  status: ContentStatus;
}>;
export type ChildProfile = Readonly<{
  id: ProfileId;
  displayName: string;
  age: number;
  ageBand: AgeBand;
  createdAt: IsoInstant;
}>;
export type Attempt = Readonly<{
  id: string;
  profileId: ProfileId;
  questionId: QuestionId;
  sessionId: SessionId;
  answerId: string;
  correct: boolean;
  durationMs: number;
  attemptedAt: IsoInstant;
  generatorId?: string;
  generatorVersion?: number;
  seed?: number;
}>;
export type SessionItem = Question &
  Readonly<{ generated?: GeneratedQuestion }>;
export type SessionPlan = Readonly<{
  id: SessionId;
  profileId: ProfileId;
  mode: SessionMode;
  questionIds: readonly QuestionId[];
  items?: readonly SessionItem[];
  extendedTime?: boolean;
  seed: number;
  contentVersion: number;
  localDate: LocalDate | null;
  createdAt: IsoInstant;
}>;
export type GameSession = Readonly<{
  plan: SessionPlan;
  status: SessionStatus;
  attempts: readonly Attempt[];
  startedAt: IsoInstant | null;
  completedAt: IsoInstant | null;
}>;
export type BadgeCode =
  | 'FIRST_STEPS'
  | 'DAILY_7'
  | 'QUESTIONS_100'
  | 'PERFECT_10'
  | 'SCIENCE_EXPLORER'
  | 'SPACE_EXPLORER'
  | 'PUZZLE_SOLVER';
export type EarnedBadge = Readonly<{ code: BadgeCode; earnedAt: IsoInstant }>;
export type Badge = Readonly<{
  id: string;
  code: BadgeCode;
  title: string;
  ruleType: string;
  threshold: number;
}>;
export type ContentMetadata = Readonly<{
  key: string;
  schemaVersion: number;
  contentVersion: number;
  checksum: string;
  importedAt: IsoInstant;
}>;
export type PlayerProgress = Readonly<{
  profileId: ProfileId;
  xp: number;
  level: number;
  coins: number;
  currentStreak: number;
  longestStreak: number;
  lastDailyDate: LocalDate | null;
  completedSessionIds: readonly SessionId[];
  earnedBadges: readonly EarnedBadge[];
}>;
export type SessionResult = Readonly<{
  sessionId: SessionId;
  profileId: ProfileId;
  mode: SessionMode;
  itemCount: number;
  correctCount: number;
  score: number;
  xpAwarded: number;
  completedAt: IsoInstant;
  localDate: LocalDate;
  completionToken: string;
}>;
export type ProgressUpdate = Readonly<{
  progress: PlayerProgress;
  newlyEarnedBadges: readonly BadgeCode[];
  applied: boolean;
}>;

export type ProgressSummary = Readonly<{
  totalDurationMs: number;
  progress: PlayerProgress;
  categories: readonly Readonly<{
    category: Category;
    answered: number;
    correct: number;
  }>[];
  completedSessions: number;
  recentSessions: readonly SessionResult[];
}>;
