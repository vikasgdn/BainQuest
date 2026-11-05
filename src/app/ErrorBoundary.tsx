import React, { Component, type PropsWithChildren } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Feedback } from '@/design-system/Feedback';
import { theme } from '@/design-system/theme';
type State = { hasError: boolean };
export class ErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(): State {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <ScrollView contentContainerStyle={styles.container}>
          <Feedback
            title="Your adventure needs a restart"
            message="Please close and reopen BrainQuest to continue with your saved progress."
          />
        </ScrollView>
      );
    }
    return this.props.children;
  }
}
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  message: { fontSize: theme.typography.body, color: theme.colors.text },
});
