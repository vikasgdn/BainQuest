import type {
  ContentPreparationResult,
  SelectionRequest,
  SelectionResult,
} from '../models/selection';
import type {
  Attempt,
  Badge,
  BadgeCode,
  ChildProfile,
  ContentMetadata,
  GameSession,
  PlayerProgress,
  ProgressUpdate,
  ProgressSummary,
  Question,
  SessionId,
  SessionPlan,
  SessionResult,
} from '../models/types';

export interface ChildProfileRepository {
  create(profile: ChildProfile): Promise<ChildProfile>;
  get(id: string): Promise<ChildProfile | null>;
  list(): Promise<readonly ChildProfile[]>;
  update(profile: ChildProfile): Promise<ChildProfile>;
  delete(id: string): Promise<boolean>;
}

export interface QuestionRepository {
  prepareContent(): Promise<ContentPreparationResult>;
  selectQuestions(request: SelectionRequest): Promise<SelectionResult>;
  getQuestion(id: string): Promise<Question | null>;
}

export type SubmittedAnswer = Readonly<{
  sessionId: SessionId;
  questionId: string;
  answerId: string;
  durationMs: number;
}>;
export type AnswerResult = Readonly<{
  attempt: Attempt;
  alreadySubmitted: boolean;
}>;
export interface SessionRepository {
  create(plan: SessionPlan): Promise<GameSession>;
  get(sessionId: SessionId): Promise<GameSession | null>;
  /** A repeated answer for a session item returns the existing attempt. */
  recordAnswer(answer: SubmittedAnswer): Promise<AnswerResult>;
  /** Completion and progress writes must be atomic; retries return the saved result. */
  complete(sessionId: SessionId): Promise<SessionResult>;
}

export interface AttemptRepository {
  /** Latest 200 attempts, returned oldest first, for bounded daily adaptation. */
  listForProfile(profileId: string): Promise<readonly Attempt[]>;
  get(id: string): Promise<Attempt | null>;
  listForSession(sessionId: SessionId): Promise<readonly Attempt[]>;
  record(attempt: Attempt): Promise<AnswerResult>;
}

export type ProgressListener = (progress: PlayerProgress) => void;
export type Unsubscribe = () => void;
export interface ProgressRepository {
  getSummary(profileId: string): Promise<ProgressSummary>;
  get(profileId: string): Promise<PlayerProgress>;
  /** Implementations must apply each completion token at most once. */
  applyCompletedSession(result: SessionResult): Promise<ProgressUpdate>;
  subscribe(profileId: string, listener: ProgressListener): Unsubscribe;
}

export interface BadgeRepository {
  list(): Promise<readonly Badge[]>;
  listEarned(profileId: string): Promise<readonly BadgeCode[]>;
  award(
    profileId: string,
    badgeCode: BadgeCode,
    earnedAt: string,
  ): Promise<boolean>;
}

export interface ContentMetadataRepository {
  get(key: string): Promise<ContentMetadata | null>;
  put(metadata: ContentMetadata): Promise<void>;
}
