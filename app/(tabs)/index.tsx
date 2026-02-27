import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCategorizedShows } from '../../hooks/useShows';
import { ShowCard } from '../../components/ShowCard';
import { SectionHeader, EmptyState, LoadingSpinner } from '../../components/UI';
import { Colors, Spacing, Typography, CategoryConfig, Radius } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import type { EnrichedShow } from '../../types/trakt';

type SectionKey = 'watching' | 'watchlist' | 'ended';
type FilterValue = 'All' | 'Ended' | 'Returning Series' | 'Canceled' | 'Finished';

const FILTER_OPTIONS: FilterValue[] = ['All', 'Ended', 'Returning Series', 'Canceled'];
const ENDED_FILTER_OPTIONS: FilterValue[] = ['All', 'Ended', 'Returning Series', 'Canceled', 'Finished'];

function filterShows(shows: EnrichedShow[], filter: FilterValue): EnrichedShow[] {
  if (filter === 'All') return shows;
  if (filter === 'Ended') return shows.filter((s) => s.show.status === 'ended' && s.category !== 'watching');
  if (filter === 'Returning Series')
    return shows.filter(
      (s) => s.show.status === 'returning series' || s.show.status === 'continuing'
    );
  if (filter === 'Canceled') return shows.filter((s) => s.show.status === 'canceled' && s.category !== 'watching');
  // Finished = fully-watched ended/canceled shows (category stays 'watching' until fully done)
  if (filter === 'Finished') return shows.filter((s) => s.category === 'watching');
  return shows;
}

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { watching, watchlist, ended, isLoading, error, refetch } = useCategorizedShows();

  const [filters, setFilters] = useState<Record<SectionKey, FilterValue>>({
    watching: 'All',
    watchlist: 'All',
    ended: 'All',
  });

  const [filterModal, setFilterModal] = useState<SectionKey | null>(null);

  const setFilter = (key: SectionKey, value: FilterValue) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setFilterModal(null);
  };

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

  // Fully-watched + ended/canceled shows are moved from `watching` → `ended`
  // by useCategorizedShows, retaining category === 'watching'. Count those.
  const finished = ended.filter((s) => s.category === 'watching').length;

  const totalShows = watching.length + watchlist.length + ended.length;

  const activeFilterKey = filterModal;
  const activeFilterColor = activeFilterKey ? CategoryConfig[activeFilterKey].color : '#fff';

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
          <StatChip label="Watching" value={watching.length} color={Colors.status.watching} icon="play-circle" />
          <StatChip label="Watchlist" value={watchlist.length} color={Colors.status.watchlist} icon="bookmark" />
          <StatChip label="Ended" value={ended.length} color={Colors.status.ended} icon="archive" />
          <StatChip label="Finished" value={finished} color="#10b981" icon="checkmark-circle" />
        </ScrollView>

        {/* Currently Watching */}
        <Section
          sectionKey="watching"
          shows={filterShows(watching, filters.watching)}
          totalCount={watching.length}
          filter={filters.watching}
          onOpenFilter={() => setFilterModal('watching')}
          onPressShow={navigateTo}
          emptyMessage="Nothing in progress"
          emptySubMessage="Start watching a show or add one from search"
        />

        {/* Watchlist */}
        <Section
          sectionKey="watchlist"
          shows={filterShows(watchlist, filters.watchlist)}
          totalCount={watchlist.length}
          filter={filters.watchlist}
          onOpenFilter={() => setFilterModal('watchlist')}
          onPressShow={navigateTo}
          emptyMessage="Your watchlist is empty"
          emptySubMessage="Search for shows and save them here"
        />

        {/* Ended */}
        <Section
          sectionKey="ended"
          shows={filterShows(ended, filters.ended)}
          totalCount={ended.length}
          filter={filters.ended}
          onOpenFilter={() => setFilterModal('ended')}
          onPressShow={navigateTo}
          emptyMessage="No ended shows"
          emptySubMessage="Concluded series will appear here"
        />
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={filterModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModal(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setFilterModal(null)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalHandle, { backgroundColor: activeFilterColor }]} />
            <Text style={styles.modalTitle}>Filter by Status</Text>
            {(filterModal === 'ended' ? ENDED_FILTER_OPTIONS : FILTER_OPTIONS).map((opt) => {
              const isActive = activeFilterKey ? filters[activeFilterKey] === opt : false;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.filterOption,
                    isActive && { backgroundColor: activeFilterColor + '20', borderColor: activeFilterColor },
                  ]}
                  onPress={() => activeFilterKey && setFilter(activeFilterKey, opt)}
                  activeOpacity={0.7}
                >
                  {isActive && (
                    <Ionicons name="checkmark-circle" size={16} color={activeFilterColor} />
                  )}
                  {!isActive && (
                    <Ionicons name="ellipse-outline" size={16} color={Colors.text.muted} />
                  )}
                  <Text style={[styles.filterOptionText, isActive && { color: activeFilterColor, fontWeight: '700' }]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Section Component ─────────────────────────────────────────────────────────

interface SectionProps {
  sectionKey: SectionKey;
  shows: EnrichedShow[];
  totalCount: number;
  filter: FilterValue;
  onOpenFilter: () => void;
  onPressShow: (show: EnrichedShow) => void;
  emptyMessage: string;
  emptySubMessage: string;
}

function Section({
  sectionKey,
  shows,
  totalCount,
  filter,
  onOpenFilter,
  onPressShow,
  emptyMessage,
  emptySubMessage,
}: SectionProps) {
  const config = CategoryConfig[sectionKey];
  const isFiltered = filter !== 'All';

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <SectionHeader
          title={config.label}
          count={isFiltered ? shows.length : totalCount}
          color={config.color}
          icon={config.icon}
          filterLabel={filter}
          onFilter={onOpenFilter}
        />
      </View>

      {shows.length === 0 ? (
        <View style={styles.sectionPadded}>
          {isFiltered ? (
            <View style={styles.noResultsRow}>
              <Ionicons name="filter-outline" size={16} color={Colors.text.muted} />
              <Text style={styles.noResultsText}>No {filter.toLowerCase()} shows</Text>
            </View>
          ) : (
            <EmptyState
              icon={config.icon as any}
              message={emptyMessage}
              subMessage={emptySubMessage}
            />
          )}
        </View>
      ) : (
        <FlatList
          data={shows}
          keyExtractor={(item) => String(item.show.ids.trakt)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          renderItem={({ item }) => (
            <ShowCard item={item} onPress={() => onPressShow(item)} />
          )}
        />
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
  noResultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  noResultsText: {
    color: Colors.text.muted,
    fontSize: Typography.sm,
  },
  // Filter modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.bg.card,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    paddingBottom: 36,
    gap: Spacing.sm,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
    opacity: 0.6,
  },
  modalTitle: {
    color: Colors.text.primary,
    fontSize: Typography.lg,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterOptionText: {
    color: Colors.text.secondary,
    fontSize: Typography.base,
    fontWeight: '500',
  },
});
