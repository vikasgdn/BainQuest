import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type GestureResponderEvent,
} from 'react-native';
import { theme } from './theme';

type Props = Readonly<{
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
  accessibilityLabel?: string;
}>;
export function AppButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  accessibilityLabel,
}: Props) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'secondary' ? styles.secondary : styles.primary,
        inactive && styles.disabled,
        pressed && !inactive && styles.pressed,
      ]}
    >
      <>
        {loading ? (
          <ActivityIndicator
            color={variant === 'secondary' ? theme.colors.primary : '#fff'}
          />
        ) : (
          <Text
            style={[
              styles.text,
              variant === 'secondary'
                ? styles.secondaryText
                : styles.primaryText,
              inactive && styles.disabledText,
            ]}
          >
            {title}
          </Text>
        )}
      </>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 14,
  },
  primary: { backgroundColor: theme.colors.primary },
  secondary: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  disabled: {
    backgroundColor: theme.colors.disabled,
    borderColor: theme.colors.disabled,
  },
  disabledText: { color: theme.colors.onDisabled },
  pressed: { opacity: 0.85 },
  text: { ...theme.text.button, textAlign: 'center', flexShrink: 1 },
  primaryText: { color: '#fff' },
  secondaryText: { color: theme.colors.primary },
});
