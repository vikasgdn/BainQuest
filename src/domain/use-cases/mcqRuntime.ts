import type { Attempt, Question, SessionResult } from '../models/types';

export type McqRuntimeState = Readonly<{
  status: 'loading' | 'ready' | 'feedback' | 'complete' | 'error';
  questions: readonly Question[];
  attempts: readonly Attempt[];
  index: number;
  selectedAnswerId: string | null;
  result: SessionResult | null;
  error: string | null;
}>;

export function initialMcqRuntime(
  questions: readonly Question[],
  attempts: readonly Attempt[],
): McqRuntimeState {
  const index = Math.min(attempts.length, Math.max(questions.length - 1, 0));
  return {
    status:
      questions.length === 0
        ? 'error'
        : attempts.length === questions.length
        ? 'feedback'
        : 'ready',
    questions,
    attempts,
    index,
    selectedAnswerId: attempts[index]?.answerId ?? null,
    result: null,
    error: questions.length === 0 ? 'This session has no questions.' : null,
  };
}

export function selectMcqAnswer(
  state: McqRuntimeState,
  answerId: string,
): McqRuntimeState {
  if (state.status !== 'ready' || !state.questions[state.index]) return state;
  const question = state.questions[state.index];
  if (!question || !question.options.some(option => option.id === answerId))
    return state;
  return { ...state, selectedAnswerId: answerId };
}

export function showMcqFeedback(
  state: McqRuntimeState,
  attempt: Attempt,
): McqRuntimeState {
  return {
    ...state,
    status: 'feedback',
    attempts: [
      ...state.attempts.filter(item => item.questionId !== attempt.questionId),
      attempt,
    ],
    selectedAnswerId: attempt.answerId,
  };
}

export function advanceMcqQuestion(state: McqRuntimeState): McqRuntimeState {
  if (state.status !== 'feedback') return state;
  const nextIndex = state.index + 1;
  if (nextIndex >= state.questions.length)
    return {
      ...state,
      status: 'ready',
      index: nextIndex,
      selectedAnswerId: null,
    };
  return {
    ...state,
    status: 'ready',
    index: nextIndex,
    selectedAnswerId: null,
  };
}

export function completeMcqRuntime(
  state: McqRuntimeState,
  result: SessionResult,
): McqRuntimeState {
  return { ...state, status: 'complete', result };
}
