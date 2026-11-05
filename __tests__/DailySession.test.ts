import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initializeDatabase } from '../src/infrastructure/database/initializeDatabase';
import { NodeSqliteDriver } from '../src/infrastructure/database/testing/NodeSqliteDriver';
import { AppSettingsStore } from '../src/infrastructure/storage/AppSettingsStore';
import { InMemoryKeyValueStore } from '../src/infrastructure/storage/InMemoryKeyValueStore';
import { createDailySession } from '../src/domain/use-cases/createDailySession';
import {
  ageBandForAge,
  allowedDifficulties,
} from '../src/domain/policies/AgeBandPolicy';
import { initialMcqRuntime } from '../src/domain/use-cases/mcqRuntime';
import type { AppServices } from '../src/shared/AppServices';
import type { ChildProfile, GameSession } from '../src/domain/models/types';

let date: string;
const clock = { now: () => `${date}T12:00:00.000Z`, localDate: () => date };
let database: NodeSqliteDriver;
let services: AppServices;
let profile: ChildProfile;
beforeEach(async () => {
  date = '2026-09-28';
  database = new NodeSqliteDriver();
  const repositories = await initializeDatabase(clock, database);
  await repositories.questions.prepareContent();
  services = {
    ...repositories,
    clock,
    settings: new AppSettingsStore(new InMemoryKeyValueStore()),
  };
  profile = {
    id: 'daily-child',
    displayName: 'Nova',
    age: 9,
    ageBand: 'EXPLORER_7_9',
    createdAt: clock.now(),
  };
  await services.childProfiles.create(profile);
});
afterEach(async () => {
  await database.close();
});
async function daily(): Promise<GameSession> {
  const result = await createDailySession(services, profile);
  if (result.kind !== 'ready') throw new Error('Expected a ready daily plan');
  return result.session;
}
async function answerAll(session: GameSession) {
  for (const item of session.plan.items ?? []) {
    await services.sessions.recordAnswer({
      sessionId: session.plan.id,
      questionId: item.id,
      answerId: item.correctOptionId,
      durationMs: 5000,
    });
  }
}

test.each([7, 9, 10, 12, 13, 14])(
  'composes ten distinct age-compatible activities for age %i',
  async age => {
    profile = { ...profile, age, ageBand: ageBandForAge(age) };
    await services.childProfiles.update(profile);
    const first = await daily();
    const items = first.plan.items!;
    expect(items.map(q => q.type)).toEqual([
      'MCQ',
      'MCQ',
      'MCQ',
      'PATTERN',
      'PATTERN',
      'PATTERN',
      'MEMORY',
      'MCQ',
      'MCQ',
      'PATTERN',
    ]);
    expect(new Set(items.map(q => q.prompt.toLowerCase())).size).toBe(10);
    expect(new Set(items.slice(0, 3).map(q => q.category)).size).toBe(3);
    expect(
      items.every(
        q =>
          q.ageMin <= age &&
          q.ageMax >= age &&
          allowedDifficulties(profile.ageBand).includes(q.difficulty),
      ),
    ).toBe(true);
    expect((await daily()).plan).toEqual(first.plan);
    const practice = await services.questions.selectQuestions({
      age,
      ageBand: profile.ageBand,
      count: 1,
      categories: ['LOGIC'],
      types: ['PATTERN'],
      allowedDifficulties: allowedDifficulties(profile.ageBand),
      recentQuestionIds: [],
      weakCategories: [],
      seed: 1,
    });
    if (practice.kind === 'selected')
      expect(practice.questions.every(q => !q.id.startsWith('daily-'))).toBe(
        true,
      );
  },
);

test('resumes saved snapshots after content changes, and records generator provenance', async () => {
  const session = await daily();
  const items = session.plan.items!;
  await database.execute(
    "UPDATE questions SET correct_option_id='changed', prompt='Changed prompt'",
  );
  await database.execute('UPDATE content_metadata SET content_version=99');
  for (const item of items.slice(0, 4)) {
    const answer = {
      sessionId: session.plan.id,
      questionId: item.id,
      answerId: item.correctOptionId,
      durationMs: 4000,
    };
    expect((await services.sessions.recordAnswer(answer)).attempt.correct).toBe(
      true,
    );
    expect(
      (await services.sessions.recordAnswer(answer)).alreadySubmitted,
    ).toBe(true);
  }
  const resumed = await daily();
  expect(resumed.plan).toEqual(session.plan);
  expect(resumed.attempts).toHaveLength(4);
  expect(resumed.attempts[3]).toMatchObject({
    generatorId: items[3]!.generated!.generatorId,
    generatorVersion: 1,
    seed: items[3]!.generated!.seed,
  });
  expect(initialMcqRuntime(items, resumed.attempts).index).toBe(4);
});

