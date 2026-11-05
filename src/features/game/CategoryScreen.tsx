import { Feedback } from '@/design-system/Feedback';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import type { Category, ChildProfile } from '@/domain/models/types';
import { createMcqSession } from '@/domain/use-cases/createMcqSession';
import type { AppServices } from '@/shared/AppServices';
import { AnswerOption } from '@/design-system/AnswerOption';
import { AppButton } from '@/design-system/AppButton';
import { AppCard } from '@/design-system/AppCard';
import { ScreenContainer } from '@/design-system/ScreenContainer';
import { theme } from '@/design-system/theme';

const CATEGORIES: readonly Category[] = [
  'GK',
  'SCIENCE',
  'SPORTS',
  'SPACE',
  'LOGIC',
];
const LABELS: Readonly<Record<Category, string>> = {
  GK: 'General Knowledge',
  SCIENCE: 'Science',
  SPORTS: 'Sports',
  SPACE: 'Space',
  LOGIC: 'Logic',
};

type Props = Readonly<{
  services: AppServices;
  profileId: string;
  onSessionReady: (sessionId: string) => void;
}>;

export function CategoryScreen({ services, profileId, onSessionReady }: Props) {
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [selected, setSelected] = useState<Category>('GK');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  useEffect(() => {
    services.childProfiles
      .get(profileId)
      .then(setProfile)
      .catch(() =>
        setError(
          'We couldn’t load your profile. Go back and open category practice again.',
        ),
      );
  }, [profileId, services]);
  async function start() {
    if (!profile) return;
    setBusy(true);
    setError(undefined);
    try {
      const result = await createMcqSession(services, {
        profile,
        category: selected,
        count: 2,
      });
      if (result.kind === 'insufficient-content') {
        setError(
          `There are ${result.available} suitable questions available right now. Choose another category to play.`,
        );
        return;
      }
      onSessionReady(result.session.plan.id);
    } catch {
      setError(
        'Practice couldn’t start. Please tap Start practice to try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScreenContainer>
      <Text accessibilityRole="header" style={styles.title}>
        Choose a category
      </Text>
      <Text style={styles.body}>
        Pick a topic for a short MCQ practice round.
      </Text>
      {CATEGORIES.map(category => (
        <AnswerOption
          key={category}
          title={LABELS[category]}
          state={selected === category ? 'selected' : 'default'}
          disabled={busy}
          accessibilityLabel={`${LABELS[category]} category`}
          onPress={() => setSelected(category)}
        />
      ))}
      {error ? <Feedback title="A little help needed" message={error} /> : null}
      <AppCard>
        <Text style={styles.body}>
          Two questions, instant feedback, and a clear explanation after every
          answer.
        </Text>
        <AppButton
          title="Start practice"
          onPress={() => {
            start().catch(() => undefined);
          }}
          loading={busy}
          disabled={!profile}
        />
      </AppCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...theme.text.title },
  body: { ...theme.text.body },
});
