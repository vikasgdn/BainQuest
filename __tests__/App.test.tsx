import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import App from '@/app/App';
import { initializeDatabase } from '@/infrastructure/database/initializeDatabase';
import { NodeSqliteDriver } from '@/infrastructure/database/testing/NodeSqliteDriver';
import { AppSettingsStore } from '@/infrastructure/storage/AppSettingsStore';
import { InMemoryKeyValueStore } from '@/infrastructure/storage/InMemoryKeyValueStore';
import type { Clock } from '@/shared/Clock';
const clock = {
  now: () => '2026-09-22T00:00:00.000Z',
  localDate: () => '2026-09-22',
};
test('routes a new install through onboarding and then to Home', async () => {
  const database = new NodeSqliteDriver();
  const settings = new AppSettingsStore(new InMemoryKeyValueStore());
  const bootstrapDependencies = {
    clock,
    settings,
    initialize: async (injectedClock: Clock) =>
      initializeDatabase(injectedClock, database),
  };
  const view = await render(
    <App bootstrapDependencies={bootstrapDependencies} />,
  );
  await waitFor(() =>
    expect(
      view.getByRole('header', { name: 'Welcome to BrainQuest' }),
    ).toBeOnTheScreen(),
  );
  await act(async () => {
    fireEvent.changeText(view.getByLabelText('Nickname'), 'Nova');
    fireEvent.changeText(view.getByLabelText('Age'), '9');
  });
  await act(async () => {
    fireEvent.press(view.getByRole('button', { name: 'Create my profile' }));
  });
  await waitFor(() =>
    expect(view.getByRole('header', { name: 'Hi, Nova!' })).toBeOnTheScreen(),
  );
  await database.close();
});
