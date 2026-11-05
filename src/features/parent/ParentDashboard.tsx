import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import type { ChildProfile, ProgressSummary } from '@/domain/models/types';
import type { ParentGate } from '@/domain/use-cases/ParentGate';
import { deleteParentProfile } from '@/domain/use-cases/deleteParentProfile';
import type { AppServices } from '@/shared/AppServices';
import type { AppSettings } from '@/shared/AppSettings';
import { ScreenContainer } from '@/design-system/ScreenContainer';
import { AppCard } from '@/design-system/AppCard';
import { AppButton } from '@/design-system/AppButton';
import { Feedback } from '@/design-system/Feedback';
import { theme } from '@/design-system/theme';

const categoryLabels = {
  GK: 'General knowledge',
  LOGIC: 'Logic & memory',
  SCIENCE: 'Science',
  SPACE: 'Space',
  SPORTS: 'Sports',
};
const preferences: readonly Readonly<{
  key: 'soundEnabled' | 'hapticEnabled' | 'reducedMotion' | 'extendedTime';
  title: string;
  detail: string;
}>[] = [
  {
    key: 'soundEnabled',
    title: 'Sound preference',
    detail: 'Saved for audio features. This version plays no sounds.',
  },
  {
    key: 'hapticEnabled',
    title: 'Haptic preference',
    detail: 'Saved for vibration features. This version does not vibrate.',
  },
  {
    key: 'reducedMotion',
    title: 'Reduce motion',
    detail:
      'Turn off screen transition animations. System reduced motion is always respected.',
  },
  {
    key: 'extendedTime',
    title: 'Extra memory time',
    detail:
      'Allow 50% more memorization time in new Daily 10 rounds. Saved rounds keep their original timing.',
  },
];
export function ParentDashboard({
  services,
  gate,
  onExit,
  onDeleted,
}: Readonly<{
  services: AppServices;
  gate: ParentGate;
  onExit: () => void;
  onDeleted: () => void;
}>) {
  const [profile, setProfile] = useState<ChildProfile>();
  const [summary, setSummary] = useState<ProgressSummary>();
  const [settings, setSettings] = useState(() => services.settings.get());
  const [revision, setRevision] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [message, setMessage] = useState<string>();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const deleting = useRef(false);
  useEffect(() => {
    let active = true;
    setLoadError(false);
    const load = async () => {
      try {
        const id = services.settings.get().selectedProfileId;
        if (!id || !gate.unlocked) throw new Error('Profile unavailable');
        const [child, data] = await Promise.all([
          services.childProfiles.get(id),
          services.progress.getSummary(id),
        ]);
        if (!child) throw new Error('Profile unavailable');
        if (active) {
          setProfile(child);
          setSummary(data);
        }
      } catch {
        if (active) setLoadError(true);
      }
    };
    load().catch(() => undefined);
    return () => {
      active = false;
    };
  }, [services, gate, revision]);
  function save() {
    if (!gate.unlocked) return;
    try {
      // Keep profile selection and onboarding flags owned by their own flows.
      const current = services.settings.get();
      services.settings.set({
        ...current,
        soundEnabled: settings.soundEnabled,
        hapticEnabled: settings.hapticEnabled,
        reducedMotion: settings.reducedMotion,
        extendedTime: settings.extendedTime,
      });
      setMessage('Settings saved.');
    } catch {
      setMessage('Settings couldn’t be saved. Please try again.');
    }
  }
  async function remove() {
    if (!profile || !confirming || deleting.current || !gate.unlocked) return;
    deleting.current = true;
    setBusy(true);
    setMessage(undefined);
    try {
      await deleteParentProfile(services, gate, profile.id);
      onDeleted();
    } catch {
      setMessage(
        'Deletion couldn’t finish. Try again to complete removal. If you reopen the app, a removed profile returns to setup.',
      );
    } finally {
      deleting.current = false;
      setBusy(false);
    }
  }
  const answered =
    summary?.categories.reduce((sum, item) => sum + item.answered, 0) ?? 0;
  const correct =
    summary?.categories.reduce((sum, item) => sum + item.correct, 0) ?? 0;
  const suggestions =
    summary?.categories.filter(
      item => item.answered >= 5 && item.correct / item.answered < 0.55,
    ) ?? [];
  return (
    <ScreenContainer>
      <Text accessibilityRole="header" style={styles.title}>
        Parent area
      </Text>
      {loadError ? (
        <>
          <Feedback
            title="Report couldn’t load"
            message="Try loading the saved profile again."
          />
          <AppButton
            title="Try again"
            onPress={() => setRevision(value => value + 1)}
          />
        </>
      ) : !profile || !summary ? (
        <Text style={styles.body}>Loading the learning report…</Text>
      ) : (
        <>
          <AppCard>
            <Text accessibilityRole="header" style={styles.heading}>
              {profile.displayName}’s learning report
            </Text>
            <Text style={styles.body}>
              {summary.completedSessions} completed sessions · {answered}{' '}
              answers
            </Text>
            <Text style={styles.body}>
              {answered
                ? `${Math.round((correct / answered) * 100)}% accuracy`
                : 'No answers yet'}
            </Text>
            <Text style={styles.body}>
              Recorded answer time:{' '}
              {Math.floor(summary.totalDurationMs / 60000)} min{' '}
              {Math.floor(summary.totalDurationMs / 1000) % 60} sec
            </Text>
            <Text style={styles.caption}>
              Lifetime saved answers, including unfinished rounds. Answer time
              measures submitted activities, not total screen time.
            </Text>
          </AppCard>
          <AppCard>
            <Text accessibilityRole="header" style={styles.heading}>
              Topics to practise together
            </Text>
            <Text style={styles.caption}>
              Suggestions appear after at least five answers in a topic with
              accuracy below 55%. They describe practice, not ability.
            </Text>
            {suggestions.length ? (
              suggestions.map(item => (
                <Text key={item.category} style={styles.body}>
                  {categoryLabels[item.category]}: {item.correct} of{' '}
                  {item.answered} correct
                </Text>
              ))
            ) : (
              <Text style={styles.body}>
                No suggestions yet. Keep exploring a mix of topics together.
              </Text>
            )}
            {summary.categories.map(item => (
              <Text key={item.category} style={styles.body}>
                {categoryLabels[item.category]} · {item.answered} answers ·{' '}
                {Math.round((item.correct / item.answered) * 100)}% accuracy
              </Text>
            ))}
          </AppCard>
        </>
      )}
      <Text accessibilityRole="header" style={styles.heading}>
        Settings
      </Text>
      {preferences.map(preference => (
        <AppCard key={preference.key}>
          <View style={styles.setting}>
            <Text style={styles.settingTitle}>{preference.title}</Text>
            <Switch
              accessibilityLabel={preference.title}
              value={settings[preference.key]}
              onValueChange={value => {
                setSettings(
                  current =>
                    ({ ...current, [preference.key]: value } as AppSettings),
                );
                setMessage(undefined);
              }}
              disabled={busy}
            />
          </View>
          <Text style={styles.caption}>{preference.detail}</Text>
        </AppCard>
      ))}
      <AppButton title="Save settings" onPress={save} disabled={busy} />
      {message && <Feedback title={message} />}
      <AppCard>
        <Text accessibilityRole="header" style={styles.heading}>
          Privacy and local data
        </Text>
        <Text style={styles.body}>
          The nickname, age, answers and learning progress are stored on this
          device. The app has no accounts, advertising or analytics uploads. It
          does not ask for email, phone, location, photos or microphone access.
        </Text>
        <Text style={styles.body}>
          Deleting a profile removes its saved sessions, answers, XP, streaks
          and earned badges. The shared question bank and device preferences
          stay available.
        </Text>
      </AppCard>
      {profile && (
        <AppCard>
          <Text accessibilityRole="header" style={styles.heading}>
            Delete this profile
          </Text>
          {confirming ? (
            <>
              <Text style={styles.body}>
                Permanently delete {profile.displayName}’s profile and all of
                their learning history from this device? This cannot be undone.
                You’ll return to setup.
              </Text>
              <AppButton
                title="Permanently delete profile"
                loading={busy}
                onPress={() => {
                  remove().catch(() => undefined);
                }}
              />
              <AppButton
                title="Keep profile"
                variant="secondary"
                disabled={busy}
                onPress={() => {
                  setConfirming(false);
                  setMessage(undefined);
                }}
              />
            </>
          ) : (
            <AppButton
              title="Delete profile and history"
              variant="secondary"
              onPress={() => setConfirming(true)}
            />
          )}
        </AppCard>
      )}
      <AppButton
        title="Close Parent area"
        variant="secondary"
        disabled={busy}
        onPress={onExit}
      />
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  title: { ...theme.text.title },
  heading: { ...theme.text.heading },
  body: { ...theme.text.body },
  caption: { ...theme.text.label, color: theme.colors.muted },
  setting: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  settingTitle: {
    ...theme.text.body,
    fontWeight: '700',
    flexGrow: 1,
    flexShrink: 1,
  },
});
