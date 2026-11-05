import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from './theme';

export type AnswerState = 'default' | 'selected' | 'correct' | 'incorrect';
export function AnswerOption({
  title,
  state = 'default',
  disabled = false,
  onPress,
  accessibilityLabel,
}: Readonly<{
  title: string;
  state?: AnswerState;
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}>) {
  const color =
    state === 'correct'
      ? theme.colors.success
      : state === 'incorrect'
      ? theme.colors.error
      : state === 'selected'
      ? theme.colors.primary
      : theme.colors.text;
  const symbol =
    state === 'correct'
      ? '✓'
      : state === 'incorrect'
      ? '✕'
      : state === 'selected'
      ? '●'
      : '○';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${accessibilityLabel ?? title}${
        state === 'correct'
          ? ', correct answer'
          : state === 'incorrect'
          ? ', incorrect answer'
          : ''
      }`}
      accessibilityState={{ selected: state === 'selected', disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[state],
        disabled && state === 'default' && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text accessible={false} style={[theme.text.body, { color }]}>
        {symbol}
      </Text>
      <Text style={[styles.label, { color }]}>{title}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 2,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  default: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.outline,
  },
  selected: {
    backgroundColor: theme.colors.primaryContainer,
    borderColor: theme.colors.primary,
  },
  correct: {
    backgroundColor: theme.colors.successContainer,
    borderColor: theme.colors.success,
  },
  incorrect: {
    backgroundColor: theme.colors.errorContainer,
    borderColor: theme.colors.error,
  },
  disabled: {
    backgroundColor: theme.colors.surfaceVariant,
    borderColor: theme.colors.border,
  },
  pressed: { opacity: 0.8 },
  label: { ...theme.text.body, flex: 1, fontWeight: '600' },
});
