import type { Clock } from '@/shared/Clock';
import { initializeDatabase } from '@/infrastructure/database/initializeDatabase';
import { AppSettingsStore } from '@/infrastructure/storage/AppSettingsStore';
import type { BootstrapDependencies } from './BootstrapCoordinator';

export const systemClock: Clock = {
  now: () => new Date().toISOString(),
  localDate: () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
};

export function createDefaultBootstrapDependencies(): BootstrapDependencies {
  const { MmkvKeyValueStore } =
    require('@/infrastructure/storage/MmkvKeyValueStore') as typeof import('@/infrastructure/storage/MmkvKeyValueStore');
  return {
    clock: systemClock,
    settings: new AppSettingsStore(new MmkvKeyValueStore()),
    initialize: initializeDatabase,
  };
}
