import type { Clock } from '@/shared/Clock';
import type { initializeDatabase } from '@/infrastructure/database/initializeDatabase';
import type { AppSettingsStore } from '@/infrastructure/storage/AppSettingsStore';
import type { AppServices as SharedAppServices } from '@/shared/AppServices';

export type UiError = Readonly<{
  code: 'BOOTSTRAP_FAILED' | 'CONTENT_IMPORT_FAILED' | 'UNKNOWN';
  message: string;
  retryable: boolean;
}>;

export type BootstrapState =
  | Readonly<{ status: 'idle' }>
  | Readonly<{ status: 'initializing' }>
  | Readonly<{ status: 'ready'; profileId: string | null }>
  | Readonly<{ status: 'error'; error: UiError }>;

export type AppServices = Omit<
  Awaited<ReturnType<typeof initializeDatabase>>,
  'settings'
> &
  SharedAppServices & { settings: AppSettingsStore; clock: Clock };
