import React from 'react';
import { StyleSheet, Text } from 'react-native';
import type { SessionResult } from '@/domain/models/types';
import { AppButton } from '@/design-system/AppButton';
import { AppCard } from '@/design-system/AppCard';
import { ScreenContainer } from '@/design-system/ScreenContainer';
import { theme } from '@/design-system/theme';

type Props = Readonly<{ result: SessionResult; onHome: () => void }>;
export function ResultScreen({ result, onHome }: Props) {
  return (
    <ScreenContainer>
      <Text accessibilityRole="header" style={styles.title}>
        Practice complete!
      </Text>
      <AppCard>
        <Text style={styles.metric}>
          {result.correctCount} / {result.itemCount}
        </Text>
        <Text style={styles.body}>correct answers</Text>
        <Text style={styles.metric}>{result.score}</Text>
        <Text style={styles.body}>points · {result.xpAwarded} XP earned</Text>
      </AppCard>
      <Text style={styles.body}>
        Nice work. Every answer is a step toward learning something new.
      </Text>
      <AppButton title="Back to Home" onPress={onHome} />
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  title: { ...theme.text.title },
  metric: {
    ...theme.text.title,
    fontSize: 32,
    lineHeight: 40,
    color: theme.colors.primary,
  },
  body: { ...theme.text.body },
});
