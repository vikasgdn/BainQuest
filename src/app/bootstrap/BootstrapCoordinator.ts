import type { Clock } from '@/shared/Clock';
import type { AppSettingsStore } from '@/infrastructure/storage/AppSettingsStore';
import type { initializeDatabase } from '@/infrastructure/database/initializeDatabase';
import type { AppServices, BootstrapState, UiError } from './types';

export type BootstrapDependencies = Readonly<{
  clock: Clock;
  settings: AppSettingsStore;
  initialize: typeof initializeDatabase;
}>;

export async function bootstrapApplication(
  dependencies: BootstrapDependencies,
): Promise<{ state: BootstrapState; services?: AppServices }> {
  try {
    const database = await dependencies.initialize(dependencies.clock);
    const content = await database.questions.prepareContent();
    if (content.kind === 'error') {
      const error: UiError = {
        code: 'CONTENT_IMPORT_FAILED',
        message: content.reason,
        retryable: content.retryable,
      };
      return { state: { status: 'error', error } };
    }

    const settings = dependencies.settings.get();
    let profileId = settings.selectedProfileId;
    if (
      profileId !== null &&
      (await database.childProfiles.get(profileId)) === null
    ) {
      profileId = null;
      dependencies.settings.set({
        ...settings,
        selectedProfileId: null,
        onboardingCompleted: false,
      });
    }
    const ready =
      settings.onboardingCompleted && profileId !== null ? profileId : null;
    return {
      state: { status: 'ready', profileId: ready },
      services: {
        ...database,
        settings: dependencies.settings,
        clock: dependencies.clock,
      },
    };
  } catch (cause) {
    return {
      state: {
        status: 'error',
        error: {
          code: 'BOOTSTRAP_FAILED',
          message:
            cause instanceof Error
              ? cause.message
              : 'Unable to start BrainQuest.',
          retryable: true,
        },
      },
    };
  }
}
