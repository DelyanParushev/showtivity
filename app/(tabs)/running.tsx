import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useCategorizedShows } from '../../hooks/useShows';
import { RunningShowCard } from '../../components/RunningShowCard';
import { EmptyState, LoadingSpinner } from '../../components/UI';
import { Colors, Spacing, Typography } from '../../constants/theme';
import type { EnrichedShow } from '../../types/trakt';

export default function RunningScreen() {
  const router = useRouter();
  const { running, waiting, isLoading, refetch } = useCategorizedShows();

  const navigateTo = (show: EnrichedShow) =>
    router.push({
      pathname: '/show/[id]',
      params: { id: show.show.ids.slug, title: show.show.title },
    });

  const airingToday = running.filter((s) => (s.daysUntilNext ?? null) !== null && (s.daysUntilNext ?? 999) <= 0);
  const airingThisWeek = running.filter(
    (s) => (s.daysUntilNext ?? null) !== null && (s.daysUntilNext ?? 999) > 0 && (s.daysUntilNext ?? 999) <= 7
  );
  const airingLater = running.filter((s) => (s.daysUntilNext ?? null) !== null && (s.daysUntilNext ?? 999) > 7);

  // Awaiting release: explicit waiting-status shows + running shows with no confirmed date yet
  const runningNoDate = running.filter((s) => s.daysUntilNext == null);
  const awaitingRelease = [...waiting, ...runningNoDate];

  const totalCount = running.length + waiting.length;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner label="Loading airing schedule…" />
      </SafeAreaView>
    );
  }

  if (totalCount === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="tv-outline"
          message="No airing or upcoming series"
          subMessage="Add currently airing or in-production shows to track them here"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={Colors.accent.primary}
          />
        }
      >
        {/* Page header */}
        <View style={styles.pageHeader}>
          <Text style={styles.headerTitle}>Airing Schedule</Text>
          <Text style={styles.headerSub}>
            {running.length} airing · {awaitingRelease.length} awaiting release
          </Text>
        </View>

        {/* ─── SECTION 1: AIRING ─── */}
        {running.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: Colors.status.running }]} />
              <Text style={[styles.sectionTitle, { color: Colors.status.running }]}>Airing</Text>
              <View style={[styles.sectionLine, { backgroundColor: Colors.status.running + '33' }]} />
              <Text style={[styles.sectionCount, { color: Colors.status.running }]}>{running.length}</Text>
            </View>

            {airingToday.length > 0 && (
              <View style={styles.subSection}>
                <View style={styles.subSectionHeader}>
                  <View style={[styles.subDot, { backgroundColor: Colors.status.running }]} />
                  <Text style={[styles.subSectionLabel, { color: Colors.status.running }]}>Today</Text>
                  <Text style={[styles.subSectionCount, { color: Colors.status.running }]}>{airingToday.length}</Text>
                </View>
                {airingToday.map((item) => (
                  <RunningShowCard key={item.show.ids.trakt} item={item} onPress={() => navigateTo(item)} />
                ))}
              </View>
            )}

            {airingThisWeek.length > 0 && (
              <View style={styles.subSection}>
                <View style={styles.subSectionHeader}>
                  <View style={[styles.subDot, { backgroundColor: Colors.status.watching }]} />
                  <Text style={[styles.subSectionLabel, { color: Colors.status.watching }]}>This Week</Text>
                  <Text style={[styles.subSectionCount, { color: Colors.status.watching }]}>{airingThisWeek.length}</Text>
                </View>
                {airingThisWeek.map((item) => (
                  <RunningShowCard key={item.show.ids.trakt} item={item} onPress={() => navigateTo(item)} />
                ))}
              </View>
            )}

            {airingLater.length > 0 && (
              <>
                {airingLater.map((item) => (
                  <RunningShowCard key={item.show.ids.trakt} item={item} onPress={() => navigateTo(item)} />
                ))}
              </>
            )}
          </View>
        )}

        {/* ─── SECTION 2: AWAITING RELEASE DATE ─── */}
        {awaitingRelease.length > 0 && (
          <View style={[styles.section, styles.awaitingSection]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: Colors.status.waiting }]} />
              <Text style={[styles.sectionTitle, { color: Colors.status.waiting }]}>Awaiting Release Date</Text>
              <View style={[styles.sectionLine, { backgroundColor: Colors.status.waiting + '33' }]} />
              <Text style={[styles.sectionCount, { color: Colors.status.waiting }]}>{awaitingRelease.length}</Text>
            </View>
            {awaitingRelease.map((item) => (
              <RunningShowCard key={item.show.ids.trakt} item={item} onPress={() => navigateTo(item)} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
  },
  pageHeader: {
    paddingTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  headerTitle: {
    color: Colors.text.primary,
    fontSize: Typography['2xl'],
    fontWeight: '800',
    marginBottom: 4,
  },
  headerSub: {
    color: Colors.text.muted,
    fontSize: Typography.sm,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  awaitingSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  sectionTitle: {
    fontSize: Typography.sm,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionLine: {
    flex: 1,
    height: 1,
  },
  sectionCount: {
    fontSize: Typography.sm,
    fontWeight: '700',
  },
  subSection: {
    marginBottom: Spacing.md,
    paddingLeft: Spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: Colors.border,
  },
  subSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  subDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  subSectionLabel: {
    flex: 1,
    fontSize: Typography.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subSectionCount: {
    fontSize: Typography.xs,
    fontWeight: '700',
  },
});
