import { bootstrapApplication } from '@/app/bootstrap/BootstrapCoordinator';
import { AppSettingsStore } from '@/infrastructure/storage/AppSettingsStore';
import { InMemoryKeyValueStore } from '@/infrastructure/storage/InMemoryKeyValueStore';
const clock = {
  now: () => '2026-09-22T00:00:00.000Z',
  localDate: () => '2026-09-22',
};
function settingsStore() {
  return new AppSettingsStore(new InMemoryKeyValueStore());
}
function dependencies() {
  const settings = settingsStore();
  return {
    clock,
    settings,
    initialize: async () =>
      ({
        questions: {
          prepareContent: async () => ({
            kind: 'ready' as const,
            contentVersion: 1,
            importedCount: 0,
          }),
        },
        childProfiles: { get: async () => null },
      } as never),
  };
}
test('routes a new install to onboarding', async () => {
  expect((await bootstrapApplication(dependencies())).state).toEqual({
    status: 'ready',
    profileId: null,
  });
});
test('routes to Home only when preferences and profile exist', async () => {
  const settings = settingsStore();
  settings.set({
    onboardingCompleted: true,
    selectedProfileId: 'p',
    soundEnabled: true,
    hapticEnabled: true,
    reducedMotion: false,
    extendedTime: false,
  });
  const result = await bootstrapApplication({
    clock,
    settings,
    initialize: async () =>
      ({
        questions: {
          prepareContent: async () => ({
            kind: 'ready' as const,
            contentVersion: 1,
            importedCount: 0,
          }),
        },
        childProfiles: { get: async () => ({ id: 'p' }) },
      } as never),
  });
  expect(result.state).toEqual({ status: 'ready', profileId: 'p' });
});
test('returns retryable startup errors', async () => {
  const result = await bootstrapApplication({
    ...dependencies(),
    initialize: async () => {
      throw new Error('database unavailable');
    },
  });
  expect(result.state).toMatchObject({
    status: 'error',
    error: { code: 'BOOTSTRAP_FAILED', retryable: true },
  });
});
test('returns non-retryable content errors', async () => {
  const result = await bootstrapApplication({
    ...dependencies(),
    initialize: async () =>
      ({
        questions: {
          prepareContent: async () => ({
            kind: 'error' as const,
            reason: 'invalid content',
            retryable: false,
          }),
        },
        childProfiles: { get: async () => null },
      } as never),
  });
  expect(result.state).toMatchObject({
    status: 'error',
    error: { code: 'CONTENT_IMPORT_FAILED', retryable: false },
  });
});
