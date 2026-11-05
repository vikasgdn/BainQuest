import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { ScreenContainer } from '@/design-system/ScreenContainer';
import { theme } from '@/design-system/theme';
export function PlaceholderScreen({ title }: Readonly<{ title: string }>) {
  return (
    <ScreenContainer>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.body}>
        This part of BrainQuest is coming in a later phase.
      </Text>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  title: { ...theme.text.title },
  body: { ...theme.text.body },
});
