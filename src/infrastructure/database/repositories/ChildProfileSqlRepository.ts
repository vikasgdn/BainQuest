import type { ChildProfileRepository } from '../../../domain/repositories/contracts';
import type { ChildProfile, SessionPlan } from '../../../domain/models/types';
import type { DatabaseDriver } from '../DatabaseDriver';
import { mapDatabaseError } from '../errors';
import { profileFromRow, profileToValues } from '../mappers';

export class ChildProfileSqlRepository implements ChildProfileRepository {
  constructor(private readonly database: DatabaseDriver) {}
  async create(profile: ChildProfile): Promise<ChildProfile> {
    try {
      await this.database.transaction(async tx => {
        await tx.execute(
          'INSERT INTO child_profiles (profile_id, display_name, age, age_band, created_at) VALUES (?, ?, ?, ?, ?)',
          profileToValues(profile),
        );
        await tx.execute('INSERT INTO progress (profile_id) VALUES (?)', [
          profile.id,
        ]);
      });
      return profile;
    } catch (error) {
      throw mapDatabaseError(error, 'Create profile');
    }
  }
  async get(id: string): Promise<ChildProfile | null> {
    try {
      const rows = await this.database.query(
        'SELECT * FROM child_profiles WHERE profile_id = ?',
        [id],
      );
      return rows[0] ? profileFromRow(rows[0]) : null;
    } catch (error) {
      throw mapDatabaseError(error, 'Get profile');
    }
  }
  async list(): Promise<readonly ChildProfile[]> {
    try {
      return (
        await this.database.query(
          'SELECT * FROM child_profiles ORDER BY created_at',
        )
      ).map(profileFromRow);
    } catch (error) {
      throw mapDatabaseError(error, 'List profiles');
    }
  }
  async update(profile: ChildProfile): Promise<ChildProfile> {
    try {
      const result = await this.database.execute(
        'UPDATE child_profiles SET display_name = ?, age = ?, age_band = ? WHERE profile_id = ?',
        [profile.displayName, profile.age, profile.ageBand, profile.id],
      );
      if (result.rowsAffected === 0) throw new Error('Profile not found');
      return profile;
    } catch (error) {
      throw mapDatabaseError(error, 'Update profile');
    }
  }
  async delete(id: string): Promise<boolean> {
    try {
      return await this.database.transaction(async transaction => {
        const sessions = await transaction.query(
          'SELECT plan_json FROM sessions WHERE profile_id=?',
          [id],
        );
        const generatedIds = new Set(
          sessions.flatMap(row => {
            const plan = JSON.parse(String(row.plan_json)) as SessionPlan;
            return (plan.items ?? [])
              .filter(item => item.generated)
              .map(item => item.id);
          }),
        );
        const result = await transaction.execute(
          'DELETE FROM child_profiles WHERE profile_id = ?',
          [id],
        );
        if (generatedIds.size) {
          const remaining = await transaction.query(
            'SELECT plan_json FROM sessions',
          );
          const referenced = new Set(
            remaining.flatMap(
              row =>
                (JSON.parse(String(row.plan_json)) as SessionPlan).questionIds,
            ),
          );
          for (const questionId of generatedIds) {
            if (referenced.has(questionId)) continue;
            await transaction.execute(
              `DELETE FROM questions WHERE question_id=? AND source_label='BrainQuest generator'
               AND NOT EXISTS (SELECT 1 FROM attempts WHERE question_id=?)`,
              [questionId, questionId],
            );
          }
        }
        return result.rowsAffected > 0;
      });
    } catch (error) {
      throw mapDatabaseError(error, 'Delete profile');
    }
  }
}
