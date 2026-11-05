import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import {
  bootstrapApplication,
  type BootstrapDependencies,
} from './BootstrapCoordinator';
import { createDefaultBootstrapDependencies } from './defaultDependencies';
import type { AppServices, BootstrapState } from './types';
import { Feedback } from '@/design-system/Feedback';
import { AppButton } from '@/design-system/AppButton';
import { theme } from '@/design-system/theme';

type Props = Readonly<{
  dependencies?: BootstrapDependencies;
  children: (
    state: Extract<BootstrapState, { status: 'ready' }>,
    services: AppServices,
  ) => React.ReactNode;
}>;

export function BootstrapGate({
  dependencies: suppliedDependencies,
  children,
}: Props) {
  const dependencies = useMemo(
    () => suppliedDependencies ?? createDefaultBootstrapDependencies(),
    [suppliedDependencies],
  );
  const [state, setState] = useState<BootstrapState>({ status: 'idle' });
  const [services, setServices] = useState<AppServices | undefined>();
  const start = useCallback(async () => {
    setState({ status: 'initializing' });
    const result = await bootstrapApplication(dependencies);
    setState(result.state);
    setServices(result.services);
  }, [dependencies]);
  useEffect(() => {
    start().catch(() => undefined);
  }, [start]);

  if (state.status === 'ready' && services)
    return <>{children(state, services)}</>;
  if (state.status === 'error')
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text accessibilityRole="header" style={styles.title}>
          BrainQuest
        </Text>
        <Feedback
          title="We couldn’t get things ready"
          message="Tap Retry to try opening BrainQuest again. If this keeps happening, close and reopen the app."
        />
        <AppButton
          title="Retry"
          accessibilityLabel="Retry startup"
          onPress={() => {
            start().catch(() => undefined);
          }}
        />
      </ScrollView>
    );
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ActivityIndicator
        accessibilityLabel="Starting BrainQuest"
        size="large"
        color={theme.colors.primary}
      />
      <Text accessibilityRole="header" style={styles.title}>
        Getting ready
      </Text>
      <Text style={styles.message}>Preparing your learning adventure.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
    gap: theme.spacing.md,
  },
  title: { ...theme.text.title, textAlign: 'center' },
  message: { ...theme.text.body, textAlign: 'center' },
});
