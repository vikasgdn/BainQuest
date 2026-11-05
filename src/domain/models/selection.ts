import type {
  AgeBand,
  Category,
  Difficulty,
  LocalDate,
  ProfileId,
  Question,
  QuestionId,
  QuestionType,
} from './types';

export type SelectionRequest = Readonly<{
  age: number;
  ageBand: AgeBand;
  count: number;
  categories: readonly Category[];
  types: readonly QuestionType[];
  allowedDifficulties: readonly Difficulty[];
  excludedPrompts?: readonly string[];
  recentQuestionIds: readonly QuestionId[];
  weakCategories: readonly Category[];
  seed: number;
}>;
export type SelectionResult =
  | Readonly<{ kind: 'selected'; questions: readonly Question[] }>
  | Readonly<{
      kind: 'insufficient-content';
      requested: number;
      available: number;
    }>;

export type ContentPreparationResult =
  | Readonly<{ kind: 'ready'; contentVersion: number; importedCount: number }>
  | Readonly<{ kind: 'error'; reason: string; retryable: boolean }>;

export type DailyPlanRequest = Readonly<{
  profileId: ProfileId;
  localDate: LocalDate;
  contentVersion: number;
  age: number;
  ageBand: AgeBand;
  excludedPrompts?: readonly string[];
  recentQuestionIds: readonly QuestionId[];
  weakCategories: readonly Category[];
}>;

export type DailySlot = Readonly<{
  position: number;
  allowedTypes: readonly QuestionType[];
  allowedCategories: readonly Category[];
  prioritizeWeakCategory: boolean;
  mediumIfEligible: boolean;
}>;

/** Composition contract for persisted daily plans. */
export const DAILY_10_SLOTS: readonly DailySlot[] = [
  {
    position: 1,
    allowedTypes: ['MCQ'],
    allowedCategories: ['GK', 'SCIENCE', 'SPORTS', 'SPACE'],
    prioritizeWeakCategory: false,
    mediumIfEligible: false,
  },
  {
    position: 2,
    allowedTypes: ['MCQ'],
    allowedCategories: ['GK', 'SCIENCE', 'SPORTS', 'SPACE'],
    prioritizeWeakCategory: false,
    mediumIfEligible: false,
  },
  {
    position: 3,
    allowedTypes: ['MCQ'],
    allowedCategories: ['GK', 'SCIENCE', 'SPORTS', 'SPACE'],
    prioritizeWeakCategory: false,
    mediumIfEligible: false,
  },
  {
    position: 4,
    allowedTypes: ['PATTERN'],
    allowedCategories: ['LOGIC'],
    prioritizeWeakCategory: false,
    mediumIfEligible: false,
  },
  {
    position: 5,
    allowedTypes: ['PATTERN'],
    allowedCategories: ['LOGIC'],
    prioritizeWeakCategory: false,
    mediumIfEligible: false,
  },
  {
    position: 6,
    allowedTypes: ['PATTERN'],
    allowedCategories: ['LOGIC'],
    prioritizeWeakCategory: false,
    mediumIfEligible: false,
  },
  {
    position: 7,
    allowedTypes: ['MEMORY'],
    allowedCategories: ['LOGIC'],
    prioritizeWeakCategory: false,
    mediumIfEligible: false,
  },
  {
    position: 8,
    allowedTypes: ['MCQ'],
    allowedCategories: ['GK', 'SCIENCE', 'SPORTS', 'SPACE'],
    prioritizeWeakCategory: true,
    mediumIfEligible: false,
  },
  {
    position: 9,
    allowedTypes: ['MCQ'],
    allowedCategories: ['GK', 'SCIENCE', 'SPORTS', 'SPACE'],
    prioritizeWeakCategory: true,
    mediumIfEligible: false,
  },
  {
    position: 10,
    allowedTypes: ['MCQ', 'PATTERN'],
    allowedCategories: ['LOGIC', 'GK', 'SCIENCE', 'SPORTS', 'SPACE'],
    prioritizeWeakCategory: false,
    mediumIfEligible: true,
  },
];
