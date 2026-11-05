import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { Feedback } from './Feedback';
import { theme } from './theme';

type Props = TextInputProps & Readonly<{ label: string; error?: string }>;
export function AppTextInput({
  label,
  error,
  accessibilityLabel,
  ...props
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={accessibilityLabel ?? label}
        style={styles.input}
        placeholderTextColor="#68748A"
      />
      {error ? <Feedback title={error} /> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { gap: theme.spacing.sm },
  label: { ...theme.text.label },
  input: {
    ...theme.text.body,
    paddingVertical: 14,
    minHeight: 52,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
});
