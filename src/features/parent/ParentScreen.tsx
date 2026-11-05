import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Text, StyleSheet } from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { ParentGate } from '@/domain/use-cases/ParentGate';
import type { AppServices } from '@/shared/AppServices';
import { ScreenContainer } from '@/design-system/ScreenContainer';
import { AppTextInput } from '@/design-system/AppTextInput';
import { AppButton } from '@/design-system/AppButton';
import { Feedback } from '@/design-system/Feedback';
import { theme } from '@/design-system/theme';
import { ParentDashboard } from './ParentDashboard';

export function ParentScreen({
  services,
  onExit,
  onDeleted,
}: Readonly<{
  services: AppServices;
  onExit: () => void;
  onDeleted: () => void;
}>) {
  const gate = useMemo(
    () => new ParentGate(services.settings, services.clock),
    [services],
  );
  const focused = useIsFocused();
  const [unlocked, setUnlocked] = useState(false);
  const [answer, setAnswer] = useState('');
  const [prompt, setPrompt] = useState(gate.prompt);
  const [message, setMessage] = useState<string>();
  const [wait, setWait] = useState(0);
  const [storageError, setStorageError] = useState(false);
  const lock = useCallback(() => {
    gate.lock();
    setPrompt(gate.prompt);
    setUnlocked(false);
    setAnswer('');
    setMessage(undefined);
  }, [gate]);
  useFocusEffect(
    useCallback(() => {
      lock();
      return lock;
    }, [lock]),
  );
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') lock();
    });
    return () => subscription.remove();
  }, [lock]);
  useEffect(() => {
    const refresh = () => {
      try {
        setWait(gate.waitSeconds);
        setStorageError(false);
      } catch {
        setStorageError(true);
      }
    };
    refresh();
    const timer = setInterval(refresh, 1000);
    return () => clearInterval(timer);
  }, [gate]);
  function submit() {
    try {
      const result = gate.submit(answer);
      setPrompt(gate.prompt);
      setWait(gate.waitSeconds);
      setAnswer('');
      if (result === 'unlocked') {
        setUnlocked(true);
        setMessage(undefined);
      } else
        setMessage(
          result === 'locked'
            ? 'Please wait before trying again.'
            : 'That answer didn’t match. Try the new question.',
        );
    } catch {
      setStorageError(true);
    }
  }
  return (
    <>
      {focused && unlocked && gate.unlocked ? (
        <ParentDashboard
          services={services}
          gate={gate}
          onExit={onExit}
          onDeleted={onDeleted}
        />
      ) : (
        <ScreenContainer>
          <Text accessibilityRole="header" style={styles.title}>
            For parents and carers
          </Text>
          <Text style={styles.body}>
            Please ask an adult to continue. Solve this two-step calculation to
            open the Parent area.
          </Text>
          <Text style={styles.caption}>
            This check helps keep adult controls separate. It does not verify
            identity.
          </Text>
          <Text
            accessibilityLabel={`Calculate ${prompt
              .replace('×', 'times')
              .replace('−', 'minus')}`}
            style={styles.title}
          >
            {prompt} = ?
          </Text>
          <AppTextInput
            label="Adult answer"
            value={answer}
            onChangeText={setAnswer}
            keyboardType="number-pad"
            autoComplete="off"
            maxLength={8}
            editable={!wait && !storageError}
          />
          {wait > 0 && (
            <Text accessibilityLiveRegion="polite" style={styles.body}>
              Try again in {wait} seconds.
            </Text>
          )}
          {message && <Feedback title={message} />}
          {storageError && (
            <Feedback
              title="Adult controls unavailable"
              message="We couldn’t read the saved gate status. Close and reopen the app to try again."
            />
          )}
          <AppButton
            title="Open Parent area"
            onPress={submit}
            disabled={wait > 0 || storageError || !answer.trim()}
          />
          <AppButton
            title="Back to home"
            variant="secondary"
            onPress={onExit}
          />
        </ScreenContainer>
      )}
    </>
  );
}
const styles = StyleSheet.create({
  title: { ...theme.text.title },
  body: { ...theme.text.body },
  caption: { ...theme.text.label, color: theme.colors.muted },
});
