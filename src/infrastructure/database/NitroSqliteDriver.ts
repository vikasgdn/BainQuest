import {
  open,
  type NitroSQLiteConnection,
  type Transaction,
} from 'react-native-nitro-sqlite';
import type {
  DatabaseDriver,
  DatabaseExecutor,
  SqlRow,
  SqlValue,
} from './DatabaseDriver';
import { mapDatabaseError } from './errors';

function params(
  values: readonly SqlValue[],
): (string | number | ArrayBuffer | null)[] {
  return values.map(value =>
    value instanceof Uint8Array ? value.slice().buffer : value,
  );
}

function executor(
  connection: Pick<NitroSQLiteConnection, 'executeAsync'> | Transaction,
): DatabaseExecutor {
  return {
    async execute(sql, values = []) {
      try {
        const result = await connection.executeAsync(sql, params(values));
        return { rowsAffected: result.rowsAffected ?? 0 };
      } catch (error) {
        throw mapDatabaseError(error, 'SQL execute');
      }
    },
    async query(sql, values = []) {
      try {
        const result = await connection.executeAsync(sql, params(values));
        return result.rows._array as readonly SqlRow[];
      } catch (error) {
        throw mapDatabaseError(error, 'SQL query');
      }
    },
  };
}

export function openNitroDatabase(name = 'brainquest.sqlite'): DatabaseDriver {
  const connection = open({ name });
  const base = executor(connection);
  return {
    ...base,
    transaction: work => connection.transaction(tx => work(executor(tx))),
    async close() {
      connection.close();
    },
  };
}
