/** Future MMKV adapter implements this contract; no native storage is installed. */
export interface KeyValueStore {
  getString(key: string): string | undefined;
  setString(key: string, value: string): void;
  getBoolean(key: string): boolean | undefined;
  setBoolean(key: string, value: boolean): void;
  remove(key: string): void;
}

export const SETTING_KEYS = {
  onboardingCompleted: 'settings.onboardingCompleted',
  selectedProfileId: 'settings.selectedProfileId',
  soundEnabled: 'settings.soundEnabled',
  hapticEnabled: 'settings.hapticEnabled',
  reducedMotion: 'settings.reducedMotion',
  extendedTime: 'settings.extendedTime',
} as const;
