import type { Clock } from '../src/shared/Clock';
import type { SessionPlan } from '../src/domain/models/types';
import {
  migrateDatabase,
  type Migration,
} from '../src/infrastructure/database/migrations/MigrationRunner';
import { NodeSqliteDriver } from '../src/infrastructure/database/testing/NodeSqliteDriver';
import { ChildProfileSqlRepository } from '../src/infrastructure/database/repositories/ChildProfileSqlRepository';
import { AttemptSqlRepository } from '../src/infrastructure/database/repositories/AttemptSqlRepository';
import { BadgeSqlRepository } from '../src/infrastructure/database/repositories/BadgeSqlRepository';
import { ProgressSqlRepository } from '../src/infrastructure/database/repositories/ProgressSqlRepository';
import { SessionSqlRepository } from '../src/infrastructure/database/repositories/SessionSqlRepository';
import { QuestionSqlRepository } from '../src/infrastructure/database/repositories/QuestionSqlRepository';
import { ContentImporter } from '../src/infrastructure/content/ContentImporter';
import questions from '../src/assets/content/questions_v1.json';

const clock: Clock = {
  now: () => '2026-09-22T10:00:00.000Z',
  localDate: () => '2026-09-22',
};

async function setup() {
  const database = new NodeSqliteDriver();
  await migrateDatabase(database);
  return database;
}

describe('SQLite schema and migrations', () => {
  it('creates version 1 tables, indexes, seed badges and enables foreign keys', async () => {
    const database = await setup();
    const tables = await database.query(
      "SELECT name FROM sqlite_master WHERE type='table'",
    );
    expect(tables.map(row => row.name)).toEqual(
      expect.arrayContaining([
        'child_profiles',
        'questions',
        'attempts',
        'sessions',
        'progress',
        'badges',
        'earned_badges',
        'content_metadata',
      ]),
    );
    const indexes = await database.query(
      "SELECT name FROM sqlite_master WHERE type='index'",
    );
    expect(indexes.map(row => row.name)).toEqual(
      expect.arrayContaining([
        'idx_questions_selection',
        'idx_attempts_profile_time',
        'idx_attempts_question',
        'idx_attempts_session',
        'idx_sessions_profile_completed',
      ]),
    );
    expect((await database.query('PRAGMA user_version'))[0]?.user_version).toBe(
      1,
    );
    expect((await database.query('PRAGMA foreign_keys'))[0]?.foreign_keys).toBe(
      1,
    );
    expect(await new BadgeSqlRepository(database).list()).toHaveLength(7);
    await database.close();
  });

  it('commits successful transactions and rolls back failures', async () => {
    const database = await setup();
    await database.transaction(async tx => {
      await tx.execute(
        "INSERT INTO child_profiles VALUES ('p','P',9,'EXPLORER_7_9',0)",
      );
    });
    await expect(
      database.transaction(async tx => {
        await tx.execute(
          "INSERT INTO child_profiles VALUES ('q','Q',9,'EXPLORER_7_9',0)",
        );
        throw new Error('stop');
      }),
    ).rejects.toThrow('stop');
    expect(
      await database.query(
        'SELECT profile_id FROM child_profiles ORDER BY profile_id',
      ),
    ).toEqual([{ profile_id: 'p' }]);
    await database.close();
  });

  it('rolls back a failed migration and maps initialization failure', async () => {
    const database = new NodeSqliteDriver();
    const migrations: readonly Migration[] = [
      {
        version: 1,
        async up(executor) {
          await executor.execute('CREATE TABLE safe_table (id INTEGER)');
          throw new Error('migration failed');
        },
      },
    ];
    await expect(migrateDatabase(database, migrations)).rejects.toMatchObject({
      code: 'INITIALIZATION_FAILED',
    });
    expect(
      await database.query(
        "SELECT name FROM sqlite_master WHERE name='safe_table'",
      ),
    ).toEqual([]);
    expect((await database.query('PRAGMA user_version'))[0]?.user_version).toBe(
      0,
    );
    await database.close();
  });
});

