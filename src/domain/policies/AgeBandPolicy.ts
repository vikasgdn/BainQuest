import type { AgeBand, Difficulty, Question } from '../models/types';

export function ageBandForAge(age: number): AgeBand {
  if (!Number.isInteger(age) || age < 7 || age > 14) {
    throw new RangeError('age must be an integer from 7 to 14');
  }
  return age <= 9
    ? 'EXPLORER_7_9'
    : age <= 12
    ? 'CHALLENGER_10_12'
    : 'MASTER_13_14';
}

export function allowedDifficulties(ageBand: AgeBand): readonly Difficulty[] {
  switch (ageBand) {
    case 'EXPLORER_7_9':
      return ['EASY', 'MEDIUM'];
    case 'CHALLENGER_10_12':
      return ['EASY', 'MEDIUM', 'HARD'];
    case 'MASTER_13_14':
      return ['MEDIUM', 'HARD'];
  }
}

export function isQuestionAgeCompatible(
  question: Question,
  age: number,
): boolean {
  return age >= question.ageMin && age <= question.ageMax;
}
