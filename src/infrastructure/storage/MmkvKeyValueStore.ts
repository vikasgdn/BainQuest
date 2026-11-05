import { createMMKV, type MMKV } from 'react-native-mmkv';
import type { KeyValueStore } from './KeyValueStore';

export class MmkvKeyValueStore implements KeyValueStore {
  private readonly storage: MMKV;
  constructor(id = 'brainquest.settings') {
    this.storage = createMMKV({ id });
  }
  getString(key: string): string | undefined {
    return this.storage.getString(key);
  }
  setString(key: string, value: string): void {
    this.storage.set(key, value);
  }
  getBoolean(key: string): boolean | undefined {
    return this.storage.getBoolean(key);
  }
  setBoolean(key: string, value: boolean): void {
    this.storage.set(key, value);
  }
  remove(key: string): void {
    this.storage.remove(key);
  }
}