describe('repositories and relational behavior', () => {
  it('creates, reads, updates, lists and cascade-deletes a profile', async () => {
    const database = await setup();
    const repository = new ChildProfileSqlRepository(database);
    const profile = {
      id: 'p1',
      displayName: 'Nova',
      age: 9,
      ageBand: 'EXPLORER_7_9' as const,
      createdAt: '2026-09-22T00:00:00.000Z',
    };
    await repository.create(profile);
    expect(await repository.get('p1')).toEqual(profile);
    expect(await repository.list()).toEqual([profile]);
    expect(
      await repository.update({ ...profile, displayName: 'Comet' }),
    ).toMatchObject({ displayName: 'Comet' });
    expect(await new ProgressSqlRepository(database).get('p1')).toMatchObject({
      xp: 0,
      level: 1,
    });
    expect(await repository.delete('p1')).toBe(true);
    expect(
      await database.query("SELECT * FROM progress WHERE profile_id='p1'"),
    ).toEqual([]);
    await database.close();
  });

  it('enforces foreign keys and maps constraints to typed errors', async () => {
    const database = await setup();
    const repository = new ChildProfileSqlRepository(database);
    const profile = {
      id: 'p1',
      displayName: 'Nova',
      age: 9,
      ageBand: 'EXPLORER_7_9' as const,
      createdAt: '2026-09-22T00:00:00.000Z',
    };
    await repository.create(profile);
    await expect(repository.create(profile)).rejects.toMatchObject({
      code: 'CONSTRAINT',
    });
    await expect(
      database.execute("INSERT INTO progress (profile_id) VALUES ('missing')"),
    ).rejects.toThrow();
    await database.close();
  });

  it('filters questions by age, category and difficulty', async () => {
    const database = await setup();
    const importer = new ContentImporter(database, clock);
    await importer.import(questions);
    const repository = new QuestionSqlRepository(database, () =>
      importer.import(questions),
    );
    const result = await repository.selectQuestions({
      age: 9,
      ageBand: 'EXPLORER_7_9',
      count: 2,
      categories: ['SCIENCE'],
      types: ['MCQ'],
      allowedDifficulties: ['EASY', 'MEDIUM'],
      recentQuestionIds: [],
      weakCategories: [],
      seed: 3,
    });
    expect(result.kind).toBe('selected');
    if (result.kind === 'selected')
      expect(
        result.questions.every(
          question =>
            question.category === 'SCIENCE' &&
            question.ageMin <= 9 &&
            question.ageMax >= 9,
        ),
      ).toBe(true);
    await database.close();
  });

  it('persists attempts once and badges once', async () => {
    const database = await setup();
    const profileRepository = new ChildProfileSqlRepository(database);
    await profileRepository.create({
      id: 'p',
      displayName: 'P',
      age: 9,
      ageBand: 'EXPLORER_7_9',
      createdAt: clock.now(),
    });
    await new ContentImporter(database, clock).import(questions);
    const plan: SessionPlan = {
      id: 's',
      profileId: 'p',
      mode: 'PRACTICE',
      questionIds: ['GK_7_001'],
      seed: 1,
      contentVersion: 1,
      localDate: null,
      createdAt: clock.now(),
    };
    await new SessionSqlRepository(database, clock).create(plan);
    const attempt = {
      id: 'a',
      profileId: 'p',
      questionId: 'GK_7_001',
      sessionId: 's',
      answerId: 'C',
      correct: true,
      durationMs: 1000,
      attemptedAt: clock.now(),
    };
    const attempts = new AttemptSqlRepository(database);
    expect((await attempts.record(attempt)).alreadySubmitted).toBe(false);
    expect(
      (await attempts.record({ ...attempt, id: 'a2' })).alreadySubmitted,
    ).toBe(true);
    const badges = new BadgeSqlRepository(database);
    expect(await badges.award('p', 'FIRST_STEPS', clock.now())).toBe(true);
    expect(await badges.award('p', 'FIRST_STEPS', clock.now())).toBe(false);
    await database.close();
  });
});

describe('atomic session completion', () => {
  it('returns the original result and awards score, XP, streak and badges exactly once', async () => {
    const database = await setup();
    await new ChildProfileSqlRepository(database).create({
      id: 'p',
      displayName: 'P',
      age: 9,
      ageBand: 'EXPLORER_7_9',
      createdAt: clock.now(),
    });
    await new ContentImporter(database, clock).import(questions);
    const sessions = new SessionSqlRepository(database, clock);
    const plan: SessionPlan = {
      id: 'daily',
      profileId: 'p',
      mode: 'DAILY_10',
      questionIds: ['GK_7_001'],
      seed: 1,
      contentVersion: 1,
      localDate: '2026-09-22',
      createdAt: clock.now(),
    };
    await sessions.create(plan);
    await sessions.recordAnswer({
      sessionId: 'daily',
      questionId: 'GK_7_001',
      answerId: 'C',
      durationMs: 5000,
    });
    const first = await sessions.complete('daily');
    const second = await sessions.complete('daily');
    expect(second).toEqual(first);
    const progress = await new ProgressSqlRepository(database).get('p');
    expect(progress.xp).toBe(first.xpAwarded);
    expect(progress.currentStreak).toBe(1);
    expect(progress.completedSessionIds).toEqual(['daily']);
    expect(await new BadgeSqlRepository(database).listEarned('p')).toEqual([
      'FIRST_STEPS',
    ]);
    expect(
      await database.query("SELECT * FROM attempts WHERE session_id='daily'"),
    ).toHaveLength(1);
    await database.close();
  });
});
