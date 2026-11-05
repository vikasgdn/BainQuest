import type { KeyValueStore } from './KeyValueStore';

export class InMemoryKeyValueStore implements KeyValueStore {
  private readonly values = new Map<string, string | boolean>();
  getString(key: string): string | undefined {
    const value = this.values.get(key);
    return typeof value === 'string' ? value : undefined;
  }
  setString(key: string, value: string): void {
    this.values.set(key, value);
  }
  getBoolean(key: string): boolean | undefined {
    const value = this.values.get(key);
    return typeof value === 'boolean' ? value : undefined;
  }
  setBoolean(key: string, value: boolean): void {
    this.values.set(key, value);
  }
  remove(key: string): void {
    this.values.delete(key);
  }
}
