import React from 'react';
import { AppState, Text, type AppStateStatus } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { MemoryActivity } from '../src/features/game/MemoryActivity';
import { GameScreen } from '../src/features/game/GameScreen';
import { memoryObjectsGenerator } from '../src/domain/puzzles';
import { initializeDatabase } from '../src/infrastructure/database/initializeDatabase';
import { NodeSqliteDriver } from '../src/infrastructure/database/testing/NodeSqliteDriver';
import { AppSettingsStore } from '../src/infrastructure/storage/AppSettingsStore';
import { InMemoryKeyValueStore } from '../src/infrastructure/storage/InMemoryKeyValueStore';
import { createDailySession } from '../src/domain/use-cases/createDailySession';

beforeEach(() => {
  AppState.currentState = 'active';
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test('memory pauses in background and removes objects from the rendered tree before asking', async () => {
  jest.useFakeTimers();
  let listener: (state: AppStateStatus) => void = () => undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, callback) => {
    listener = callback;
    return { remove: jest.fn() };
  });
  const question = memoryObjectsGenerator.generate(123, 'EASY');
  const clock = {
    now: () => new Date().toISOString(),
    localDate: () => '2026-09-28',
  };
  const view = await render(
    <MemoryActivity
      question={question}
      ageBand="EXPLORER_7_9"
      extendedTime={false}
      clock={clock}
      answered={false}
    >
      <Text>Answer controls</Text>
    </MemoryActivity>,
  );
  expect(view.queryByText('Answer controls')).toBeNull();
  await fireEvent.press(
    view.getByRole('button', { name: 'Start remembering' }),
  );
  const objects =
    question.presentation.kind === 'MEMORY_OBJECTS'
      ? question.presentation.objects
      : [];
  for (const [index, object] of objects.entries())
    expect(view.getByText(`${index + 1}. ${object.label}`)).toBeOnTheScreen();
  await act(async () => {
    jest.advanceTimersByTime(3000);
    listener('background');
    jest.advanceTimersByTime(60000);
  });
  expect(view.queryByRole('button', { name: 'Show the question' })).toBeNull();
  await act(async () => {
    listener('active');
    jest.advanceTimersByTime(5000);
  });
  for (const [index, object] of objects.entries())
    expect(view.queryByText(`${index + 1}. ${object.label}`)).toBeNull();
  expect(view.queryByText('Answer controls')).toBeNull();
  await fireEvent.press(
    view.getByRole('button', { name: 'Show the question' }),
  );
  expect(view.getByText('Answer controls')).toBeOnTheScreen();
  await view.unmount();
});

test('plays all ten activities, shows wrong-answer feedback and reopens the saved result', async () => {
  const database = new NodeSqliteDriver();
  let now = Date.parse('2026-09-28T12:00:00.000Z');
  const clock = {
    now: () => new Date(now).toISOString(),
    localDate: () => '2026-09-28',
  };
  const repositories = await initializeDatabase(clock, database);
  await repositories.questions.prepareContent();
  const profile = await repositories.childProfiles.create({
    id: 'p',
    displayName: 'Nova',
    age: 9,
    ageBand: 'EXPLORER_7_9',
    createdAt: clock.now(),
  });
  const services = {
    ...repositories,
    clock,
    settings: new AppSettingsStore(new InMemoryKeyValueStore()),
  };
  const prepared = await createDailySession(services, profile);
  if (prepared.kind !== 'ready') throw new Error('Expected daily plan');
  const session = prepared.session;
  const complete = jest.fn();
  let view = await render(
    <GameScreen
      services={services}
      sessionId={session.plan.id}
      onComplete={complete}
    />,
  );
  try {
    await waitFor(() =>
      expect(view.getByText('Question 1 of 10')).toBeOnTheScreen(),
    );
    for (const [index, item] of session.plan.items!.entries()) {
      if (item.type === 'MEMORY') {
        expect(view.queryByText(item.prompt)).toBeNull();
        await fireEvent.press(
          view.getByRole('button', { name: 'Start remembering' }),
        );
        now += 8000;
        await waitFor(() =>
          expect(
            view.getByRole('button', { name: 'Show the question' }),
          ).toBeOnTheScreen(),
        );
        await fireEvent.press(
          view.getByRole('button', { name: 'Show the question' }),
        );
      }
      const option = item.options.find(o =>
        index === 0
          ? o.id !== item.correctOptionId
          : o.id === item.correctOptionId,
      )!;
      expect(view.getByRole('button', { name: 'Check answer' })).toBeDisabled();
      await fireEvent.press(
        view.getByRole('button', { name: `Answer: ${option.text}` }),
      );
      expect(
        view.getByRole('button', { name: `Answer: ${option.text}` }),
      ).toBeSelected();
      await fireEvent.press(view.getByRole('button', { name: 'Check answer' }));
      const next = index === 9 ? 'See my result' : 'Continue';
      await waitFor(() =>
        expect(view.getByRole('button', { name: next })).toBeOnTheScreen(),
      );
      expect(
        view.getByRole('button', {
          name: `Answer: ${option.text}, ${
            index === 0 ? 'incorrect' : 'correct'
          } answer`,
        }),
      ).toBeDisabled();
      if (index === 0)
        expect(view.getByText(/The correct answer is/)).toBeOnTheScreen();
      else expect(view.getByText('Correct! Nicely done.')).toBeOnTheScreen();
      await fireEvent.press(view.getByRole('button', { name: next }));
      if (index < 9)
        await waitFor(() =>
          expect(
            view.getByText(`Question ${index + 2} of 10`),
          ).toBeOnTheScreen(),
        );
    }
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(1));
    expect(complete.mock.calls[0]![0]).toMatchObject({
      itemCount: 10,
      correctCount: 9,
    });
    const progress = await services.progress.get(profile.id);
    expect(progress.currentStreak).toBe(1);
    await view.unmount();
    view = await render(
      <GameScreen
        services={services}
        sessionId={session.plan.id}
        onComplete={complete}
      />,
    );
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(2));
    expect((await services.progress.get(profile.id)).xp).toBe(progress.xp);
  } finally {
    await view.unmount();
    await database.close();
  }
});
