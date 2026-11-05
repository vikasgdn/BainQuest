import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type {
  Badge,
  BadgeCode,
  Category,
  ProgressSummary,
} from '@/domain/models/types';
import { xpRequiredForLevel } from '@/domain/policies/ProgressionPolicy';
import type { AppServices } from '@/shared/AppServices';
import { ScreenContainer } from '@/design-system/ScreenContainer';
import { AppCard } from '@/design-system/AppCard';
import { AppButton } from '@/design-system/AppButton';
import { Feedback } from '@/design-system/Feedback';
import { theme } from '@/design-system/theme';

const categories: Record<Category, string> = {
  GK: 'General knowledge',
  LOGIC: 'Logic & memory',
  SCIENCE: 'Science',
  SPACE: 'Space',
  SPORTS: 'Sports',
};
const requirements: Record<BadgeCode, string> = {
  FIRST_STEPS: 'Complete your first session.',
  DAILY_7: 'Complete Daily 10 on seven consecutive days.',
  QUESTIONS_100: 'Answer 100 questions.',
  PERFECT_10: 'Answer all ten activities correctly in one Daily 10.',
  SCIENCE_EXPLORER: 'Answer 50 science questions correctly.',
  SPACE_EXPLORER: 'Answer 50 space questions correctly.',
  PUZZLE_SOLVER: 'Solve 50 generated puzzles correctly.',
};
const dateLabel = (instant: string) => new Date(instant).toLocaleDateString();

export function ProgressScreen({
  services,
  onHome,
}: Readonly<{
  services: AppServices;
  onHome: () => void;
}>) {
  const [data, setData] = useState<ProgressSummary>();
  const [badges, setBadges] = useState<readonly Badge[]>([]);
  const [selected, setSelected] = useState<BadgeCode>();
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      if (revision > 0) setSelected(undefined);
      setData(undefined);
      setError(false);
      const load = async () => {
        try {
          const id = services.settings.get().selectedProfileId;
          if (!id) throw new Error('No profile selected');
          const [summary, catalog] = await Promise.all([
            services.progress.getSummary(id),
            services.badges.list(),
          ]);
          if (active) {
            setData(summary);
            setBadges(catalog);
          }
        } catch {
          if (active) setError(true);
        }
      };
      load().catch(() => undefined);
      return () => {
        active = false;
      };
    }, [services, revision]),
  );
  const progress = data?.progress;
  const floor =
    progress && progress.level > 1 ? xpRequiredForLevel(progress.level) : 0;
  const ceiling = progress ? xpRequiredForLevel(progress.level + 1) : 400;
  const answered =
    data?.categories.reduce((sum, item) => sum + item.answered, 0) ?? 0;
  const correct =
    data?.categories.reduce((sum, item) => sum + item.correct, 0) ?? 0;
  return (
    <ScreenContainer>
      <Text accessibilityRole="header" style={styles.title}>
        Your progress
      </Text>
      {error ? (
        <>
          <Feedback
            title="Progress couldn’t load"
            message="Your saved adventure is still here. Try loading it again."
          />
          <AppButton
            title="Try again"
            onPress={() => setRevision(value => value + 1)}
          />
        </>
      ) : !data || !progress ? (
        <Text style={styles.body}>Loading your progress…</Text>
      ) : (
        <>
          <AppCard>
            <Text accessibilityRole="header" style={styles.heading}>
              Level {progress.level}
            </Text>
            <Text style={styles.body}>{progress.xp} total XP</Text>
            <Text style={styles.body}>
              {Math.max(0, ceiling - progress.xp)} XP to level{' '}
              {progress.level + 1}
            </Text>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel="XP toward next level"
              accessibilityValue={{
                min: floor,
                max: ceiling,
                now: progress.xp,
              }}
              style={styles.track}
            >
              <View
                style={[
                  styles.fill,
                  {
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        ((progress.xp - floor) / (ceiling - floor)) * 100,
                      ),
                    )}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.body}>
              Daily streak: {progress.currentStreak} days · Best:{' '}
              {progress.longestStreak} days
            </Text>
            <Text style={styles.caption}>
              Streak as of your last completed Daily 10. Every return is a fresh
              start.
            </Text>
          </AppCard>
          <AppCard>
            <Text accessibilityRole="header" style={styles.heading}>
              Learning so far
            </Text>
            <Text style={styles.body}>
              {data.completedSessions} completed sessions · {answered} answers
            </Text>
            <Text style={styles.body}>
              {answered
                ? `${Math.round((correct / answered) * 100)}% accuracy`
                : 'Your first answer starts your story.'}
            </Text>
            <Text style={styles.caption}>
              All saved answers count, including rounds still in progress.
            </Text>
          </AppCard>
          <Text accessibilityRole="header" style={styles.heading}>
            Your categories
          </Text>
          {Object.entries(categories).map(([category, title]) => {
            const stats = data.categories.find(
              item => item.category === category,
            );
            return (
              <AppCard key={category}>
                <Text style={styles.heading}>{title}</Text>
                <Text style={styles.body}>
                  {stats
                    ? `${stats.correct} of ${
                        stats.answered
                      } correct · ${Math.round(
                        (stats.correct / stats.answered) * 100,
                      )}% accuracy`
                    : 'No answers yet. Explore this topic when you’re ready.'}
                </Text>
              </AppCard>
            );
          })}
          <Text accessibilityRole="header" style={styles.heading}>
            Badges · {progress.earnedBadges.length} of {badges.length}
          </Text>
          {badges.map(badge => {
            const earned = progress.earnedBadges.find(
              item => item.code === badge.code,
            );
            return (
              <AppCard key={badge.code}>
                <Text style={styles.heading}>{badge.title}</Text>
                <Text style={styles.body}>
                  {earned
                    ? `Earned ${dateLabel(earned.earnedAt)}`
                    : 'Still to discover'}
                </Text>
                <AppButton
                  title={`${selected === badge.code ? 'Hide' : 'View'} ${
                    badge.title
                  } details`}
                  variant="secondary"
                  onPress={() =>
                    setSelected(
                      selected === badge.code ? undefined : badge.code,
                    )
                  }
                />
                {selected === badge.code && (
                  <Text accessibilityLiveRegion="polite" style={styles.body}>
                    {requirements[badge.code]}
                  </Text>
                )}
              </AppCard>
            );
          })}
          <Text accessibilityRole="header" style={styles.heading}>
            Recent sessions
          </Text>
          <Text style={styles.caption}>
            Your latest 20 completed sessions, newest first.
          </Text>
          {!data.recentSessions.length && (
            <Text style={styles.body}>
              Complete a round to see it here. Every small step counts.
            </Text>
          )}
          {data.recentSessions.map(session => (
            <AppCard key={session.sessionId}>
              <Text style={styles.heading}>
                {session.mode === 'DAILY_10' ? 'Daily 10' : 'Practice'} ·{' '}
                {dateLabel(session.completedAt)}
              </Text>
              <Text style={styles.body}>
                {session.correctCount} of {session.itemCount} correct ·{' '}
                {session.score} points · +{session.xpAwarded} XP
              </Text>
            </AppCard>
          ))}
        </>
      )}
      <AppButton title="Back to home" variant="secondary" onPress={onHome} />
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  title: { ...theme.text.title },
  heading: { ...theme.text.heading },
  body: { ...theme.text.body },
  caption: { ...theme.text.label, color: theme.colors.muted },
  track: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: theme.colors.primaryContainer,
  },
  fill: { height: 10, backgroundColor: theme.colors.primary },
});
