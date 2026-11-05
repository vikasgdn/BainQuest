import type { Clock } from '../../shared/Clock';
import { sha256 } from '../../shared/sha256';
import { allowedDifficulties } from '../policies/AgeBandPolicy';
import type {
  ChildProfile,
  Category,
  GameSession,
  SessionPlan,
} from '../models/types';
import type {
  QuestionRepository,
  SessionRepository,
} from '../repositories/contracts';

export type McqSessionDependencies = Readonly<{
  clock: Clock;
  questions: QuestionRepository;
  sessions: SessionRepository;
}>;

export type McqSessionRequest = Readonly<{
  profile: ChildProfile;
  category: Category;
  count?: number;
}>;

export type McqSessionPreparation =
  | Readonly<{ kind: 'ready'; session: GameSession }>
  | Readonly<{
      kind: 'insufficient-content';
      requested: number;
      available: number;
    }>;

function seedFor(
  profileId: string,
  category: Category,
  instant: string,
): number {
  return Number.parseInt(
    sha256(`${profileId}|${category}|${instant}`).slice(0, 8),
    16,
  );
}

export async function createMcqSession(
  dependencies: McqSessionDependencies,
  request: McqSessionRequest,
): Promise<McqSessionPreparation> {
  const count = request.count ?? 5;
  if (!Number.isSafeInteger(count) || count < 1 || count > 20)
    throw new RangeError('count must be between 1 and 20');
  const createdAt = dependencies.clock.now();
  const selection = await dependencies.questions.selectQuestions({
    age: request.profile.age,
    ageBand: request.profile.ageBand,
    count,
    categories: [request.category],
    types: ['MCQ'],
    allowedDifficulties: allowedDifficulties(request.profile.ageBand),
    recentQuestionIds: [],
    weakCategories: [],
    seed: seedFor(request.profile.id, request.category, createdAt),
  });
  if (selection.kind === 'insufficient-content') return selection;
  const seed = seedFor(request.profile.id, request.category, createdAt);
  const plan: SessionPlan = {
    id: `mcq-${sha256(
      `${request.profile.id}|${request.category}|${createdAt}`,
    ).slice(0, 24)}`,
    profileId: request.profile.id,
    mode: 'CATEGORY_PRACTICE',
    questionIds: selection.questions.map(question => question.id),
    seed,
    contentVersion: Math.max(
      ...selection.questions.map(question => question.contentVersion),
    ),
    localDate: dependencies.clock.localDate(),
    createdAt,
  };
  return { kind: 'ready', session: await dependencies.sessions.create(plan) };
}

export async function resumeMcqSession(
  sessions: SessionRepository,
  sessionId: string,
): Promise<GameSession> {
  const session = await sessions.get(sessionId);
  if (!session) throw new Error('Session not found');
  if (
    session.plan.mode !== 'CATEGORY_PRACTICE' &&
    session.plan.mode !== 'QUICK_PRACTICE'
  )
    throw new Error('Session is not an MCQ practice session');
  return session;
}
