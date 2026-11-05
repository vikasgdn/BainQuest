import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, StyleSheet, Text } from 'react-native';
import type {
  GameSession,
  SessionItem,
  AgeBand,
  SessionResult,
} from '@/domain/models/types';
import { MemoryActivity } from './MemoryActivity';
import {
  initialMcqRuntime,
  selectMcqAnswer,
  showMcqFeedback,
  advanceMcqQuestion,
  type McqRuntimeState,
} from '@/domain/use-cases/mcqRuntime';
import type { AppServices } from '@/shared/AppServices';
import { AppButton } from '@/design-system/AppButton';
import { AnswerOption } from '@/design-system/AnswerOption';
import { Feedback } from '@/design-system/Feedback';
import { AppCard } from '@/design-system/AppCard';
import { ScreenContainer } from '@/design-system/ScreenContainer';
import { theme } from '@/design-system/theme';

type Props = Readonly<{
  services: AppServices;
  sessionId: string;
  onComplete: (result: SessionResult) => void;
}>;

export function GameScreen({ services, sessionId, onComplete }: Props) {
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;
  const [session, setSession] = useState<GameSession | null>(null);
  const [questions, setQuestions] = useState<readonly SessionItem[]>([]);
  const [state, setState] = useState<McqRuntimeState | null>(null);
  const [ageBand, setAgeBand] = useState<AgeBand>('EXPLORER_7_9');
  const actionLock = useRef(false);
  const [busy, setBusy] = useState(false);
  const elapsedMs = useRef(0);
  const activeSince = useRef<string | null>(services.clock.now());
  const [loadVersion, setLoadVersion] = useState(0);
  const [error, setError] = useState<string>();
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const nextSession = await services.sessions.get(sessionId);
        if (!nextSession) throw new Error('Session not found');
        if (nextSession.status === 'COMPLETED') {
          const result = await services.sessions.complete(sessionId);
          if (mounted) completeRef.current(result);
          return;
        }
        const profile = await services.childProfiles.get(
          nextSession.plan.profileId,
        );
        if (!profile) throw new Error('Profile not found');
        const loaded =
          nextSession.plan.items ??
          (await Promise.all(
            nextSession.plan.questionIds.map(id =>
              services.questions.getQuestion(id),
            ),
          ));
        const nextQuestions = loaded.filter(
          (question): question is SessionItem => question !== null,
        );
        if (!mounted) return;
        if (nextQuestions.length !== nextSession.plan.questionIds.length)
          throw new Error('Some activities could not be loaded.');
        setAgeBand(profile.ageBand);
        elapsedMs.current = 0;
        activeSince.current =
          AppState.currentState === 'active' ? services.clock.now() : null;
        setSession(nextSession);
        setQuestions(nextQuestions);
        setState(initialMcqRuntime(nextQuestions, nextSession.attempts));
      } catch {
        if (mounted)
          setError(
            'We couldn’t open this round. Tap Try again to reload your saved activities.',
          );
      }
    }
    load().catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [services, sessionId, loadVersion]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        activeSince.current = services.clock.now();
      } else if (activeSince.current) {
        elapsedMs.current += Math.max(
          0,
          Date.parse(services.clock.now()) - Date.parse(activeSince.current),
        );
        activeSince.current = null;
      }
    });
    return () => subscription.remove();
  }, [services]);

  const current = useMemo(
    () =>
      state && state.index < questions.length ? questions[state.index] : null,
    [questions, state],
  );
  if (error)
    return (
      <ScreenContainer>
        <Feedback title="Let’s try that again" message={error} />
        <AppButton
          title="Try again"
          onPress={() => {
            setError(undefined);
            if (!session) setLoadVersion(value => value + 1);
          }}
        />
      </ScreenContainer>
    );
  if (!session || !state || !current)
    return (
      <ScreenContainer>
        <Text accessibilityRole="header" style={styles.title}>
          Loading your question…
        </Text>
      </ScreenContainer>
    );
  const readyState = state;
  const currentQuestion = current;
  const answered = readyState.attempts.some(
    attempt => attempt.questionId === currentQuestion.id,
  );
  const feedbackAttempt = readyState.attempts.find(
    attempt => attempt.questionId === currentQuestion.id,
  );
  async function confirm() {
    if (!readyState.selectedAnswerId || answered || actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    const durationMs = Math.max(
      0,
      elapsedMs.current +
        (activeSince.current
          ? Date.parse(services.clock.now()) - Date.parse(activeSince.current)
          : 0),
    );
    try {
      const answer = await services.sessions.recordAnswer({
        sessionId,
        questionId: currentQuestion.id,
        answerId: readyState.selectedAnswerId,
        durationMs,
      });
      setState(previous =>
        previous ? showMcqFeedback(previous, answer.attempt) : previous,
      );
    } catch {
      setError(
        'Your answer couldn’t be saved. Tap Try again, then check your answer once more.',
      );
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }
  async function continueSession() {
    if (actionLock.current) return;
    if (readyState.index + 1 >= questions.length) {
      actionLock.current = true;
      setBusy(true);
      try {
        const result = await services.sessions.complete(sessionId);
        onComplete(result);
      } catch {
        setError(
          'We couldn’t save your result yet. Tap Try again, then See my result to finish.',
        );
      } finally {
        actionLock.current = false;
        setBusy(false);
      }
      return;
    }
    setState(previous => (previous ? advanceMcqQuestion(previous) : previous));
    elapsedMs.current = 0;
    activeSince.current = services.clock.now();
  }
  const activity = (
    <>
      <Text style={styles.prompt}>{currentQuestion.prompt}</Text>
      {currentQuestion.options.map(option => (
        <AnswerOption
          key={option.id}
          title={option.text}
          state={
            answered && option.id === currentQuestion.correctOptionId
              ? 'correct'
              : answered && option.id === feedbackAttempt?.answerId
              ? 'incorrect'
              : readyState.selectedAnswerId === option.id
              ? 'selected'
              : 'default'
          }
          disabled={answered || busy}
          accessibilityLabel={`Answer: ${option.text}`}
          onPress={() =>
            setState(previous =>
              previous ? selectMcqAnswer(previous, option.id) : previous,
            )
          }
        />
      ))}
      {state.status === 'feedback' && feedbackAttempt ? (
        <Feedback
          kind={feedbackAttempt.correct ? 'success' : 'error'}
          title={
            feedbackAttempt.correct
              ? 'Correct! Nicely done.'
              : 'Not quite — keep learning!'
          }
          message={`${
            feedbackAttempt.correct
              ? ''
              : `The correct answer is ${
                  currentQuestion.options.find(
                    option => option.id === currentQuestion.correctOptionId,
                  )?.text
                }. `
          }${currentQuestion.explanation}`}
        />
      ) : null}
      {state.status === 'feedback' ? (
        <AppButton
          title={
            readyState.index + 1 >= questions.length
              ? 'See my result'
              : 'Continue'
          }
          disabled={busy}
          onPress={() => {
            continueSession().catch(() => undefined);
          }}
        />
      ) : (
        <AppButton
          title="Check answer"
          disabled={!readyState.selectedAnswerId || busy}
          onPress={() => {
            confirm().catch(() => undefined);
          }}
        />
      )}
    </>
  );
  return (
    <ScreenContainer>
      <Text accessibilityRole="header" style={styles.title}>
        Question {Math.min(readyState.index + 1, questions.length)} of{' '}
        {questions.length}
      </Text>
      <Text
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: questions.length,
          now: Math.min(readyState.index + 1, questions.length),
        }}
        style={styles.progress}
      >
        {session.plan.mode === 'DAILY_10'
          ? 'Your Daily 10'
          : 'Your practice round'}
      </Text>
      <AppCard>
        {currentQuestion.generated?.presentation.kind === 'MEMORY_OBJECTS' ? (
          <MemoryActivity
            key={currentQuestion.id}
            question={currentQuestion.generated}
            ageBand={ageBand}
            extendedTime={session.plan.extendedTime ?? false}
            clock={services.clock}
            answered={answered}
          >
            {activity}
          </MemoryActivity>
        ) : (
          activity
        )}
      </AppCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...theme.text.title },
  progress: { ...theme.text.label },
  prompt: { ...theme.text.heading, marginBottom: 8 },
});
