import type {
  ProgressListener,
  ProgressRepository,
} from '../../../domain/repositories/contracts';
import type {
  PlayerProgress,
  ProgressUpdate,
  ProgressSummary,
  Category,
  SessionResult,
} from '../../../domain/models/types';
import { applySessionCompletion } from '../../../domain/policies/ProgressionPolicy';
import type { BadgeFacts } from '../../../domain/policies/BadgePolicy';
import type { DatabaseDriver, DatabaseExecutor } from '../DatabaseDriver';
import { epochToInstant, progressFromRow } from '../mappers';
import { BadgeSqlRepository } from './BadgeSqlRepository';

export class ProgressSqlRepository implements ProgressRepository {
  private readonly listeners = new Map<string, Set<ProgressListener>>();
  constructor(private readonly database: DatabaseDriver) {}
  async getSummary(profileId: string): Promise<ProgressSummary> {
    return this.database.transaction(async transaction => {
      const progress = await this.getWith(transaction, profileId);
      const categories = await transaction.query(
        `SELECT q.category, COUNT(*) answered, SUM(a.correct) correct, SUM(a.duration_ms) duration_ms
         FROM attempts a JOIN questions q ON q.question_id=a.question_id
         WHERE a.profile_id=? GROUP BY q.category ORDER BY q.category`,
        [profileId],
      );
      const count = await transaction.query(
        "SELECT COUNT(*) total FROM sessions WHERE profile_id=? AND status='COMPLETED'",
        [profileId],
      );
      const sessions = await transaction.query(
        `SELECT completion_result_json FROM sessions
         WHERE profile_id=? AND status='COMPLETED'
         ORDER BY completed_at DESC, rowid DESC LIMIT 20`,
        [profileId],
      );
      return {
        progress,
        totalDurationMs: categories.reduce(
          (sum, row) => sum + Number(row.duration_ms),
          0,
        ),
        categories: categories.map(row => ({
          category: String(row.category) as Category,
          answered: Number(row.answered),
          correct: Number(row.correct),
        })),
        completedSessions: Number(count[0]?.total ?? 0),
        recentSessions: sessions.map(
          row =>
            JSON.parse(String(row.completion_result_json)) as SessionResult,
        ),
      };
    });
  }
  async get(profileId: string): Promise<PlayerProgress> {
    return this.getWith(this.database, profileId);
  }
  async getWith(
    executor: DatabaseExecutor,
    profileId: string,
  ): Promise<PlayerProgress> {
    const rows = await executor.query(
      'SELECT * FROM progress WHERE profile_id = ?',
      [profileId],
    );
    if (!rows[0]) throw new Error('Progress not found');
    const earned = await executor.query(
      'SELECT b.code, e.earned_at FROM earned_badges e JOIN badges b ON b.badge_id=e.badge_id WHERE e.profile_id=? ORDER BY e.earned_at',
      [profileId],
    );
    return progressFromRow(
      rows[0],
      earned.map(row => ({
        code: String(
          row.code,
        ) as PlayerProgress['earnedBadges'][number]['code'],
        earnedAt: epochToInstant(Number(row.earned_at)),
      })),
    );
  }
  async applyCompletedSession(result: SessionResult): Promise<ProgressUpdate> {
    const update = await this.database.transaction(async transaction => {
      const progress = await this.getWith(transaction, result.profileId);
      const facts = await this.badgeFacts(transaction, result);
      const next = applySessionCompletion(progress, result, facts);
      if (!next.applied) return next;
      await this.persistWith(transaction, next.progress);
      const badges = new BadgeSqlRepository(this.database);
      for (const badge of next.newlyEarnedBadges)
        await badges.awardWith(
          transaction,
          result.profileId,
          badge,
          result.completedAt,
        );
      return next;
    });
    if (update.applied) this.emit(update.progress);
    return update;
  }
  async persistWith(
    executor: DatabaseExecutor,
    progress: PlayerProgress,
  ): Promise<void> {
    await executor.execute(
      'UPDATE progress SET xp=?, level=?, coins=?, current_streak=?, longest_streak=?, last_active_date=?, completed_session_ids_json=? WHERE profile_id=?',
      [
        progress.xp,
        progress.level,
        progress.coins,
        progress.currentStreak,
        progress.longestStreak,
        progress.lastDailyDate,
        JSON.stringify(progress.completedSessionIds),
        progress.profileId,
      ],
    );
  }
  subscribe(profileId: string, listener: ProgressListener): () => void {
    const listeners = this.listeners.get(profileId) ?? new Set();
    listeners.add(listener);
    this.listeners.set(profileId, listeners);
    return () => {
      listeners.delete(listener);
    };
  }
  private emit(progress: PlayerProgress) {
    this.listeners
      .get(progress.profileId)
      ?.forEach(listener => listener(progress));
  }
  async badgeFacts(
    executor: DatabaseExecutor,
    result: SessionResult,
  ): Promise<BadgeFacts> {
    const rows = await executor.query(
      `SELECT
      (SELECT COUNT(*) FROM sessions WHERE profile_id=? AND status='COMPLETED') completed_sessions,
      (SELECT COUNT(*) FROM attempts WHERE profile_id=?) answered_questions,
      (SELECT COUNT(*) FROM attempts a JOIN questions q ON q.question_id=a.question_id WHERE a.profile_id=? AND a.correct=1 AND q.category='SCIENCE') science_correct,
      (SELECT COUNT(*) FROM attempts a JOIN questions q ON q.question_id=a.question_id WHERE a.profile_id=? AND a.correct=1 AND q.category='SPACE') space_correct,
      (SELECT COUNT(*) FROM attempts WHERE profile_id=? AND correct=1 AND generator_id IS NOT NULL) puzzles_correct`,
      [
        result.profileId,
        result.profileId,
        result.profileId,
        result.profileId,
        result.profileId,
      ],
    );
    const row = rows[0];
    return {
      completedSessions: Number(row?.completed_sessions ?? 0),
      currentDailyStreak: 0,
      answeredQuestions: Number(row?.answered_questions ?? 0),
      scienceCorrect: Number(row?.science_correct ?? 0),
      spaceCorrect: Number(row?.space_correct ?? 0),
      generatedPuzzlesCorrect: Number(row?.puzzles_correct ?? 0),
      lastSessionMode: result.mode,
      lastSessionItemCount: result.itemCount,
      lastSessionCorrectCount: result.correctCount,
    };
  }
}
