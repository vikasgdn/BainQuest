import type { QuestionRepository } from '../../../domain/repositories/contracts';
import type {
  SelectionRequest,
  SelectionResult,
  ContentPreparationResult,
} from '../../../domain/models/selection';
import type { Question } from '../../../domain/models/types';
import type { DatabaseDriver } from '../DatabaseDriver';
import { questionFromRow } from '../mappers';
import { selectQuestions } from '../../../domain/policies/SelectionPolicy';

export type ContentPreparer = () => Promise<ContentPreparationResult>;

export class QuestionSqlRepository implements QuestionRepository {
  constructor(
    private readonly database: DatabaseDriver,
    private readonly prepare: ContentPreparer,
  ) {}
  prepareContent(): Promise<ContentPreparationResult> {
    return this.prepare();
  }
  async getQuestion(id: string): Promise<Question | null> {
    const rows = await this.database.query(
      'SELECT * FROM questions WHERE question_id = ?',
      [id],
    );
    return rows[0] ? questionFromRow(rows[0]) : null;
  }
  async selectQuestions(request: SelectionRequest): Promise<SelectionResult> {
    const placeholders = (values: readonly unknown[]) =>
      values.map(() => '?').join(',');
    const rows = await this.database.query(
      `SELECT * FROM questions WHERE status = 'PUBLISHED' AND age_min <= ? AND age_max >= ? AND category IN (${placeholders(
        request.categories,
      )}) AND type IN (${placeholders(
        request.types,
      )}) AND difficulty IN (${placeholders(request.allowedDifficulties)})`,
      [
        request.age,
        request.age,
        ...request.categories,
        ...request.types,
        ...request.allowedDifficulties,
      ],
    );
    return selectQuestions(rows.map(questionFromRow), request);
  }
}
