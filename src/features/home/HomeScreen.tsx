import React, { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { ChildProfile, PlayerProgress } from '@/domain/models/types';
import type { AppServices } from '@/shared/AppServices';
import { AppButton } from '@/design-system/AppButton';
import { AppCard } from '@/design-system/AppCard';
import { ScreenContainer } from '@/design-system/ScreenContainer';
import { Feedback } from '@/design-system/Feedback';
import { xpRequiredForLevel } from '@/domain/policies/ProgressionPolicy';
import { theme } from '@/design-system/theme';
type Props = Readonly<{
  services: AppServices;
  onOpenPlaceholder: (
    route: 'Daily10' | 'Category' | 'Progress' | 'Parent',
  ) => void;
}>;
export function HomeScreen({ services, onOpenPlaceholder }: Props) {
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 360 || fontScale > 1.3;
  const [revision, setRevision] = useState(0);
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [progress, setProgress] = useState<PlayerProgress | null>(null);
  const [error, setError] = useState<string>();
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const id = services.settings.get().selectedProfileId;
        if (!id) throw new Error('No selected profile.');
        const [nextProfile, nextProgress] = await Promise.all([
          services.childProfiles.get(id),
          services.progress.get(id),
        ]);
        if (!nextProfile) throw new Error('Profile unavailable');
        if (mounted) {
          setProfile(nextProfile);
          setProgress(nextProgress);
        }
      } catch {
        if (mounted)
          setError(
            'We couldn’t load your progress. Tap Try again to reconnect to your saved adventure.',
          );
      }
    };
    load().catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [services, revision]);
  if (error)
    return (
      <ScreenContainer>
        <Feedback title="Let’s try that again" message={error} />
        <AppButton
          title="Try again"
          onPress={() => {
            setError(undefined);
            setRevision(value => value + 1);
          }}
        />
      </ScreenContainer>
    );
  if (!profile || !progress)
    return (
      <ScreenContainer>
        <Text accessibilityRole="header" style={styles.title}>
          Loading your adventure…
        </Text>
      </ScreenContainer>
    );
  const initials = profile.displayName.slice(0, 2).toUpperCase();
  const nextLevelXp = xpRequiredForLevel(progress.level + 1);
  return (
    <ScreenContainer>
      <View style={styles.strip}>
        <Text style={styles.capsule}>
          🔥 {progress.currentStreak} day streak
        </Text>
        <Text style={styles.capsule}>★ {progress.xp} XP</Text>
        <View
          accessibilityLabel={`${profile.displayName}, level ${progress.level}`}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      </View>
      <View style={styles.greeting}>
        <Text accessibilityRole="header" style={styles.title}>
          Hi, {profile.displayName}!
        </Text>
        <Text style={styles.body}>Ready for a little brain boost? 👋</Text>
      </View>
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>✦ YOUR DAILY 10 WORKOUT</Text>
        <Text accessibilityRole="header" style={styles.heroTitle}>
          Small steps. Brighter minds.
        </Text>
        <Text style={styles.heroBody}>
          Ten activities with knowledge, patterns and a memory challenge. A
          fresh adventure, every day.
        </Text>
        <View style={styles.heroNote}>
          <Text style={styles.heroBody}>🧠 Recall · Discover · Solve</Text>
        </View>
        <AppButton
          title="Open Daily 10"
          variant="secondary"
          onPress={() => onOpenPlaceholder('Daily10')}
        />
      </View>
      <View style={[styles.metrics, compact && styles.stacked]}>
        {[
          ['🏆', String(progress.level), 'Level'],
          ['🔥', String(progress.currentStreak), 'Day streak'],
          ['★', String(progress.xp), 'Total XP'],
        ].map(([icon, value, label]) => (
          <View key={label} style={styles.metricCard}>
            <Text style={styles.label}>
              {icon} {label}
            </Text>
            <Text style={styles.metric}>{value}</Text>
          </View>
        ))}
      </View>
      <AppCard>
        <Text style={styles.cardTitle}>Growing with every question</Text>
        <Text style={styles.body}>
          {Math.max(0, nextLevelXp - progress.xp)} XP to level{' '}
          {progress.level + 1}
        </Text>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="XP toward next level"
          accessibilityValue={{ min: 0, max: nextLevelXp, now: progress.xp }}
          style={styles.track}
        >
          <View
            style={[
              styles.fill,
              { width: `${Math.min(100, (progress.xp / nextLevelXp) * 100)}%` },
            ]}
          />
        </View>
      </AppCard>
      <Text accessibilityRole="header" style={styles.section}>
        Explore & train
      </Text>
      <View style={[styles.grid, compact && styles.stacked]}>
        {[
          {
            icon: '💡',
            title: 'Knowledge',
            detail: 'Trivia, science & space',
            route: 'Category' as const,
            color: '#FFF3D6',
          },
          {
            icon: '🧩',
            title: 'Logic & patterns',
            detail: 'Discover your next challenge',
            route: 'Category' as const,
            color: '#E8E5FF',
          },
          {
            icon: '🧠',
            title: 'Memory',
            detail: 'Recall challenge in Daily 10',
            route: 'Daily10' as const,
            color: '#F4E7FA',
          },
          {
            icon: '🌍',
            title: 'More to discover',
            detail: 'Explore all practice topics',
            route: 'Category' as const,
            color: '#E4F3EE',
          },
        ].map(item => (
          <Pressable
            key={item.title}
            accessibilityRole="button"
            onPress={() => onOpenPlaceholder(item.route)}
            style={({ pressed }) => [
              styles.tile,
              compact && styles.fullTile,
              { backgroundColor: item.color },
              pressed && styles.pressed,
            ]}
          >
            <Text accessible={false} style={styles.tileIcon}>
              {item.icon}
            </Text>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.label}>{item.detail}</Text>
          </Pressable>
        ))}
      </View>
      <AppButton
        title="Practice a category"
        variant="secondary"
        onPress={() => onOpenPlaceholder('Category')}
      />
      <Text accessibilityRole="header" style={styles.section}>
        Your learning journey
      </Text>
      <AppCard>
        <Text style={styles.cardTitle}>📊 Progress & milestones</Text>
        <Text style={styles.body}>Every little win counts.</Text>
        <AppButton
          title="View progress"
          variant="secondary"
          onPress={() => onOpenPlaceholder('Progress')}
        />
      </AppCard>
      <AppButton
        title="Parent area"
        variant="secondary"
        onPress={() => onOpenPlaceholder('Parent')}
      />
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  title: { ...theme.text.title },
  body: { ...theme.text.body, color: theme.colors.muted },
  section: { ...theme.text.heading, marginTop: 8 },
  cardTitle: { ...theme.text.body, fontWeight: '700' },
  label: { ...theme.text.label },
  greeting: { gap: 4 },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  capsule: {
    ...theme.text.label,
    color: theme.colors.onPrimaryContainer,
    backgroundColor: theme.colors.primaryContainer,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  avatar: {
    marginLeft: 'auto',
    borderRadius: 24,
    padding: 12,
    backgroundColor: theme.colors.primary,
  },
  avatarText: { ...theme.text.label, color: '#FFFFFF' },
  hero: {
    padding: 24,
    gap: 16,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
  },
  heroLabel: { ...theme.text.label, color: '#E8E5FF' },
  heroTitle: {
    ...theme.text.title,
    fontSize: 32,
    lineHeight: 40,
    color: '#FFFFFF',
  },
  heroBody: { ...theme.text.body, color: '#FFFFFF' },
  heroNote: { paddingVertical: 12, borderTopWidth: 1, borderColor: '#827ADD' },
  metrics: { flexDirection: 'row', gap: 8 },
  stacked: { flexDirection: 'column' },
  metricCard: {
    flex: 1,
    padding: 14,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  metric: { ...theme.text.title, color: theme.colors.primary },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primaryContainer,
    overflow: 'hidden',
  },
  fill: { height: 8, backgroundColor: theme.colors.primary, borderRadius: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    padding: 16,
    borderRadius: 24,
    gap: 8,
  },
  fullTile: { flexBasis: 'auto' },
  tileIcon: { fontSize: 28, lineHeight: 36 },
  pressed: { opacity: 0.8 },
});
