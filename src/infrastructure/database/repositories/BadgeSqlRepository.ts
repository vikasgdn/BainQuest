import type { BadgeRepository } from '../../../domain/repositories/contracts';
import type { Badge, BadgeCode } from '../../../domain/models/types';
import type { DatabaseDriver, DatabaseExecutor } from '../DatabaseDriver';
import { badgeFromRow, instantToEpoch } from '../mappers';

export class BadgeSqlRepository implements BadgeRepository {
  constructor(private readonly database: DatabaseDriver) {}
  async list(): Promise<readonly Badge[]> {
    return (
      await this.database.query('SELECT * FROM badges ORDER BY badge_id')
    ).map(badgeFromRow);
  }
  async listEarned(profileId: string): Promise<readonly BadgeCode[]> {
    const rows = await this.database.query(
      'SELECT b.code FROM earned_badges e JOIN badges b ON b.badge_id=e.badge_id WHERE e.profile_id=? ORDER BY e.earned_at',
      [profileId],
    );
    return rows.map(row => String(row.code) as BadgeCode);
  }
  async award(
    profileId: string,
    badgeCode: BadgeCode,
    earnedAt: string,
  ): Promise<boolean> {
    return this.awardWith(this.database, profileId, badgeCode, earnedAt);
  }
  async awardWith(
    executor: DatabaseExecutor,
    profileId: string,
    badgeCode: BadgeCode,
    earnedAt: string,
  ): Promise<boolean> {
    const result = await executor.execute(
      `INSERT OR IGNORE INTO earned_badges (profile_id, badge_id, earned_at) SELECT ?, badge_id, ? FROM badges WHERE code = ?`,
      [profileId, instantToEpoch(earnedAt), badgeCode],
    );
    return result.rowsAffected > 0;
  }
}
