import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from './theme';

export function Feedback({
  title,
  message,
  kind = 'error',
}: Readonly<{
  title: string;
  message?: string;
  kind?: 'error' | 'success';
}>) {
  const success = kind === 'success';
  const color = success ? theme.colors.success : theme.colors.error;
  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.container,
        {
          backgroundColor: success
            ? theme.colors.successContainer
            : theme.colors.errorContainer,
        },
      ]}
    >
      <Text accessible={false} style={[styles.icon, { color }]}>
        {success ? '✓' : '!'}
      </Text>
      <View style={styles.copy}>
        <Text style={[styles.title, { color }]}>{title}</Text>
        {message ? (
          <Text style={[theme.text.body, { color }]}>{message}</Text>
        ) : null}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    marginVertical: 4,
  },
  icon: {
    ...theme.text.button,
    textAlign: 'center',
    width: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  copy: { flex: 1, gap: 4 },
  title: { ...theme.text.body, fontWeight: '700' },
});
