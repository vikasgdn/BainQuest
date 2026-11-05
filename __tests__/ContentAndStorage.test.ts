import questions from '../src/assets/content/questions_v1.json';
import { validateContent } from '../src/infrastructure/content/ContentSchema';
import { ContentImporter } from '../src/infrastructure/content/ContentImporter';
import { migrateDatabase } from '../src/infrastructure/database/migrations/MigrationRunner';
import { NodeSqliteDriver } from '../src/infrastructure/database/testing/NodeSqliteDriver';
import { AppSettingsStore } from '../src/infrastructure/storage/AppSettingsStore';
import { InMemoryKeyValueStore } from '../src/infrastructure/storage/InMemoryKeyValueStore';

const clone = (): typeof questions =>
  JSON.parse(JSON.stringify(questions)) as typeof questions;

describe('content validation', () => {
  it('accepts the bundled original content', () => {
    const result = validateContent(questions);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.questions).toHaveLength(26);
  });
  it.each([
    [
      'duplicate IDs',
      (value: typeof questions) => {
        value.questions[1]!.id = value.questions[0]!.id;
      },
      'id',
    ],
    [
      'invalid age range',
      (value: typeof questions) => {
        value.questions[0]!.ageMin = 6;
      },
      'ageMin',
    ],
    [
      'duplicate options',
      (value: typeof questions) => {
        value.questions[0]!.options[1]!.text =
          value.questions[0]!.options[0]!.text;
      },
      'options',
    ],
    [
      'missing correct answer',
      (value: typeof questions) => {
        value.questions[0]!.correctOptionId = 'Z';
      },
      'correctOptionId',
    ],
    [
      'invalid status',
      (value: typeof questions) => {
        (value.questions[0] as { status: string }).status = 'DRAFT';
      },
      'status',
    ],
    [
      'invalid asset',
      (value: typeof questions) => {
        (value.questions[0] as { assetRef: string | null }).assetRef =
          '../bad.exe';
      },
      'assetRef',
    ],
  ])('rejects %s with a clear field', (_name, mutate, field) => {
    const value = clone();
    mutate(value);
    const result = validateContent(value);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors.some(error => error.field.includes(field))).toBe(
        true,
      );
  });
  it('rejects unsupported schema versions', () => {
    const value = clone();
    (value as { schemaVersion: number }).schemaVersion = 2;
    const result = validateContent(value);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]?.field).toBe('schemaVersion');
  });
});

describe('content import', () => {
  it('is transactional and idempotent, and retires removed questions', async () => {
    const database = new NodeSqliteDriver();
    await migrateDatabase(database);
    let instant = '2026-09-22T00:00:00.000Z';
    const importer = new ContentImporter(database, {
      now: () => instant,
      localDate: () => '2026-09-22',
    });
    expect(await importer.import(questions)).toMatchObject({
      kind: 'ready',
      importedCount: 26,
    });
    expect(await importer.import(questions)).toMatchObject({
      kind: 'ready',
      importedCount: 0,
    });
    const next = clone();
    next.contentVersion = 2;
    next.questions = next.questions.slice(1);
    instant = '2026-09-23T00:00:00.000Z';
    expect(await importer.import(next)).toMatchObject({
      kind: 'ready',
      contentVersion: 2,
      importedCount: 25,
    });
    expect(
      (
        await database.query(
          "SELECT status FROM questions WHERE question_id='GK_7_001'",
        )
      )[0]?.status,
    ).toBe('RETIRED');
    expect(await database.query('SELECT * FROM content_metadata')).toHaveLength(
      1,
    );
    await database.close();
  });
  it('rejects the complete invalid import without changing rows', async () => {
    const database = new NodeSqliteDriver();
    await migrateDatabase(database);
    const importer = new ContentImporter(database, {
      now: () => '2026-09-22T00:00:00.000Z',
      localDate: () => '2026-09-22',
    });
    const invalid = clone();
    invalid.questions[0]!.ageMin = 1;
    expect(await importer.import(invalid)).toMatchObject({
      kind: 'error',
      retryable: false,
    });
    expect(await database.query('SELECT * FROM questions')).toEqual([]);
    await database.close();
  });
});

describe('key-value settings', () => {
  it('returns safe defaults and persists only settings through the interface', () => {
    const memory = new InMemoryKeyValueStore();
    const first = new AppSettingsStore(memory);
    expect(first.get()).toEqual({
      onboardingCompleted: false,
      selectedProfileId: null,
      soundEnabled: true,
      hapticEnabled: true,
      reducedMotion: false,
      extendedTime: false,
    });
    const settings = {
      onboardingCompleted: true,
      selectedProfileId: 'p',
      soundEnabled: false,
      hapticEnabled: false,
      reducedMotion: true,
      extendedTime: true,
    };
    first.set(settings);
    expect(new AppSettingsStore(memory).get()).toEqual(settings);
    memory.remove('settings.selectedProfileId');
    expect(first.get().selectedProfileId).toBeNull();
  });
});
