export const INITIAL_SCHEMA_VERSION = 1;

export const INITIAL_SCHEMA_STATEMENTS: readonly string[] = [
  `CREATE TABLE child_profiles (
    profile_id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    age INTEGER NOT NULL CHECK (age BETWEEN 7 AND 14),
    age_band TEXT NOT NULL CHECK (age_band IN ('EXPLORER_7_9','CHALLENGER_10_12','MASTER_13_14')),
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE questions (
    question_id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT NOT NULL,
    age_min INTEGER NOT NULL,
    age_max INTEGER NOT NULL,
    difficulty TEXT NOT NULL,
    prompt TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    correct_option_id TEXT NOT NULL,
    explanation TEXT NOT NULL,
    asset_ref TEXT,
    version INTEGER NOT NULL,
    status TEXT NOT NULL,
    source_label TEXT NOT NULL,
    source_url TEXT,
    license TEXT NOT NULL,
    CHECK (age_min BETWEEN 7 AND 14 AND age_max BETWEEN age_min AND 14)
  )`,
  `CREATE TABLE sessions (
    session_id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES child_profiles(profile_id) ON DELETE CASCADE,
    mode TEXT NOT NULL,
    plan_json TEXT NOT NULL,
    seed INTEGER NOT NULL,
    content_version INTEGER NOT NULL,
    local_date TEXT,
    started_at INTEGER,
    completed_at INTEGER,
    score INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    item_count INTEGER NOT NULL,
    status TEXT NOT NULL,
    completion_token TEXT UNIQUE,
    completion_result_json TEXT
  )`,
  `CREATE TABLE attempts (
    attempt_id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES child_profiles(profile_id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES questions(question_id) ON DELETE RESTRICT,
    session_id TEXT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    answer_id TEXT NOT NULL,
    correct INTEGER NOT NULL CHECK (correct IN (0,1)),
    duration_ms INTEGER NOT NULL CHECK (duration_ms >= 0),
    attempted_at INTEGER NOT NULL,
    generator_id TEXT,
    generator_version INTEGER,
    seed INTEGER,
    UNIQUE(session_id, question_id)
  )`,
  `CREATE TABLE progress (
    profile_id TEXT PRIMARY KEY REFERENCES child_profiles(profile_id) ON DELETE CASCADE,
    xp INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    coins INTEGER NOT NULL DEFAULT 0,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_active_date TEXT,
    completed_session_ids_json TEXT NOT NULL DEFAULT '[]'
  )`,
  `CREATE TABLE badges (
    badge_id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    rule_type TEXT NOT NULL,
    threshold INTEGER NOT NULL
  )`,
  `CREATE TABLE earned_badges (
    profile_id TEXT NOT NULL REFERENCES child_profiles(profile_id) ON DELETE CASCADE,
    badge_id TEXT NOT NULL REFERENCES badges(badge_id) ON DELETE RESTRICT,
    earned_at INTEGER NOT NULL,
    PRIMARY KEY(profile_id, badge_id)
  )`,
  `CREATE TABLE content_metadata (
    content_key TEXT PRIMARY KEY,
    schema_version INTEGER NOT NULL,
    content_version INTEGER NOT NULL,
    checksum TEXT NOT NULL,
    imported_at INTEGER NOT NULL
  )`,
  `CREATE INDEX idx_questions_selection ON questions(category, age_min, age_max, difficulty, status)`,
  `CREATE INDEX idx_attempts_profile_time ON attempts(profile_id, attempted_at)`,
  `CREATE INDEX idx_attempts_question ON attempts(question_id)`,
  `CREATE INDEX idx_attempts_session ON attempts(session_id)`,
  `CREATE INDEX idx_sessions_profile_completed ON sessions(profile_id, completed_at)`,
];

export const INITIAL_BADGES: readonly (readonly [
  string,
  string,
  string,
  string,
  number,
])[] = [
  ['badge-first-steps', 'FIRST_STEPS', 'First Steps', 'COMPLETED_SESSIONS', 1],
  ['badge-daily-7', 'DAILY_7', 'Daily 7', 'DAILY_STREAK', 7],
  [
    'badge-questions-100',
    'QUESTIONS_100',
    '100 Questions',
    'ANSWERED_QUESTIONS',
    100,
  ],
  ['badge-perfect-10', 'PERFECT_10', 'Perfect 10', 'PERFECT_DAILY', 10],
  [
    'badge-science-explorer',
    'SCIENCE_EXPLORER',
    'Science Explorer',
    'SCIENCE_CORRECT',
    50,
  ],
  [
    'badge-space-explorer',
    'SPACE_EXPLORER',
    'Space Explorer',
    'SPACE_CORRECT',
    50,
  ],
  [
    'badge-puzzle-solver',
    'PUZZLE_SOLVER',
    'Puzzle Solver',
    'PUZZLES_CORRECT',
    50,
  ],
];
