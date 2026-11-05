import { Feedback } from '@/design-system/Feedback';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ageBandForAge } from '@/domain/policies/AgeBandPolicy';
import type { ChildProfile } from '@/domain/models/types';
import { AppButton } from '@/design-system/AppButton';
import { AppCard } from '@/design-system/AppCard';
import { AppTextInput } from '@/design-system/AppTextInput';
import { ScreenContainer } from '@/design-system/ScreenContainer';
import { theme } from '@/design-system/theme';
import { sha256 } from '@/shared/sha256';
import type { AppServices } from '@/shared/AppServices';

type Props = Readonly<{
  services: AppServices;
  onComplete: (profile: ChildProfile) => void;
}>;
export function OnboardingScreen({ services, onComplete }: Props) {
  const [name, setName] = useState('');
  const [ageText, setAgeText] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  async function submit() {
    const displayName = name.trim();
    const age = Number(ageText.trim());
    if (!displayName) {
      setError('Choose a nickname to continue.');
      return;
    }
    if (!Number.isInteger(age) || age < 7 || age > 14) {
      setError('Age must be a whole number from 7 to 14.');
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      const now = services.clock.now();
      const profile: ChildProfile = {
        id: `profile-${sha256(
          `${displayName.toLocaleLowerCase('en')}|${age}|${now}`,
        ).slice(0, 20)}`,
        displayName,
        age,
        ageBand: ageBandForAge(age),
        createdAt: now,
      };
      await services.childProfiles.create(profile);
      const settings = services.settings.get();
      services.settings.set({
        ...settings,
        onboardingCompleted: true,
        selectedProfileId: profile.id,
      });
      onComplete(profile);
    } catch {
      setError(
        'We couldn’t save your profile. Check your details and tap Create my profile to try again.',
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <ScreenContainer>
      <View style={styles.hero}>
        <Text accessibilityRole="header" style={styles.title}>
          Welcome to BrainQuest
        </Text>
        <Text style={styles.body}>
          A short, friendly learning adventure made just for you.
        </Text>
      </View>
      <AppCard>
        <AppTextInput
          label="Nickname"
          value={name}
          onChangeText={setName}
          placeholder="What should we call you?"
          maxLength={24}
          autoCapitalize="words"
        />
        <AppTextInput
          label="Age"
          value={ageText}
          onChangeText={setAgeText}
          placeholder="7 to 14"
          keyboardType="number-pad"
          maxLength={2}
        />
        <Text style={styles.note}>
          Your nickname and age stay on this device and help us choose suitable
          activities.
        </Text>
        {error ? (
          <Feedback title="A little help needed" message={error} />
        ) : null}
        <AppButton
          title="Create my profile"
          onPress={() => {
            submit().catch(() => undefined);
          }}
          loading={saving}
        />
      </AppCard>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  hero: { gap: theme.spacing.sm },
  title: { ...theme.text.title },
  body: { ...theme.text.body },
  note: { ...theme.text.label },
});
