import { PersistenceError } from '../../domain/errors/PersistenceError';

export function mapDatabaseError(
  error: unknown,
  operation: string,
): PersistenceError {
  if (error instanceof PersistenceError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  const code =
    lower.includes('unique') || lower.includes('constraint')
      ? 'CONSTRAINT'
      : 'QUERY_FAILED';
  return new PersistenceError(code, `${operation} failed: ${message}`, error);
}
