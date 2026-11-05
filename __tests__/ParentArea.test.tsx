import React from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import App from '../src/app/App';
import { createDailySession } from '../src/domain/use-cases/createDailySession';
import { ParentGate } from '../src/domain/use-cases/ParentGate';
import { deleteParentProfile } from '../src/domain/use-cases/deleteParentProfile';
import { initializeDatabase } from '../src/infrastructure/database/initializeDatabase';
import { NodeSqliteDriver } from '../src/infrastructure/database/testing/NodeSqliteDriver';
import { AppSettingsStore } from '../src/infrastructure/storage/AppSettingsStore';
import { InMemoryKeyValueStore } from '../src/infrastructure/storage/InMemoryKeyValueStore';

const clock = {
  now: () => '2026-11-05T12:00:00.000Z',
  localDate: () => '2026-11-05',
};
afterEach(() => jest.restoreAllMocks());

test('gate changes challenges and persists a three-failure lockout across recreation', () => {
  const storage = new InMemoryKeyValueStore();
  let now = Date.parse(clock.now());
  const gateClock = { ...clock, now: () => new Date(now).toISOString() };
  const store = new AppSettingsStore(storage);
  const gate = new ParentGate(store, gateClock, () => 0);
  expect(gate.submit('29')).toBe('unlocked'); // (12 * 3) - 7
  gate.lock();
  expect(gate.unlocked).toBe(false);
  expect(gate.submit('29')).toBe('incorrect'); // Reusing the old answer fails.
  expect(gate.submit('')).toBe('incorrect');
  expect(gate.submit('not a number')).toBe('locked');
  const reopened = new ParentGate(
    new AppSettingsStore(storage),
    gateClock,
    () => 0,
  );
  expect(reopened.waitSeconds).toBe(30);
  expect(reopened.submit('29')).toBe('locked');
  now += 30000;
  expect(reopened.waitSeconds).toBe(0);
  expect(reopened.submit('29')).toBe('unlocked');
  expect(store.getParentGateState()).toEqual({ failures: 0, lockedUntil: 0 });
});

test('malformed persisted gate status fails closed', () => {
  const storage = new InMemoryKeyValueStore();
  storage.setString('parent.gate', '{broken');
  const gate = new ParentGate(new AppSettingsStore(storage), clock, () => 0);
  expect(() => gate.submit('29')).toThrow();
  expect(gate.unlocked).toBe(false);
});

async function setup() {
  const database = new NodeSqliteDriver();
  const repositories = await initializeDatabase(clock, database);
  await repositories.questions.prepareContent();
  for (const id of ['p', 'other'])
    await repositories.childProfiles.create({
      id,
      displayName: 'Nova',
      age: 9,
      ageBand: 'EXPLORER_7_9',
      createdAt: clock.now(),
    });
  const storage = new InMemoryKeyValueStore();
  const settings = new AppSettingsStore(storage);
  settings.set({
    ...settings.get(),
    selectedProfileId: 'p',
    onboardingCompleted: true,
  });
  const services = { ...repositories, settings, clock };
  const questionRows = await database.query(
    "SELECT question_id FROM questions WHERE category='SCIENCE' LIMIT 1",
  );
  const question = await repositories.questions.getQuestion(
    String(questionRows[0]?.question_id),
  );
  if (!question) throw new Error('Missing science fixture');
  for (let index = 0; index < 6; index++) {
    const sessionId = `parent-session-${index}`;
    await services.sessions.create({
      id: sessionId,
      profileId: 'p',
      mode: 'CATEGORY_PRACTICE',
      questionIds: [question.id],
      seed: index,
      contentVersion: 1,
      localDate: null,
      createdAt: clock.now(),
    });
    const answerId =
      index === 0
        ? question.correctOptionId
        : question.options.find(
            option => option.id !== question.correctOptionId,
          )!.id;
    await services.sessions.recordAnswer({
      sessionId,
      questionId: question.id,
      answerId,
      durationMs: 3000,
    });
    if (index < 5) await services.sessions.complete(sessionId);
  }
  return { database, services, settings, storage, repositories };
}

