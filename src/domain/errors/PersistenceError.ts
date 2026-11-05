export type PersistenceErrorCode =
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'CONSTRAINT'
  | 'INITIALIZATION_FAILED'
  | 'QUERY_FAILED'
  | 'TRANSACTION_FAILED';

export class PersistenceError extends Error {
  constructor(
    readonly code: PersistenceErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'PersistenceError';
  }
}
