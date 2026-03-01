import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Image,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCategorizedShows } from '../../hooks/useShows';
import { RunningShowCard } from '../../components/RunningShowCard';
import { EmptyState, LoadingSpinner } from '../../components/UI';
import { CategoryConfig, Colors, Radius, Spacing, Typography } from '../../constants/theme';
import { getTmdbPoster } from '../../services/traktApi';
import { TMDB_CONFIG } from '../../config/trakt';
import type { EnrichedShow } from '../../types/trakt';

const GRID_COLS = 3;
const GRID_GAP = 8;

export default function RunningScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { running, awaitingRelease, isLoading, refetch } = useCategorizedShows();

  const contentWidth = width - Spacing.lg * 2;
  const posterWidth = (contentWidth - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;
  const posterHeight = posterWidth * 1.5;

  const navigateTo = (show: EnrichedShow) =>
    router.push({
      pathname: '/show/[id]',
      params: { id: show.show.ids.slug, title: show.show.title },
    });

  // Only show episodes airing today or in the future — past dates mean the user
  // just has unwatched episodes to catch up on (those stay in Currently Watching)
  const thisWeek = running.filter(
    (s) => s.daysUntilNext !== null && s.daysUntilNext >= 0 && s.daysUntilNext < 7
  );
  const airingSoon = running.filter((s) => s.daysUntilNext !== null && s.daysUntilNext >= 7);

  const totalCount = (thisWeek.length + airingSoon.length) + awaitingRelease.length;

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
            {thisWeek.length + airingSoon.length} airing · {awaitingRelease.length} awaiting release
          </Text>
        </View>

        {/* ─── SECTION 1: AIRING ─── */}
        {running.length > 0 && (
          <View style={styles.section}>
            {thisWeek.length > 0 && (
              <View style={styles.subSection}>
                <View style={styles.subSectionHeader}>
                  <View style={[styles.subDot, { backgroundColor: Colors.status.running }]} />
                  <Text style={[styles.subSectionLabel, { color: Colors.status.running }]}>This Week</Text>
                  <Text style={[styles.subSectionCount, { color: Colors.status.running }]}>{thisWeek.length}</Text>
                </View>
                {thisWeek.map((item) => (
                  <RunningShowCard key={item.show.ids.trakt} item={item} onPress={() => navigateTo(item)} hideBadge showCategoryIcon />
                ))}
              </View>
            )}

            {airingSoon.length > 0 && (
              <View style={styles.subSection}>
                <View style={styles.subSectionHeader}>
                  <View style={[styles.subDot, { backgroundColor: Colors.status.watching }]} />
                  <Text style={[styles.subSectionLabel, { color: Colors.status.watching }]}>Airing Soon</Text>
                  <Text style={[styles.subSectionCount, { color: Colors.status.watching }]}>{airingSoon.length}</Text>
                </View>
                {airingSoon.map((item) => (
                  <RunningShowCard key={item.show.ids.trakt} item={item} onPress={() => navigateTo(item)} hideBadge showCategoryIcon />
                ))}
              </View>
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
            <View style={styles.posterGrid}>
              {awaitingRelease.map((item) => (
                <AwaitingPosterCard
                  key={item.show.ids.trakt}
                  item={item}
                  onPress={() => navigateTo(item)}
                  posterWidth={posterWidth}
                  posterHeight={posterHeight}
                />
              ))}
            </View>
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
  posterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
});

function AwaitingPosterCard({
  item,
  onPress,
  posterWidth,
  posterHeight,
}: {
  item: EnrichedShow;
  onPress: () => void;
  posterWidth: number;
  posterHeight: number;
}) {
  const { show } = item;
  const [failed, setFailed] = React.useState(false);

  const { data: images } = useQuery({
    queryKey: ['tmdbPoster', show.ids.tmdb],
    queryFn: () => getTmdbPoster(show.ids.tmdb, TMDB_CONFIG.API_KEY),
    enabled: !!show.ids.tmdb && !!TMDB_CONFIG.API_KEY,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });

  const posterUrl = images?.poster ?? null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        width: posterWidth,
        height: posterHeight,
        borderRadius: Radius.sm,
        backgroundColor: Colors.bg.elevated,
        overflow: 'hidden',
      }}
    >
      {posterUrl && !failed ? (
        <Image
          source={{ uri: posterUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="tv-outline" size={24} color={Colors.text.muted} />
        </View>
      )}
      {(() => {
        const cfg = CategoryConfig[item.category as keyof typeof CategoryConfig];
        if (!cfg) return null;
        return (
          <View style={{
            position: 'absolute',
            top: 5,
            right: 5,
            width: 26,
            height: 26,
            borderRadius: 6,
            backgroundColor: 'rgba(0,0,0,0.6)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
          </View>
        );
      })()}
    </TouchableOpacity>
  );
}