test('profile deletion requires the gate, preserves data on SQLite failure, then cascades only the selected profile', async () => {
  const { database, services } = await setup();
  const gate = new ParentGate(services.settings, clock, () => 0);
  try {
    await expect(deleteParentProfile(services, gate, 'p')).rejects.toThrow(
      'Parent gate required',
    );
    gate.submit('29');
    const child = await services.childProfiles.get('p');
    const other = await services.childProfiles.get('other');
    if (!child || !other) throw new Error('Missing profiles');
    const daily = await createDailySession(services, child);
    const otherDaily = await createDailySession(services, other);
    if (daily.kind !== 'ready' || otherDaily.kind !== 'ready')
      throw new Error('Daily fixtures unavailable');
    const generatedIds =
      daily.session.plan.items
        ?.filter(item => item.generated)
        .map(item => item.id) ?? [];
    const otherIds =
      otherDaily.session.plan.items
        ?.filter(item => item.generated)
        .map(item => item.id) ?? [];
    expect(generatedIds).toHaveLength(5);
    await database.execute(
      "CREATE TRIGGER reject_profile_delete BEFORE DELETE ON child_profiles BEGIN SELECT RAISE(ABORT, 'write failed'); END",
    );
    await expect(deleteParentProfile(services, gate, 'p')).rejects.toThrow();
    expect(
      (await services.progress.getSummary('p')).categories[0]?.answered,
    ).toBe(6);
    expect(services.settings.get().selectedProfileId).toBe('p');
    await database.execute('DROP TRIGGER reject_profile_delete');
    await database.execute(
      "CREATE TRIGGER reject_generated_delete BEFORE DELETE ON questions BEGIN SELECT RAISE(ABORT, 'cleanup failed'); END",
    );
    await expect(deleteParentProfile(services, gate, 'p')).rejects.toThrow();
    expect(await services.childProfiles.get('p')).not.toBeNull();
    expect((await services.progress.getSummary('p')).completedSessions).toBe(5);
    await database.execute('DROP TRIGGER reject_generated_delete');
    await deleteParentProfile(services, gate, 'p');
    for (const table of [
      'child_profiles',
      'attempts',
      'sessions',
      'progress',
      'earned_badges',
    ]) {
      expect(
        (
          await database.query(
            `SELECT COUNT(*) total FROM ${table} WHERE profile_id=?`,
            ['p'],
          )
        )[0]?.total,
      ).toBe(0);
    }
    for (const id of generatedIds)
      expect(await services.questions.getQuestion(id)).toBeNull();
    for (const id of otherIds)
      expect(await services.questions.getQuestion(id)).not.toBeNull();
    expect(await services.childProfiles.get('other')).not.toBeNull();
    expect((await services.badges.list()).length).toBe(7);
    expect(
      (await database.query('SELECT COUNT(*) total FROM questions'))[0]?.total,
    ).toBeGreaterThan(0);
    expect(services.settings.get()).toMatchObject({
      selectedProfileId: null,
      onboardingCompleted: false,
    });
    expect(gate.unlocked).toBe(false);
  } finally {
    await database.close();
  }
});

test('retry completes selection cleanup if settings fail after SQLite deletion', async () => {
  const { database, services, settings } = await setup();
  const gate = new ParentGate(settings, clock, () => 0);
  gate.submit('29');
  const write = jest.spyOn(settings, 'set').mockImplementationOnce(() => {
    throw new Error('settings unavailable');
  });
  try {
    await expect(deleteParentProfile(services, gate, 'p')).rejects.toThrow();
    expect(await services.childProfiles.get('p')).toBeNull();
    await deleteParentProfile(services, gate, 'p');
    expect(settings.get().selectedProfileId).toBeNull();
    expect(write).toHaveBeenCalledTimes(2);
  } finally {
    await database.close();
  }
});

test('protected report, settings, background relock and confirmed deletion return to onboarding', async () => {
  const { database, services, settings, storage, repositories } = await setup();
  const listeners = new Set<(state: AppStateStatus) => void>();
  AppState.currentState = 'active';
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((event, callback) => {
      const listener = callback as (state: AppStateStatus) => void;
      if (event === 'change') listeners.add(listener);
      return {
        remove: () => {
          listeners.delete(listener);
        },
      };
    });
  const view = await render(
    <App
      bootstrapDependencies={{
        clock,
        settings,
        initialize: async () => repositories,
      }}
    />,
  );
  async function unlock() {
    const label = String(
      view.getByLabelText(/^Calculate /).props.accessibilityLabel,
    );
    const parts = label.match(/(\d+) times (\d+)\) minus (\d+)/);
    if (!parts) throw new Error('Missing arithmetic challenge');
    await fireEvent.changeText(
      view.getByLabelText('Adult answer'),
      String(Number(parts[1]) * Number(parts[2]) - Number(parts[3])),
    );
    await fireEvent.press(
      view.getByRole('button', { name: 'Open Parent area' }),
    );
  }
  try {
    await view.findByText('Hi, Nova!');
    await fireEvent.press(view.getByRole('button', { name: 'Parent area' }));
    expect(await view.findByText('For parents and carers')).toBeOnTheScreen();
    expect(view.queryByText('Privacy and local data')).toBeNull();
    await unlock();
    expect(
      await view.findByText('5 completed sessions · 6 answers'),
    ).toBeOnTheScreen();
    expect(
      view.getByText('Recorded answer time: 0 min 18 sec'),
    ).toBeOnTheScreen();
    expect(view.getByText('Science: 1 of 6 correct')).toBeOnTheScreen();
    await fireEvent(
      view.getByLabelText('Extra memory time'),
      'valueChange',
      true,
    );
    await fireEvent(view.getByLabelText('Reduce motion'), 'valueChange', true);
    await fireEvent.press(view.getByRole('button', { name: 'Save settings' }));
    expect(new AppSettingsStore(storage).get()).toMatchObject({
      extendedTime: true,
      reducedMotion: true,
    });
    await act(async () => {
      for (const listener of listeners) listener('background');
    });
    expect(view.queryByText('Privacy and local data')).toBeNull();
    expect(view.getByText('For parents and carers')).toBeOnTheScreen();
    await unlock();
    await view.findByText('5 completed sessions · 6 answers');
    await fireEvent.press(
      view.getByRole('button', { name: 'Delete profile and history' }),
    );
    await fireEvent.press(view.getByRole('button', { name: 'Keep profile' }));
    expect(await services.childProfiles.get('p')).not.toBeNull();
    await fireEvent.press(
      view.getByRole('button', { name: 'Delete profile and history' }),
    );
    await fireEvent.press(
      view.getByRole('button', { name: 'Permanently delete profile' }),
    );
    expect(await view.findByText('Welcome to BrainQuest')).toBeOnTheScreen();
    expect(view.queryByText('Privacy and local data')).toBeNull();
    expect(await services.childProfiles.get('p')).toBeNull();
    expect(settings.get()).toMatchObject({
      selectedProfileId: null,
      onboardingCompleted: false,
      extendedTime: true,
    });
  } finally {
    await view.unmount();
    await database.close();
  }
});
