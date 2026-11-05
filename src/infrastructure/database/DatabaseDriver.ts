/** SQLite adapter contract. No driver, schema or migrations are installed yet. */
export type SqlValue = string | number | null | Uint8Array;
export type SqlRow = Readonly<Record<string, SqlValue>>;
export interface DatabaseExecutor {
  execute(
    sql: string,
    parameters?: readonly SqlValue[],
  ): Promise<{ readonly rowsAffected: number }>;
  query(
    sql: string,
    parameters?: readonly SqlValue[],
  ): Promise<readonly SqlRow[]>;
}
export interface DatabaseDriver extends DatabaseExecutor {
  /** Commit on success; roll back all writes when the callback rejects. */
  transaction<T>(
    work: (transaction: DatabaseExecutor) => Promise<T>,
  ): Promise<T>;
  close(): Promise<void>;
}
