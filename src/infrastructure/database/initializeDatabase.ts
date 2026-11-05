import type { Clock } from '../../shared/Clock';
import { ContentImporter } from '../content/ContentImporter';
import { bundledQuestions } from '../content/bundledContent';
import type { DatabaseDriver } from './DatabaseDriver';
import { migrateDatabase } from './migrations/MigrationRunner';
import { AttemptSqlRepository } from './repositories/AttemptSqlRepository';
import { BadgeSqlRepository } from './repositories/BadgeSqlRepository';
import { ChildProfileSqlRepository } from './repositories/ChildProfileSqlRepository';
import { ContentMetadataSqlRepository } from './repositories/ContentMetadataSqlRepository';
import { ProgressSqlRepository } from './repositories/ProgressSqlRepository';
import { QuestionSqlRepository } from './repositories/QuestionSqlRepository';
import { SessionSqlRepository } from './repositories/SessionSqlRepository';

export async function initializeDatabase(
  clock: Clock,
  database?: DatabaseDriver,
) {
  const driver =
    database ?? (await import('./NitroSqliteDriver')).openNitroDatabase();
  await migrateDatabase(driver);
  const importer = new ContentImporter(driver, clock);
  return {
    driver,
    childProfiles: new ChildProfileSqlRepository(driver),
    questions: new QuestionSqlRepository(driver, () =>
      importer.import(bundledQuestions),
    ),
    sessions: new SessionSqlRepository(driver, clock),
    attempts: new AttemptSqlRepository(driver),
    progress: new ProgressSqlRepository(driver),
    badges: new BadgeSqlRepository(driver),
    contentMetadata: new ContentMetadataSqlRepository(driver),
  } as const;
}
