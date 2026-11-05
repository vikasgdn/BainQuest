import type {
  AnswerResult,
  SessionRepository,
  SubmittedAnswer,
} from '../../../domain/repositories/contracts';
import type {
  Attempt,
  GameSession,
  SessionPlan,
  SessionResult,
} from '../../../domain/models/types';
import {
  scoreAnswer,
  scoreCompletedSession,
} from '../../../domain/policies/ScoringPolicy';
import { applySessionCompletion } from '../../../domain/policies/ProgressionPolicy';
import type { Clock } from '../../../shared/Clock';
import type { DatabaseDriver } from '../DatabaseDriver';
import { mapDatabaseError } from '../errors';
import {
  instantToEpoch,
  sessionFromRow,
  questionFromRow,
  attemptFromRow,
} from '../mappers';
import { AttemptSqlRepository } from './AttemptSqlRepository';
import { ProgressSqlRepository } from './ProgressSqlRepository';
import { BadgeSqlRepository } from './BadgeSqlRepository';

export class SessionSqlRepository implements SessionRepository {
  private readonly attempts: AttemptSqlRepository;
  private readonly progress: ProgressSqlRepository;
  constructor(
    private readonly database: DatabaseDriver,
    private readonly clock: Clock,
  ) {
    this.attempts = new AttemptSqlRepository(database);
    this.progress = new ProgressSqlRepository(database);
  }
  async create(plan: SessionPlan): Promise<GameSession> {
    try {
      return await this.database.transaction(async transaction => {
        if (plan.mode === 'DAILY_10') {
          const rows = await transaction.query(
            'SELECT * FROM sessions WHERE session_id=?',
            [plan.id],
          );
          if (rows[0]) {
            const attempts = await transaction.query(
              'SELECT * FROM attempts WHERE session_id=? ORDER BY attempted_at',
              [plan.id],
            );
            return {
              ...sessionFromRow(rows[0]),
              attempts: attempts.map(attemptFromRow),
            };
          }
        }
        if (
          !plan.questionIds.length ||
          new Set(plan.questionIds).size !== plan.questionIds.length
        )
          throw new Error('A session needs distinct questions');
        if (
          plan.items &&
          (plan.items.length !== plan.questionIds.length ||
            plan.items.some((q, index) => q.id !== plan.questionIds[index]))
        )
          throw new Error('Session snapshots do not match the plan');
        for (const question of plan.items ?? []) {
          if (!question.generated) continue;
          await transaction.execute(
            `INSERT INTO questions (question_id,type,category,subcategory,age_min,age_max,difficulty,prompt,payload_json,correct_option_id,explanation,asset_ref,version,status,source_label,source_url,license) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              question.id,
              question.type,
              question.category,
              question.subcategory,
              question.ageMin,
              question.ageMax,
              question.difficulty,
              question.prompt,
              JSON.stringify(question.options),
              question.correctOptionId,
              question.explanation,
              null,
              question.contentVersion,
              'RETIRED',
              'BrainQuest generator',
              null,
              'Original',
            ],
          );
        }
        await transaction.execute(
          `INSERT INTO sessions (session_id,profile_id,mode,plan_json,seed,content_version,local_date,item_count,status) VALUES (?,?,?,?,?,?,?,?,?)`,
          [
            plan.id,
            plan.profileId,
            plan.mode,
            JSON.stringify(plan),
            plan.seed,
            plan.contentVersion,
            plan.localDate,
            plan.questionIds.length,
            'PLANNED',
          ],
        );
        return {
          plan,
          status: 'PLANNED',
          attempts: [],
          startedAt: null,
          completedAt: null,
        };
      });
    } catch (error) {
      throw mapDatabaseError(error, 'Create session');
    }
  }
  async recordAnswer(answer: SubmittedAnswer): Promise<AnswerResult> {
    return this.database.transaction(async transaction => {
      const sessionRows = await transaction.query(
        'SELECT * FROM sessions WHERE session_id=?',
        [answer.sessionId],
      );
      if (!sessionRows[0]) throw new Error('Session not found');
      if (sessionRows[0].status === 'COMPLETED')
        throw new Error('Session already completed');
      const plan = sessionFromRow(sessionRows[0]).plan;
      if (!plan.questionIds.includes(answer.questionId))
        throw new Error('Question is not in this session');
      if (!Number.isFinite(answer.durationMs) || answer.durationMs < 0)
        throw new Error('Invalid answer duration');
      const questionRows = await transaction.query(
        'SELECT * FROM questions WHERE question_id=?',
        [answer.questionId],
      );
      const question =
        plan.items?.find(q => q.id === answer.questionId) ??
        (questionRows[0] ? questionFromRow(questionRows[0]) : null);
      if (!question) throw new Error('Question not found');
      if (!question.options.some(option => option.id === answer.answerId))
        throw new Error('Unknown answer');
      const previous = await transaction.query(
        'SELECT * FROM attempts WHERE session_id=? AND question_id=?',
        [answer.sessionId, answer.questionId],
      );
      if (previous[0])
        return { attempt: attemptFromRow(previous[0]), alreadySubmitted: true };
      const answered = await transaction.query(
        'SELECT question_id FROM attempts WHERE session_id=?',
        [answer.sessionId],
      );
      if (
        plan.questionIds.find(
          id => !answered.some(row => row.question_id === id),
        ) !== answer.questionId
      )
        throw new Error('Answer the current question first');
      const generated = plan.items?.find(
        q => q.id === answer.questionId,
      )?.generated;
      const now = this.clock.now();
      const attempt: Attempt = {
        id: `${answer.sessionId}:${answer.questionId}`,
        profileId: String(sessionRows[0].profile_id),
        questionId: answer.questionId,
        sessionId: answer.sessionId,
        answerId: answer.answerId,
        correct: answer.answerId === question.correctOptionId,
        durationMs: answer.durationMs,
        attemptedAt: now,
        ...(generated
          ? {
              generatorId: generated.generatorId,
              generatorVersion: generated.generatorVersion,
              seed: generated.seed,
            }
          : {}),
      };
      const result = await this.attempts.recordWith(transaction, attempt);
      if (!result.alreadySubmitted)
        await transaction.execute(
          `UPDATE sessions SET status='IN_PROGRESS', started_at=COALESCE(started_at,?) WHERE session_id=?`,
          [instantToEpoch(now), answer.sessionId],
        );
      return result;
    });
  }
  async complete(sessionId: string): Promise<SessionResult> {
    try {
      return await this.database.transaction(async transaction => {
        const rows = await transaction.query(
          'SELECT * FROM sessions WHERE session_id=?',
          [sessionId],
        );
        const row = rows[0];
        if (!row) throw new Error('Session not found');
        if (row.status === 'COMPLETED') {
          if (typeof row.completion_result_json !== 'string')
            throw new Error('Completed session result missing');
          return JSON.parse(row.completion_result_json) as SessionResult;
        }
        const attemptRows = await transaction.query(
          `SELECT a.*, q.difficulty FROM attempts a JOIN questions q ON q.question_id=a.question_id WHERE a.session_id=? ORDER BY a.attempted_at`,
          [sessionId],
        );
        const plan = sessionFromRow(row).plan;
        if (
          attemptRows.length !== plan.questionIds.length ||
          plan.questionIds.some(
            id => !attemptRows.some(a => a.question_id === id),
          )
        )
          throw new Error(
            'Answer every question before completing the session',
          );
        const scores = attemptRows.map(attempt =>
          scoreAnswer({
            correct: Number(attempt.correct) === 1,
            difficulty: (plan.items?.find(q => q.id === attempt.question_id)
              ?.difficulty ?? String(attempt.difficulty)) as
              | 'EASY'
              | 'MEDIUM'
              | 'HARD',
            durationMs: Number(attempt.duration_ms),
            firstAttempt: true,
            extendedTime: plan.extendedTime ?? false,
          }),
        );
        const correctCount = attemptRows.filter(
          attempt => Number(attempt.correct) === 1,
        ).length;
        const score = scoreCompletedSession(
          scores,
          String(row.mode) as 'DAILY_10' | 'PRACTICE',
          correctCount,
        );
        const completedAt = this.clock.now();
        const result: SessionResult = {
          sessionId,
          profileId: String(row.profile_id),
          mode: String(row.mode) as SessionResult['mode'],
          itemCount: Number(row.item_count),
          correctCount,
          score,
          xpAwarded: score,
          completedAt,
          localDate: this.clock.localDate(),
          completionToken: `${sessionId}:complete`,
        };
        const persisted = JSON.stringify(result);
        await transaction.execute(
          `UPDATE sessions SET status='COMPLETED', completed_at=?, score=?, correct_count=?, completion_token=?, completion_result_json=? WHERE session_id=? AND status!='COMPLETED'`,
          [
            instantToEpoch(completedAt),
            score,
            correctCount,
            result.completionToken,
            persisted,
            sessionId,
          ],
        );
        const current = await this.progress.getWith(
          transaction,
          result.profileId,
        );
        const facts = await this.progress.badgeFacts(transaction, result);
        const update = applySessionCompletion(current, result, facts);
        if (update.applied) {
          await this.progress.persistWith(transaction, update.progress);
          const badgeRepository = new BadgeSqlRepository(this.database);
          for (const badge of update.newlyEarnedBadges)
            await badgeRepository.awardWith(
              transaction,
              result.profileId,
              badge,
              completedAt,
            );
        }
        return result;
      });
    } catch (error) {
      throw mapDatabaseError(error, 'Complete session');
    }
  }
  async get(sessionId: string): Promise<GameSession | null> {
    const rows = await this.database.query(
      'SELECT * FROM sessions WHERE session_id=?',
      [sessionId],
    );
    if (!rows[0]) return null;
    return {
      ...sessionFromRow(rows[0]),
      attempts: await this.attempts.listForSession(sessionId),
    };
  }
}
