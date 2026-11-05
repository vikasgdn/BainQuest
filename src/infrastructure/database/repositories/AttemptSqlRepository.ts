import type {
  AttemptRepository,
  AnswerResult,
} from '../../../domain/repositories/contracts';
import type { Attempt } from '../../../domain/models/types';
import type { DatabaseDriver, DatabaseExecutor } from '../DatabaseDriver';
import { mapDatabaseError } from '../errors';
import { attemptFromRow, instantToEpoch } from '../mappers';

export class AttemptSqlRepository implements AttemptRepository {
  constructor(private readonly database: DatabaseDriver) {}
  async listForProfile(profileId: string): Promise<readonly Attempt[]> {
    return (
      await this.database.query(
        'SELECT * FROM attempts WHERE profile_id=? ORDER BY attempted_at DESC, rowid DESC LIMIT 200',
        [profileId],
      )
    )
      .map(attemptFromRow)
      .reverse();
  }
  async get(id: string): Promise<Attempt | null> {
    const rows = await this.database.query(
      'SELECT * FROM attempts WHERE attempt_id = ?',
      [id],
    );
    return rows[0] ? attemptFromRow(rows[0]) : null;
  }
  async listForSession(sessionId: string): Promise<readonly Attempt[]> {
    return (
      await this.database.query(
        'SELECT * FROM attempts WHERE session_id = ? ORDER BY attempted_at',
        [sessionId],
      )
    ).map(attemptFromRow);
  }
  async record(attempt: Attempt): Promise<AnswerResult> {
    return this.recordWith(this.database, attempt);
  }
  async recordWith(
    executor: DatabaseExecutor,
    attempt: Attempt,
  ): Promise<AnswerResult> {
    try {
      const existing = await executor.query(
        'SELECT * FROM attempts WHERE session_id = ? AND question_id = ?',
        [attempt.sessionId, attempt.questionId],
      );
      if (existing[0])
        return { attempt: attemptFromRow(existing[0]), alreadySubmitted: true };
      await executor.execute(
        `INSERT INTO attempts (attempt_id, profile_id, question_id, session_id, answer_id, correct, duration_ms, attempted_at, generator_id, generator_version, seed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          attempt.id,
          attempt.profileId,
          attempt.questionId,
          attempt.sessionId,
          attempt.answerId,
          attempt.correct ? 1 : 0,
          attempt.durationMs,
          instantToEpoch(attempt.attemptedAt),
          attempt.generatorId ?? null,
          attempt.generatorVersion ?? null,
          attempt.seed ?? null,
        ],
      );
      return { attempt, alreadySubmitted: false };
    } catch (error) {
      throw mapDatabaseError(error, 'Record attempt');
    }
  }
}
