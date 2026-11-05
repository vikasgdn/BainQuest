import { theme } from '@/design-system/theme';
import { Feedback } from '@/design-system/Feedback';
import React, { useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import type { AppServices } from '@/shared/AppServices';
import { createDailySession } from '@/domain/use-cases/createDailySession';
import { ScreenContainer } from '@/design-system/ScreenContainer';
import { AppButton } from '@/design-system/AppButton';

export function DailyScreen({
  services,
  onSessionReady,
}: Readonly<{
  services: AppServices;
  onSessionReady: (sessionId: string) => void;
}>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const lock = useRef(false);
  async function open() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const id = services.settings.get().selectedProfileId;
      const profile = id ? await services.childProfiles.get(id) : null;
      if (!profile) throw new Error('Please select a profile first.');
      const result = await createDailySession(services, profile);
      if (result.kind === 'insufficient-content')
        throw new Error(
          'There are not enough activities for your age yet. Try category practice.',
        );
      onSessionReady(result.session.plan.id);
    } catch (cause) {
      setError(
        cause instanceof Error &&
          cause.message.includes('not enough activities')
          ? cause.message
          : 'We couldn’t open today’s round. Tap Start or resume today to try again.',
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <ScreenContainer>
      <Text accessibilityRole="header" style={styles.title}>
        Daily 10
      </Text>
      <Text style={styles.body}>
        Ten activities: knowledge, patterns and a memory challenge. Come back
        anytime to continue today’s round.
      </Text>
      {error ? <Feedback title="A little help needed" message={error} /> : null}
      <AppButton
        title={busy ? 'Preparing your round…' : 'Start or resume today'}
        disabled={busy}
        onPress={() => {
          open().catch(() => undefined);
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...theme.text.title },
  body: { ...theme.text.body },
});
