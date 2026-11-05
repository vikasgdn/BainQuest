import type { ParentGateState } from '@/domain/use-cases/ParentGate';
import type { KeyValueStore } from './KeyValueStore';
import { SETTING_KEYS } from './KeyValueStore';
import type { AppSettings } from '@/shared/AppSettings';
export type { AppSettings } from '@/shared/AppSettings';

export class AppSettingsStore {
  private readonly listeners = new Set<(settings: AppSettings) => void>();
  subscribe(listener: (settings: AppSettings) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  getParentGateState(): ParentGateState {
    const saved = this.storage.getString('parent.gate');
    if (!saved) return { failures: 0, lockedUntil: 0 };
    const value = JSON.parse(saved) as ParentGateState;
    if (
      !Number.isInteger(value.failures) ||
      value.failures < 0 ||
      value.failures > 2 ||
      !Number.isSafeInteger(value.lockedUntil) ||
      value.lockedUntil < 0
    ) {
      throw new Error('Parent gate state unavailable');
    }
    return value;
  }
  setParentGateState(state: ParentGateState): void {
    this.storage.setString('parent.gate', JSON.stringify(state));
  }

  constructor(private readonly storage: KeyValueStore) {}
  get(): AppSettings {
    return {
      onboardingCompleted:
        this.storage.getBoolean(SETTING_KEYS.onboardingCompleted) ?? false,
      selectedProfileId:
        this.storage.getString(SETTING_KEYS.selectedProfileId) ?? null,
      soundEnabled: this.storage.getBoolean(SETTING_KEYS.soundEnabled) ?? true,
      hapticEnabled:
        this.storage.getBoolean(SETTING_KEYS.hapticEnabled) ?? true,
      reducedMotion:
        this.storage.getBoolean(SETTING_KEYS.reducedMotion) ?? false,
      extendedTime: this.storage.getBoolean(SETTING_KEYS.extendedTime) ?? false,
    };
  }
  set(settings: AppSettings): void {
    this.storage.setBoolean(
      SETTING_KEYS.onboardingCompleted,
      settings.onboardingCompleted,
    );
    if (settings.selectedProfileId === null)
      this.storage.remove(SETTING_KEYS.selectedProfileId);
    else
      this.storage.setString(
        SETTING_KEYS.selectedProfileId,
        settings.selectedProfileId,
      );
    this.storage.setBoolean(SETTING_KEYS.soundEnabled, settings.soundEnabled);
    this.storage.setBoolean(SETTING_KEYS.hapticEnabled, settings.hapticEnabled);
    this.storage.setBoolean(SETTING_KEYS.reducedMotion, settings.reducedMotion);
    this.storage.setBoolean(SETTING_KEYS.extendedTime, settings.extendedTime);
    this.listeners.forEach(listener => listener(settings));
  }
}
