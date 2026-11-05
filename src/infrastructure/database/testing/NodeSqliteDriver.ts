import { DatabaseSync, type StatementSync } from 'node:sqlite';
import type {
  DatabaseDriver,
  DatabaseExecutor,
  SqlRow,
  SqlValue,
} from '../DatabaseDriver';

function bind(statement: StatementSync, parameters: readonly SqlValue[]) {
  return statement.run(...parameters);
}

export class NodeSqliteDriver implements DatabaseDriver {
  private readonly database: DatabaseSync;
  constructor(path = ':memory:') {
    this.database = new DatabaseSync(path);
  }
  async execute(
    sql: string,
    parameters: readonly SqlValue[] = [],
  ): Promise<{ rowsAffected: number }> {
    const result = bind(this.database.prepare(sql), parameters);
    return { rowsAffected: Number(result.changes) };
  }
  async query(
    sql: string,
    parameters: readonly SqlValue[] = [],
  ): Promise<readonly SqlRow[]> {
    return this.database.prepare(sql).all(...parameters) as readonly SqlRow[];
  }
  async transaction<T>(
    work: (transaction: DatabaseExecutor) => Promise<T>,
  ): Promise<T> {
    this.database.exec('BEGIN IMMEDIATE');
    try {
      const result = await work(this);
      this.database.exec('COMMIT');
      return result;
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }
  async close(): Promise<void> {
    this.database.close();
  }
}
