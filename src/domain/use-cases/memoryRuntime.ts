import type { GeneratedQuestion } from '../models/puzzle';
import type { AgeBand } from '../models/types';

export type MemoryPhase =
  | 'INTRO'
  | 'MEMORIZE'
  | 'HIDDEN'
  | 'QUESTION'
  | 'FEEDBACK'
  | 'COMPLETE';
export type MemoryRuntime = Readonly<{
  phase: MemoryPhase;
  remainingMs: number;
  answerId: string | null;
}>;
export type MemoryAction =
  | Readonly<{ type: 'START' | 'ASK' | 'COMPLETE' }>
  | Readonly<{ type: 'TICK'; elapsedMs: number; active: boolean }>
  | Readonly<{ type: 'ANSWER'; answerId: string }>;

export function initialMemoryRuntime(
  ageBand: AgeBand,
  extendedTime: boolean,
): MemoryRuntime {
  const duration = {
    EXPLORER_7_9: 8000,
    CHALLENGER_10_12: 6000,
    MASTER_13_14: 5000,
  }[ageBand];
  return {
    phase: 'INTRO',
    remainingMs: duration * (extendedTime ? 1.5 : 1),
    answerId: null,
  };
}

/** Elapsed time is foreground time only; background events never consume it. */
export function advanceMemory(
  state: MemoryRuntime,
  action: MemoryAction,
  question: GeneratedQuestion,
): MemoryRuntime {
  if (question.presentation.kind !== 'MEMORY_OBJECTS')
    throw new Error('A memory question is required');
  switch (action.type) {
    case 'START':
      return state.phase === 'INTRO' ? { ...state, phase: 'MEMORIZE' } : state;
    case 'TICK': {
      if (!Number.isFinite(action.elapsedMs) || action.elapsedMs < 0)
        throw new RangeError('Elapsed time must be finite and non-negative');
      if (state.phase !== 'MEMORIZE' || !action.active) return state;
      const remainingMs = Math.max(0, state.remainingMs - action.elapsedMs);
      return {
        ...state,
        remainingMs,
        phase: remainingMs === 0 ? 'HIDDEN' : 'MEMORIZE',
      };
    }
    case 'ASK':
      return state.phase === 'HIDDEN' ? { ...state, phase: 'QUESTION' } : state;
    case 'ANSWER':
      if (state.phase !== 'QUESTION') return state;
      if (!question.options.some(option => option.id === action.answerId))
        throw new RangeError('Unknown answer');
      return { ...state, phase: 'FEEDBACK', answerId: action.answerId };
    case 'COMPLETE':
      return state.phase === 'FEEDBACK'
        ? { ...state, phase: 'COMPLETE' }
        : state;
  }
}

/** Render only this projection: hidden phases omit both objects and answer keys. */
export function memoryPresentation(
  state: MemoryRuntime,
  question: GeneratedQuestion,
) {
  if (question.presentation.kind !== 'MEMORY_OBJECTS')
    throw new Error('A memory question is required');
  return {
    phase: state.phase,
    objects: state.phase === 'MEMORIZE' ? question.presentation.objects : [],
    prompt:
      state.phase === 'QUESTION' || state.phase === 'FEEDBACK'
        ? question.prompt
        : null,
    options:
      state.phase === 'QUESTION' || state.phase === 'FEEDBACK'
        ? question.options
        : [],
    feedback:
      state.phase === 'FEEDBACK'
        ? {
            correct: state.answerId === question.correctOptionId,
            explanation: question.explanation,
            correctOptionId: question.correctOptionId,
          }
        : null,
  };
}
