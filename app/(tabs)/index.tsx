import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCategorizedShows, useAllShows } from '../../hooks/useShows';
import { ShowCard } from '../../components/ShowCard';
import { SectionHeader, EmptyState, LoadingSpinner } from '../../components/UI';
import { Colors, Spacing, Typography, CategoryConfig, Radius } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import type { EnrichedShow } from '../../types/trakt';

type SectionKey = 'watching' | 'watchlist' | 'ended';

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { watching, watchlist, ended, isLoading, error, refetch } =
    useCategorizedShows();

  const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>({
    watching: true,
    watchlist: true,
    ended: true,
  });

  const toggle = (key: SectionKey) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const navigateTo = (show: EnrichedShow) =>
    router.push({
      pathname: '/show/[id]',
      params: { id: show.show.ids.slug, title: show.show.title },
    });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner label="Loading your shows…" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Ionicons name="cloud-offline-outline" size={48} color={Colors.text.muted} />
          <Text style={{ color: Colors.text.primary, fontSize: 18, fontWeight: '600', marginTop: 16 }}>
            Couldn't load shows
          </Text>
          <Text style={{ color: Colors.text.secondary, textAlign: 'center', marginTop: 8 }}>
            {(error as Error)?.message || 'Check your connection and try again.'}
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={{ marginTop: 20, backgroundColor: Colors.accent.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const totalShows = watching.length + watchlist.length + ended.length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={Colors.accent.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Hi, {user?.name || user?.username || 'there'} 👋
            </Text>
            <Text style={styles.subtitle}>
              {totalShows} show{totalShows !== 1 ? 's' : ''} tracked
            </Text>
          </View>
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={() => router.push('/(tabs)/search')}
          >
            <Ionicons name="search" size={20} color={Colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsRow}
          contentContainerStyle={styles.statsContent}
        >
          <StatChip
            label="Watching"
            value={watching.length}
            color={Colors.status.watching}
            icon="play-circle"
          />
          <StatChip
            label="Watchlist"
            value={watchlist.length}
            color={Colors.status.watchlist}
            icon="bookmark"
          />
          <StatChip
            label="Ended"
            value={ended.length}
            color={Colors.status.ended}
            icon="archive"
          />
        </ScrollView>

        {/* Currently Watching */}
        <Section
          sectionKey="watching"
          shows={watching}
          expanded={expanded.watching}
          onToggle={() => toggle('watching')}
          onPressShow={navigateTo}
          emptyMessage="Nothing in progress"
          emptySubMessage="Start watching a show or add one from search"
        />

        {/* Watchlist */}
        <Section
          sectionKey="watchlist"
          shows={watchlist}
          expanded={expanded.watchlist}
          onToggle={() => toggle('watchlist')}
          onPressShow={navigateTo}
          emptyMessage="Your watchlist is empty"
          emptySubMessage="Search for shows and save them here"
        />

        {/* Ended */}
        <Section
          sectionKey="ended"
          shows={ended}
          expanded={expanded.ended}
          onToggle={() => toggle('ended')}
          onPressShow={navigateTo}
          emptyMessage="No ended shows"
          emptySubMessage="Concluded series will appear here"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Section Component ─────────────────────────────────────────────────────────

interface SectionProps {
  sectionKey: SectionKey;
  shows: EnrichedShow[];
  expanded: boolean;
  onToggle: () => void;
  onPressShow: (show: EnrichedShow) => void;
  emptyMessage: string;
  emptySubMessage: string;
}

function Section({
  sectionKey,
  shows,
  expanded,
  onToggle,
  onPressShow,
  emptyMessage,
  emptySubMessage,
}: SectionProps) {
  const config = CategoryConfig[sectionKey];

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <SectionHeader
          title={config.label}
          count={shows.length}
          color={config.color}
          icon={config.icon}
          expanded={expanded}
          onToggle={onToggle}
        />
      </View>

      {expanded && (
        <>
          {shows.length === 0 ? (
            <View style={styles.sectionPadded}>
              <EmptyState
                icon={config.icon as any}
                message={emptyMessage}
                subMessage={emptySubMessage}
              />
            </View>
          ) : (
            <FlatList
              data={shows}
              keyExtractor={(item) => String(item.show.ids.trakt)}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => (
                <ShowCard
                  item={item}
                  onPress={() => onPressShow(item)}
                />
              )}
            />
          )}
        </>
      )}
    </View>
  );
}

// ─── Stat Chip ─────────────────────────────────────────────────────────────────

interface StatChipProps {
  label: string;
  value: number;
  color: string;
  icon: string;
}

function StatChip({ label, value, color, icon }: StatChipProps) {
  return (
    <View style={[styles.statChip, { borderColor: color + '40' }]}>
      <Ionicons name={icon as any} size={16} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  greeting: {
    color: Colors.text.primary,
    fontSize: Typography['2xl'],
    fontWeight: '800',
  },
  subtitle: {
    color: Colors.text.muted,
    fontSize: Typography.sm,
    marginTop: 2,
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    marginBottom: Spacing.lg,
  },
  statsContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
    borderWidth: 1,
  },
  statValue: {
    fontSize: Typography.base,
    fontWeight: '700',
  },
  statLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.sm,
  },
  section: {
    marginBottom: Spacing.sm,
  },
  sectionHeaderRow: {
    paddingHorizontal: Spacing.lg,
  },
  sectionPadded: {
    paddingHorizontal: Spacing.lg,
  },
  horizontalList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.sm,
  },
});
