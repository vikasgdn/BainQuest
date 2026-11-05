import { theme } from '@/design-system/theme';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text } from 'react-native';
import type { GeneratedQuestion } from '@/domain/models/puzzle';
import type { AgeBand } from '@/domain/models/types';
import type { Clock } from '@/shared/Clock';
import {
  advanceMemory,
  initialMemoryRuntime,
  memoryPresentation,
} from '@/domain/use-cases/memoryRuntime';
import { AppButton } from '@/design-system/AppButton';

export function MemoryActivity({
  question,
  ageBand,
  extendedTime,
  clock,
  answered,
  children,
}: Readonly<{
  question: GeneratedQuestion;
  ageBand: AgeBand;
  extendedTime: boolean;
  clock: Clock;
  answered: boolean;
  children: React.ReactNode;
}>) {
  const [state, setState] = useState(() =>
    initialMemoryRuntime(ageBand, extendedTime),
  );
  const active = useRef(AppState.currentState === 'active');
  const last = useRef(Date.parse(clock.now()));
  useEffect(() => {
    const tick = () => {
      const now = Date.parse(clock.now());
      const elapsedMs = Math.max(0, now - last.current);
      last.current = now;
      const wasActive = active.current;
      setState(previous =>
        advanceMemory(
          previous,
          { type: 'TICK', elapsedMs, active: wasActive },
          question,
        ),
      );
    };
    const timer = setInterval(tick, 100);
    const subscription = AppState.addEventListener('change', next => {
      tick();
      active.current = next === 'active';
      last.current = Date.parse(clock.now());
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [clock, question]);
  const presentation = memoryPresentation(state, question);
  if (answered || state.phase === 'QUESTION') return <>{children}</>;
  return (
    <>
      <Text
        style={theme.text.heading}
        accessibilityRole="header"
        accessibilityLiveRegion="polite"
      >
        {state.phase === 'INTRO'
          ? 'Remember the objects in order'
          : state.phase === 'MEMORIZE'
          ? 'Look at the objects'
          : 'The objects are hidden'}
      </Text>
      {presentation.objects.map((object, index) => (
        <Text key={object.id} style={styles.object}>
          {index + 1}. {object.label}
        </Text>
      ))}
      {state.phase === 'INTRO' ? (
        <AppButton
          title="Start remembering"
          onPress={() => {
            last.current = Date.parse(clock.now());
            setState(previous =>
              advanceMemory(previous, { type: 'START' }, question),
            );
          }}
        />
      ) : null}
      {state.phase === 'HIDDEN' ? (
        <AppButton
          title="Show the question"
          onPress={() =>
            setState(previous =>
              advanceMemory(previous, { type: 'ASK' }, question),
            )
          }
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  object: { ...theme.text.heading, marginVertical: 8 },
});
