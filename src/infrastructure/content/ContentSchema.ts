import { z } from 'zod';

const optionSchema = z
  .object({
    id: z.string().trim().min(1),
    text: z.string().trim().min(1).max(90),
  })
  .strict();

export const contentQuestionSchema = z
  .object({
    id: z.string().trim().min(1),
    type: z.enum(['MCQ', 'PATTERN', 'MEMORY']),
    category: z.enum(['LOGIC', 'GK', 'SCIENCE', 'SPORTS', 'SPACE']),
    subcategory: z.string().trim().min(1),
    ageMin: z.number().int().min(7).max(14),
    ageMax: z.number().int().min(7).max(14),
    difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
    prompt: z.string().trim().min(1).max(220),
    options: z.array(optionSchema),
    correctOptionId: z.string().trim().min(1),
    explanation: z.string().trim().min(1),
    assetRef: z
      .string()
      .regex(/^[A-Za-z0-9_./-]+\.(png|jpg|jpeg|webp|svg)$/i)
      .nullable(),
    assetAccessibilityLabel: z.string().trim().min(1).nullable(),
    status: z.literal('PUBLISHED'),
    sourceLabel: z.string().trim().min(1),
    sourceUrl: z.string().url().nullable(),
    license: z.enum(['ORIGINAL', 'PUBLIC_DOMAIN', 'LICENSED']),
  })
  .strict()
  .superRefine((question, context) => {
    if (question.ageMin > question.ageMax)
      context.addIssue({
        code: 'custom',
        path: ['ageMax'],
        message: 'ageMax must be greater than or equal to ageMin',
      });
    const optionIds = question.options.map(option => option.id);
    const normalizedOptions = question.options.map(option =>
      option.text.trim().toLocaleLowerCase('en'),
    );
    if (question.type === 'MCQ' && question.options.length !== 4)
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'MCQ must have exactly four options',
      });
    if (
      new Set(optionIds).size !== optionIds.length ||
      new Set(normalizedOptions).size !== normalizedOptions.length
    )
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Options must be unique',
      });
    if (optionIds.filter(id => id === question.correctOptionId).length !== 1)
      context.addIssue({
        code: 'custom',
        path: ['correctOptionId'],
        message: 'Correct option must exist exactly once',
      });
    if (question.assetRef !== null && question.assetAccessibilityLabel === null)
      context.addIssue({
        code: 'custom',
        path: ['assetAccessibilityLabel'],
        message: 'Asset accessibility label is required',
      });
  });

export const contentDocumentSchema = z
  .object({
    schemaVersion: z.literal(1),
    contentVersion: z.number().int().positive(),
    generatedAt: z.string().datetime(),
    questions: z.array(contentQuestionSchema).min(1),
  })
  .strict()
  .superRefine((document, context) => {
    const ids = new Set<string>();
    const prompts = new Set<string>();
    document.questions.forEach((question, index) => {
      if (ids.has(question.id))
        context.addIssue({
          code: 'custom',
          path: ['questions', index, 'id'],
          message: 'Question ID must be unique',
        });
      ids.add(question.id);
      const band = `${question.ageMin}-${question.ageMax}`;
      const prompt = `${band}:${question.prompt
        .trim()
        .toLocaleLowerCase('en')
        .replace(/\s+/g, ' ')}`;
      if (prompts.has(prompt))
        context.addIssue({
          code: 'custom',
          path: ['questions', index, 'prompt'],
          message: 'Prompt must be unique in its age range',
        });
      prompts.add(prompt);
    });
  });

export type ContentDocument = z.infer<typeof contentDocumentSchema>;
export type ContentQuestion = z.infer<typeof contentQuestionSchema>;
export type ContentValidationError = Readonly<{
  questionId: string | null;
  field: string;
  code: string;
  message: string;
}>;

export type ContentValidationResult =
  | Readonly<{ ok: true; value: ContentDocument }>
  | Readonly<{ ok: false; errors: readonly ContentValidationError[] }>;

export function validateContent(input: unknown): ContentValidationResult {
  const result = contentDocumentSchema.safeParse(input);
  if (result.success) return { ok: true, value: result.data };
  const candidate =
    typeof input === 'object' && input !== null
      ? (input as { questions?: unknown[] })
      : {};
  return {
    ok: false,
    errors: result.error.issues.map(issue => {
      const questionIndex =
        issue.path[0] === 'questions' && typeof issue.path[1] === 'number'
          ? issue.path[1]
          : null;
      const raw =
        questionIndex === null ? null : candidate.questions?.[questionIndex];
      const questionId =
        typeof raw === 'object' &&
        raw !== null &&
        'id' in raw &&
        typeof raw.id === 'string'
          ? raw.id
          : null;
      const field = issue.path.map(String).join('.');
      return { questionId, field, code: issue.code, message: issue.message };
    }),
  };
}
