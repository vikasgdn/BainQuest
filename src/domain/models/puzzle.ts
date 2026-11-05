import type { AgeBand, AnswerOption, Difficulty } from './types';

export type MemoryObject = Readonly<{ id: string; label: string }>;
export type PresentationSpec =
  | Readonly<{
      kind: 'TEXT' | 'SHAPES';
      accessibilityLabel: string;
    }>
  | Readonly<{
      kind: 'MEMORY_OBJECTS';
      accessibilityLabel: string;
      objects: readonly MemoryObject[];
      targetPosition: number;
    }>;
export type GeneratedQuestion = Readonly<{
  instanceId: string;
  generatorId: string;
  generatorVersion: number;
  seed: number;
  prompt: string;
  options: readonly AnswerOption[];
  correctOptionId: string;
  explanation: string;
  presentation: PresentationSpec;
}>;
export interface PuzzleGenerator {
  readonly id: string;
  readonly version: number;
  readonly supportedAgeBands: ReadonlySet<AgeBand>;
  generate(seed: number, difficulty: Difficulty): GeneratedQuestion;
}
