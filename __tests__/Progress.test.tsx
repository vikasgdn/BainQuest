import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent, render } from '@testing-library/react-native';
import { initializeDatabase } from '../src/infrastructure/database/initializeDatabase';
import { NodeSqliteDriver } from '../src/infrastructure/database/testing/NodeSqliteDriver';
import { AppSettingsStore } from '../src/infrastructure/storage/AppSettingsStore';
import { InMemoryKeyValueStore } from '../src/infrastructure/storage/InMemoryKeyValueStore';
import { ProgressScreen } from '../src/features/progress/ProgressScreen';
import type { AppServices } from '../src/shared/AppServices';

async function setup() {
  const database = new NodeSqliteDriver();
  const clock = {
    now: () => '2026-11-05T12:00:00.000Z',
    localDate: () => '2026-11-05',
  };
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
  const settings = new AppSettingsStore(new InMemoryKeyValueStore());
  settings.set({ ...settings.get(), selectedProfileId: 'p' });
  return { database, services: { ...repositories, clock, settings } };
}

test('lifetime statistics exceed adaptation limit, isolate profiles and limit completed history', async () => {
  const { database, services } = await setup();
  try {
    const rows = await database.query(
      "SELECT question_id FROM questions WHERE category='SCIENCE' LIMIT 1",
    );
    const questionId = String(rows[0]?.question_id);
    for (let index = 0; index < 205; index++) {
      const sessionId = `session-${index}`;
      await services.sessions.create({
        id: sessionId,
        profileId: 'p',
        mode: 'CATEGORY_PRACTICE',
        questionIds: [questionId],
        seed: index,
        contentVersion: 1,
        localDate: null,
        createdAt: services.clock.now(),
      });
      const question = await services.questions.getQuestion(questionId);
      await services.sessions.recordAnswer({
        sessionId,
        questionId,
        answerId: question!.correctOptionId,
        durationMs: 1000,
      });
      if (index < 21) await services.sessions.complete(sessionId);
    }
    const summary = await services.progress.getSummary('p');
    expect(summary.categories).toEqual([
      { category: 'SCIENCE', answered: 205, correct: 205 },
    ]);
    expect(await services.attempts.listForProfile('p')).toHaveLength(200);
    expect(summary.completedSessions).toBe(21);
    expect(summary.recentSessions).toHaveLength(20);
    expect(summary.recentSessions[0]?.sessionId).toBe('session-20');
    expect(summary.progress.earnedBadges.map(badge => badge.code)).toContain(
      'FIRST_STEPS',
    );
    await services.sessions.complete('session-20');
    expect(await services.progress.getSummary('p')).toEqual(summary);
    const other = await services.progress.getSummary('other');
    expect(other.categories).toEqual([]);
    expect(other.completedSessions).toBe(0);
    expect(other.progress.xp).toBe(0);
    const view = await show(services);
    try {
      expect(
        await view.findByText('21 completed sessions · 205 answers'),
      ).toBeOnTheScreen();
      expect(
        view.getByText('205 of 205 correct · 100% accuracy'),
      ).toBeOnTheScreen();
      expect(
        view.getByText(`${summary.progress.xp} total XP`),
      ).toBeOnTheScreen();
      expect(view.getAllByText(/^Earned /).length).toBeGreaterThan(0);
    } finally {
      await view.unmount();
    }
  } finally {
    await database.close();
  }
});

const Stack = createNativeStackNavigator();
async function show(services: AppServices) {
  return render(
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Progress">
          {() => <ProgressScreen services={services} onHome={jest.fn()} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

test('empty progress shows honest states and badge requirements; failed reads can retry', async () => {
  const { database, services } = await setup();
  const read = jest
    .spyOn(services.progress, 'getSummary')
    .mockRejectedValueOnce(new Error('unavailable'));
  const view = await show(services);
  try {
    expect(await view.findByText('Progress couldn’t load')).toBeOnTheScreen();
    await fireEvent.press(view.getByRole('button', { name: 'Try again' }));
    expect(
      await view.findByText('0 completed sessions · 0 answers'),
    ).toBeOnTheScreen();
    expect(
      view.getByText(
        'Complete a round to see it here. Every small step counts.',
      ),
    ).toBeOnTheScreen();
    expect(view.getByText('400 XP to level 2')).toBeOnTheScreen();
    await fireEvent.press(
      view.getByRole('button', { name: 'View First Steps details' }),
    );
    expect(view.getByText('Complete your first session.')).toBeOnTheScreen();
    expect(read).toHaveBeenCalledTimes(2);
  } finally {
    await view.unmount();
    await database.close();
  }
});
