import { PersistenceError } from '../../../domain/errors/PersistenceError';
import type { DatabaseDriver, DatabaseExecutor } from '../DatabaseDriver';
import {
  INITIAL_BADGES,
  INITIAL_SCHEMA_STATEMENTS,
  INITIAL_SCHEMA_VERSION,
} from './001_initial';

export type Migration = Readonly<{
  version: number;
  up: (database: DatabaseExecutor) => Promise<void>;
}>;

export const MIGRATIONS: readonly Migration[] = [
  {
    version: INITIAL_SCHEMA_VERSION,
    async up(database) {
      for (const statement of INITIAL_SCHEMA_STATEMENTS)
        await database.execute(statement);
      for (const badge of INITIAL_BADGES) {
        await database.execute(
          'INSERT INTO badges (badge_id, code, title, rule_type, threshold) VALUES (?, ?, ?, ?, ?)',
          badge,
        );
      }
    },
  },
];

export async function migrateDatabase(
  database: DatabaseDriver,
  migrations: readonly Migration[] = MIGRATIONS,
): Promise<number> {
  try {
    await database.execute('PRAGMA foreign_keys = ON');
    const rows = await database.query('PRAGMA user_version');
    let current = Number(rows[0]?.user_version ?? 0);
    const ordered = [...migrations].sort((a, b) => a.version - b.version);
    for (const migration of ordered) {
      if (migration.version <= current) continue;
      if (migration.version !== current + 1) {
        throw new Error(`Missing migration ${current + 1}`);
      }
      await database.transaction(async transaction => {
        await migration.up(transaction);
        await transaction.execute(`PRAGMA user_version = ${migration.version}`);
      });
      current = migration.version;
    }
    return current;
  } catch (error) {
    throw new PersistenceError(
      'INITIALIZATION_FAILED',
      'Database migration failed',
      error,
    );
  }
}