test('rejects early completion, foreign items, out-of-order answers and invalid options', async () => {
  const session = await daily();
  const item = session.plan.items![0]!;
  await expect(services.sessions.complete(session.plan.id)).rejects.toThrow(
    'Answer every question',
  );
  const answer = {
    sessionId: session.plan.id,
    questionId: item.id,
    answerId: item.correctOptionId,
    durationMs: 10,
  };
  await expect(
    services.sessions.recordAnswer({ ...answer, questionId: 'missing' }),
  ).rejects.toThrow('not in this session');
  await expect(
    services.sessions.recordAnswer({ ...answer, answerId: 'invalid' }),
  ).rejects.toThrow('Unknown answer');
  const second = session.plan.items![1]!;
  await expect(
    services.sessions.recordAnswer({
      ...answer,
      questionId: second.id,
      answerId: second.correctOptionId,
    }),
  ).rejects.toThrow('current question');
  await expect(
    services.sessions.recordAnswer({ ...answer, durationMs: NaN }),
  ).rejects.toThrow('Invalid answer duration');
  expect((await services.progress.get(profile.id)).xp).toBe(0);
});

test('completes once, resumes the final feedback and advances streak only once per completion date', async () => {
  const first = await daily();
  await answerAll(first);
  const resumed = await daily();
  expect(
    initialMcqRuntime(resumed.plan.items!, resumed.attempts),
  ).toMatchObject({ index: 9, status: 'feedback' });
  // Completing yesterday's saved plan after midnight counts on the actual completion day.
  date = '2026-09-29';
  const result = await services.sessions.complete(first.plan.id);
  expect(result.localDate).toBe(date);
  expect(await services.sessions.complete(first.plan.id)).toEqual(result);
  expect((await services.progress.get(profile.id)).xp).toBe(result.xpAwarded);
  const second = await daily();
  expect(second.plan.id).not.toBe(first.plan.id);
  await answerAll(second);
  await services.sessions.complete(second.plan.id);
  expect((await services.progress.get(profile.id)).currentStreak).toBe(1);
  date = '2026-09-30';
  const third = await daily();
  await answerAll(third);
  await services.sessions.complete(third.plan.id);
  expect((await services.progress.get(profile.id)).currentStreak).toBe(2);
  expect((await daily()).status).toBe('COMPLETED');
});

test('returns insufficient content without saving a partial plan', async () => {
  await database.execute(
    "UPDATE questions SET status='RETIRED' WHERE category='GK' OR category='SCIENCE'",
  );
  expect((await createDailySession(services, profile)).kind).toBe(
    'insufficient-content',
  );
  expect(await database.query('SELECT * FROM sessions')).toHaveLength(0);
});

test('restores the same plan and attempts after closing and reopening SQLite', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'brainquest-daily-'));
  const path = join(folder, 'test.sqlite');
  let disk = new NodeSqliteDriver(path);
  try {
    let repositories = await initializeDatabase(clock, disk);
    await repositories.questions.prepareContent();
    await repositories.childProfiles.create(profile);
    services = { ...services, ...repositories };
    const first = await daily();
    const item = first.plan.items![0]!;
    await services.sessions.recordAnswer({
      sessionId: first.plan.id,
      questionId: item.id,
      answerId: item.correctOptionId,
      durationMs: 5000,
    });
    await disk.close();
    disk = new NodeSqliteDriver(path);
    repositories = await initializeDatabase(clock, disk);
    services = { ...services, ...repositories };
    const resumed = await daily();
    expect(resumed.plan).toEqual(first.plan);
    expect(resumed.attempts).toHaveLength(1);
  } finally {
    await disk.close();
    rmSync(folder, { recursive: true, force: true });
  }
});

test('prioritizes a recent weak category in the later MCQ slots', async () => {
  const first = await daily();
  for (const item of first.plan.items!) {
    const answerId =
      item.category === 'SCIENCE'
        ? item.options.find(o => o.id !== item.correctOptionId)!.id
        : item.correctOptionId;
    await services.sessions.recordAnswer({
      sessionId: first.plan.id,
      questionId: item.id,
      answerId,
      durationMs: 5000,
    });
  }
  await services.sessions.complete(first.plan.id);
  date = '2026-09-29';
  const next = await daily();
  expect(next.plan.items![7]!.category).toBe('SCIENCE');
});

test('promotes puzzles one step after twenty successful logic attempts', async () => {
  for (const day of ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01']) {
    date = day;
    const session = await daily();
    expect(
      session.plan
        .items!.filter(q => q.generated)
        .every(q => q.difficulty === 'EASY'),
    ).toBe(true);
    await answerAll(session);
    await services.sessions.complete(session.plan.id);
  }
  date = '2026-10-02';
  const promoted = await daily();
  expect(
    promoted.plan
      .items!.filter(q => q.generated)
      .every(q => q.difficulty === 'MEDIUM'),
  ).toBe(true);
});

test('rolls back completion and rewards together on a persistence failure', async () => {
  const session = await daily();
  await answerAll(session);
  await database.execute(
    "CREATE TRIGGER fail_progress BEFORE UPDATE ON progress BEGIN SELECT RAISE(ABORT, 'test write failure'); END",
  );
  await expect(services.sessions.complete(session.plan.id)).rejects.toThrow();
  expect((await services.sessions.get(session.plan.id))!.status).toBe(
    'IN_PROGRESS',
  );
  expect((await services.progress.get(profile.id)).xp).toBe(0);
  expect(await services.badges.listEarned(profile.id)).toHaveLength(0);
  await database.execute('DROP TRIGGER fail_progress');
  await services.sessions.complete(session.plan.id);
  expect((await services.progress.get(profile.id)).currentStreak).toBe(1);
});
