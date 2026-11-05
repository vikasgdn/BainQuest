import type {
  Attempt,
  Badge,
  ChildProfile,
  ContentMetadata,
  GameSession,
  PlayerProgress,
  Question,
  SessionPlan,
} from '../../domain/models/types';
import type { SqlRow, SqlValue } from './DatabaseDriver';

function text(row: SqlRow, key: string): string {
  const value = row[key];
  if (typeof value !== 'string')
    throw new TypeError(`Expected text column ${key}`);
  return value;
}
function number(row: SqlRow, key: string): number {
  const value = row[key];
  if (typeof value !== 'number')
    throw new TypeError(`Expected number column ${key}`);
  return value;
}
function nullableText(row: SqlRow, key: string): string | null {
  const value = row[key];
  if (value === null) return null;
  if (typeof value !== 'string')
    throw new TypeError(`Expected nullable text column ${key}`);
  return value;
}
export const instantToEpoch = (value: string): number => {
  const result = Date.parse(value);
  if (!Number.isFinite(result))
    throw new RangeError(`Invalid ISO instant: ${value}`);
  return result;
};
export const epochToInstant = (value: number): string =>
  new Date(value).toISOString();

export function profileToValues(profile: ChildProfile): readonly SqlValue[] {
  return [
    profile.id,
    profile.displayName,
    profile.age,
    profile.ageBand,
    instantToEpoch(profile.createdAt),
  ];
}
export function profileFromRow(row: SqlRow): ChildProfile {
  return {
    id: text(row, 'profile_id'),
    displayName: text(row, 'display_name'),
    age: number(row, 'age'),
    ageBand: text(row, 'age_band') as ChildProfile['ageBand'],
    createdAt: epochToInstant(number(row, 'created_at')),
  };
}
export function questionFromRow(row: SqlRow): Question {
  return {
    id: text(row, 'question_id'),
    type: text(row, 'type') as Question['type'],
    category: text(row, 'category') as Question['category'],
    subcategory: text(row, 'subcategory'),
    ageMin: number(row, 'age_min'),
    ageMax: number(row, 'age_max'),
    difficulty: text(row, 'difficulty') as Question['difficulty'],
    prompt: text(row, 'prompt'),
    options: JSON.parse(text(row, 'payload_json')) as Question['options'],
    correctOptionId: text(row, 'correct_option_id'),
    explanation: text(row, 'explanation'),
    assetRef: nullableText(row, 'asset_ref'),
    contentVersion: number(row, 'version'),
    status: text(row, 'status') as Question['status'],
  };
}
export function attemptFromRow(row: SqlRow): Attempt {
  const generatorId = nullableText(row, 'generator_id');
  const generatorVersion = row.generator_version;
  const seed = row.seed;
  return {
    id: text(row, 'attempt_id'),
    profileId: text(row, 'profile_id'),
    questionId: text(row, 'question_id'),
    sessionId: text(row, 'session_id'),
    answerId: text(row, 'answer_id'),
    correct: number(row, 'correct') === 1,
    durationMs: number(row, 'duration_ms'),
    attemptedAt: epochToInstant(number(row, 'attempted_at')),
    ...(generatorId === null ? {} : { generatorId }),
    ...(typeof generatorVersion === 'number' ? { generatorVersion } : {}),
    ...(typeof seed === 'number' ? { seed } : {}),
  };
}
export function sessionFromRow(row: SqlRow): GameSession {
  const plan = JSON.parse(text(row, 'plan_json')) as SessionPlan;
  const startedAt = row.started_at;
  const completedAt = row.completed_at;
  return {
    plan,
    status: text(row, 'status') as GameSession['status'],
    attempts: [],
    startedAt: typeof startedAt === 'number' ? epochToInstant(startedAt) : null,
    completedAt:
      typeof completedAt === 'number' ? epochToInstant(completedAt) : null,
  };
}
export function progressFromRow(
  row: SqlRow,
  earnedBadges: PlayerProgress['earnedBadges'] = [],
): PlayerProgress {
  return {
    profileId: text(row, 'profile_id'),
    xp: number(row, 'xp'),
    level: number(row, 'level'),
    coins: number(row, 'coins'),
    currentStreak: number(row, 'current_streak'),
    longestStreak: number(row, 'longest_streak'),
    lastDailyDate: nullableText(row, 'last_active_date'),
    completedSessionIds: JSON.parse(
      text(row, 'completed_session_ids_json'),
    ) as readonly string[],
    earnedBadges,
  };
}
export function badgeFromRow(row: SqlRow): Badge {
  return {
    id: text(row, 'badge_id'),
    code: text(row, 'code') as Badge['code'],
    title: text(row, 'title'),
    ruleType: text(row, 'rule_type'),
    threshold: number(row, 'threshold'),
  };
}
export function metadataFromRow(row: SqlRow): ContentMetadata {
  return {
    key: text(row, 'content_key'),
    schemaVersion: number(row, 'schema_version'),
    contentVersion: number(row, 'content_version'),
    checksum: text(row, 'checksum'),
    importedAt: epochToInstant(number(row, 'imported_at')),
  };
}
