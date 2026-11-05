import type { ContentPreparationResult } from '../../domain/models/selection';
import type { Clock } from '../../shared/Clock';
import type {
  DatabaseDriver,
  DatabaseExecutor,
} from '../database/DatabaseDriver';
import { ContentMetadataSqlRepository } from '../database/repositories/ContentMetadataSqlRepository';
import {
  validateContent,
  type ContentDocument,
  type ContentQuestion,
} from './ContentSchema';
import { sha256 } from './sha256';

const CONTENT_KEY = 'bundled_questions_v1';

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value !== null && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(',')}}`;
  return JSON.stringify(value);
}

async function upsertQuestion(
  database: DatabaseExecutor,
  question: ContentQuestion,
  version: number,
): Promise<void> {
  await database.execute(
    `INSERT INTO questions (question_id,type,category,subcategory,age_min,age_max,difficulty,prompt,payload_json,correct_option_id,explanation,asset_ref,version,status,source_label,source_url,license) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(question_id) DO UPDATE SET type=excluded.type,category=excluded.category,subcategory=excluded.subcategory,age_min=excluded.age_min,age_max=excluded.age_max,difficulty=excluded.difficulty,prompt=excluded.prompt,payload_json=excluded.payload_json,correct_option_id=excluded.correct_option_id,explanation=excluded.explanation,asset_ref=excluded.asset_ref,version=excluded.version,status=excluded.status,source_label=excluded.source_label,source_url=excluded.source_url,license=excluded.license`,
    [
      question.id,
      question.type,
      question.category,
      question.subcategory,
      question.ageMin,
      question.ageMax,
      question.difficulty,
      question.prompt,
      JSON.stringify(question.options),
      question.correctOptionId,
      question.explanation,
      question.assetRef,
      version,
      question.status,
      question.sourceLabel,
      question.sourceUrl,
      question.license,
    ],
  );
}

export class ContentImporter {
  constructor(
    private readonly database: DatabaseDriver,
    private readonly clock: Clock,
  ) {}
  async import(input: unknown): Promise<ContentPreparationResult> {
    const validation = validateContent(input);
    if (!validation.ok)
      return {
        kind: 'error',
        reason: validation.errors
          .map(
            error =>
              `${error.questionId ?? 'document'}:${error.field}:${error.code}:${
                error.message
              }`,
          )
          .join('\n'),
        retryable: false,
      };
    return this.importValidated(validation.value);
  }
  private async importValidated(
    document: ContentDocument,
  ): Promise<ContentPreparationResult> {
    const checksum = sha256(stableJson(document));
    try {
      const current = await new ContentMetadataSqlRepository(this.database).get(
        CONTENT_KEY,
      );
      if (
        current?.checksum === checksum &&
        current.contentVersion === document.contentVersion
      )
        return {
          kind: 'ready',
          contentVersion: current.contentVersion,
          importedCount: 0,
        };
      await this.database.transaction(async transaction => {
        for (let offset = 0; offset < document.questions.length; offset += 50) {
          for (const question of document.questions.slice(offset, offset + 50))
            await upsertQuestion(
              transaction,
              question,
              document.contentVersion,
            );
        }
        const ids = document.questions.map(question => question.id);
        const placeholders = ids.map(() => '?').join(',');
        await transaction.execute(
          `UPDATE questions SET status = 'RETIRED' WHERE status = 'PUBLISHED' AND question_id NOT IN (${placeholders})`,
          ids,
        );
        await new ContentMetadataSqlRepository(transaction).put({
          key: CONTENT_KEY,
          schemaVersion: document.schemaVersion,
          contentVersion: document.contentVersion,
          checksum,
          importedAt: this.clock.now(),
        });
      });
      return {
        kind: 'ready',
        contentVersion: document.contentVersion,
        importedCount: document.questions.length,
      };
    } catch (error) {
      return {
        kind: 'error',
        reason: error instanceof Error ? error.message : String(error),
        retryable: true,
      };
    }
  }
}
