import React from 'react';
import { AccessibilityInfo, Text } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { useReducedMotion } from '../src/app/useReducedMotion';
import { AppSettingsStore } from '../src/infrastructure/storage/AppSettingsStore';
import { InMemoryKeyValueStore } from '../src/infrastructure/storage/InMemoryKeyValueStore';
import { initializeDatabase } from '../src/infrastructure/database/initializeDatabase';
import { NodeSqliteDriver } from '../src/infrastructure/database/testing/NodeSqliteDriver';
import { createDailySession } from '../src/domain/use-cases/createDailySession';

afterEach(() => jest.restoreAllMocks());

test('system reduced motion stays enabled when the app preference is off and reacts to changes', async () => {
  const settings = new AppSettingsStore(new InMemoryKeyValueStore());
  let systemChanged: (value: boolean) => void = () => undefined;
  jest
    .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
    .mockResolvedValue(true);
  jest
    .spyOn(AccessibilityInfo, 'addEventListener')
    .mockImplementation((event, callback) => {
      if (event === 'reduceMotionChanged')
        systemChanged = callback as (value: boolean) => void;
      return { remove: jest.fn() };
    });
  function Probe() {
    return (
      <Text>
        {useReducedMotion(settings) ? 'Motion reduced' : 'Motion enabled'}
      </Text>
    );
  }
  const view = await render(<Probe />);
  try {
    expect(await view.findByText('Motion reduced')).toBeOnTheScreen();
    await act(async () =>
      settings.set({ ...settings.get(), reducedMotion: true }),
    );
    await act(async () => systemChanged(false));
    expect(view.getByText('Motion reduced')).toBeOnTheScreen();
    await act(async () =>
      settings.set({ ...settings.get(), reducedMotion: false }),
    );
    expect(view.getByText('Motion enabled')).toBeOnTheScreen();
    await act(async () => systemChanged(true));
    expect(view.getByText('Motion reduced')).toBeOnTheScreen();
  } finally {
    await view.unmount();
  }
});

test('extra time applies to a new daily round and changing it preserves an existing plan', async () => {
  const database = new NodeSqliteDriver();
  let date = '2026-11-05';
  const clock = { now: () => `${date}T12:00:00.000Z`, localDate: () => date };
  const repositories = await initializeDatabase(clock, database);
  const settings = new AppSettingsStore(new InMemoryKeyValueStore());
  const services = { ...repositories, settings, clock };
  try {
    await services.questions.prepareContent();
    const profile = await services.childProfiles.create({
      id: 'p',
      displayName: 'Nova',
      age: 9,
      ageBand: 'EXPLORER_7_9',
      createdAt: clock.now(),
    });
    settings.set({
      ...settings.get(),
      selectedProfileId: 'p',
      extendedTime: true,
    });
    const first = await createDailySession(services, profile);
    expect(first.kind === 'ready' && first.session.plan.extendedTime).toBe(
      true,
    );
    settings.set({ ...settings.get(), extendedTime: false });
    const resumed = await createDailySession(services, profile);
    expect(resumed).toEqual(first);
    date = '2026-11-06';
    const next = await createDailySession(services, profile);
    expect(next.kind === 'ready' && next.session.plan.extendedTime).toBe(false);
  } finally {
    await database.close();
  }
});
