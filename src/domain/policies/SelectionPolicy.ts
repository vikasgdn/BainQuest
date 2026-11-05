import type { SelectionRequest, SelectionResult } from '../models/selection';
import type { Question } from '../models/types';
import { createSeededRandom, shuffle } from '../../shared/SeededRandom';
import {
  ageBandForAge,
  allowedDifficulties,
  isQuestionAgeCompatible,
} from './AgeBandPolicy';

export function normalizePrompt(prompt: string): string {
  return prompt.trim().toLocaleLowerCase('en').replace(/\s+/g, ' ');
}

/** Selects only eligible content, with recent-item fallback when the bank is small. */
export function selectQuestions(
  bank: readonly Question[],
  request: SelectionRequest,
): SelectionResult {
  if (!Number.isSafeInteger(request.count) || request.count < 1) {
    throw new RangeError('count must be a positive integer');
  }
  if (ageBandForAge(request.age) !== request.ageBand) {
    throw new RangeError('age and age band disagree');
  }
  const ageDifficulties = allowedDifficulties(request.ageBand);
  if (
    request.allowedDifficulties.some(value => !ageDifficulties.includes(value))
  ) {
    throw new RangeError('difficulty not allowed for age band');
  }
  const eligible = bank.filter(
    question =>
      !request.excludedPrompts?.includes(normalizePrompt(question.prompt)) &&
      question.status === 'PUBLISHED' &&
      isQuestionAgeCompatible(question, request.age) &&
      ageDifficulties.includes(question.difficulty) &&
      request.allowedDifficulties.includes(question.difficulty) &&
      request.categories.includes(question.category) &&
      request.types.includes(question.type),
  );
  const recent = new Set(request.recentQuestionIds.slice(-30));
  const shuffled = shuffle(eligible, createSeededRandom(request.seed));
  const fresh = shuffled.filter(question => !recent.has(question.id));
  const ordered = [
    ...fresh,
    ...shuffled.filter(question => recent.has(question.id)),
  ];
  const selected: Question[] = [];
  const seenPrompts = new Set<string>();
  const weak = new Set(request.weakCategories);
  const mixedTarget = Math.ceil(request.count * 0.4);
  const mixed = ordered.filter(question => !weak.has(question.category));
  const weakItems = ordered.filter(question => weak.has(question.category));
  const add = (items: readonly Question[], limit: number) => {
    for (const question of items) {
      if (selected.length >= limit) {
        break;
      }
      const normalized = normalizePrompt(question.prompt);
      if (!seenPrompts.has(normalized)) {
        selected.push(question);
        seenPrompts.add(normalized);
      }
    }
  };
  add(mixed, mixedTarget);
  add(weakItems, request.count);
  add(mixed, request.count);
  return selected.length === request.count
    ? { kind: 'selected', questions: selected }
    : {
        kind: 'insufficient-content',
        requested: request.count,
        available: selected.length,
      };
}
