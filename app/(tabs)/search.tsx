import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useSearchShows, useAddToWatchlist, useAllShows, useRecommendations, useTrendingShows, usePopularShows } from '../../hooks/useShows';
import { EmptyState } from '../../components/UI';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';
import type { TraktSearchResult, TraktShowExtended } from '../../types/trakt';
import { TMDB_CONFIG } from '../../config/trakt';
import { getTmdbPoster } from '../../services/traktApi';
import { Image } from 'react-native';
import { formatAirDate } from '../../utils/dateUtils';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [addingId, setAddingId] = useState<number | null>(null);
  const [optimisticAdded, setOptimisticAdded] = useState<Set<number>>(new Set());
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const router = useRouter();
  const { data: results = [], isFetching } = useSearchShows(debouncedQuery);
  const { data: myShows = [] } = useAllShows();
  const { data: recommendations = [], isLoading: recsLoading } = useRecommendations();
  const { data: trending = [], isLoading: trendingLoading } = useTrendingShows();
  const { data: popular = [], isLoading: popularLoading } = usePopularShows();
  const addMutation = useAddToWatchlist();

  const myShowIds = new Set(myShows.map((s) => s.show.ids.trakt));

  const handleAddRec = (id: number, show?: TraktShowExtended) => {
    setAddingId(id);
    setOptimisticAdded((prev) => new Set([...prev, id]));
    addMutation.mutate({ traktId: id, show }, {
      onSettled: () => setAddingId(null),
      onError: (err) => {
        setOptimisticAdded((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        Alert.alert('Error', 'Could not add show: ' + (err?.message ?? 'Unknown error'));
      },
    });
  };

  const handleSearch = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(text);
    }, 400);
  };

  const clearSearch = () => {
    setQuery('');
    setDebouncedQuery('');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Pinned header + search bar */}
      <View style={styles.header}>
        <Text style={styles.title}>Discover Shows</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.text.muted} />
          <TextInput
            style={styles.input}
            placeholder="Search shows…"
            placeholderTextColor={Colors.text.muted}
            value={query}
            onChangeText={handleSearch}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={Colors.text.muted} />
            </TouchableOpacity>
          )}
          {isFetching && (
            <ActivityIndicator size="small" color={Colors.accent.primary} />
          )}
        </View>
      </View>

      {/* Body: discover sections (idle) OR search results (typing) */}
      {debouncedQuery.length < 2 ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <HorizontalShowSection
            title="Recommended for You"
            subtitle="Personalised picks based on your Trakt history"
            icon="sparkles"
            iconColor={Colors.accent.primary}
            shows={recommendations}
            isLoading={recsLoading}
            myShowIds={myShowIds}
            optimisticAdded={optimisticAdded}
            addingId={addingId}
            onAdd={handleAddRec}
            onPress={(show) => router.push({ pathname: '/show/[id]', params: { id: show.ids.slug, title: show.title } })}
          />
          <View style={styles.sectionDivider} />
          <HorizontalShowSection
            title="Trending"
            subtitle="What everyone is watching right now"
            icon="trending-up"
            iconColor={Colors.status.running}
            shows={trending}
            isLoading={trendingLoading}
            myShowIds={myShowIds}
            optimisticAdded={optimisticAdded}
            addingId={addingId}
            onAdd={handleAddRec}
            onPress={(show) => router.push({ pathname: '/show/[id]', params: { id: show.ids.slug, title: show.title } })}
          />
          <View style={styles.sectionDivider} />
          <HorizontalShowSection
            title="Popular"
            subtitle="All-time fan favourites"
            icon="flame"
            iconColor="#f97316"
            shows={popular}
            isLoading={popularLoading}
            myShowIds={myShowIds}
            optimisticAdded={optimisticAdded}
            addingId={addingId}
            onAdd={handleAddRec}
            onPress={(show) => router.push({ pathname: '/show/[id]', params: { id: show.ids.slug, title: show.title } })}
          />
        </ScrollView>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.show?.ids.trakt ?? Math.random())}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            !isFetching ? (
              <EmptyState
                icon="search-outline"
                message="No shows found"
                subMessage={`No results for "${debouncedQuery}"`}
              />
            ) : null
          }
          renderItem={({ item }) => {
            if (!item.show) return null;
            const show = item.show;
            const id = show.ids.trakt;
            const isInMyList = myShowIds.has(id) || optimisticAdded.has(id);

            return (
              <SearchResultCard
                result={item}
                isInList={isInMyList}
                onPress={() =>
                  router.push({
                    pathname: '/show/[id]',
                    params: { id: show.ids.slug, title: show.title },
                  })
                }
                onAdd={() => {
                  setAddingId(id);
                  setOptimisticAdded((prev) => new Set([...prev, id]));
                  addMutation.mutate({ traktId: id, show }, {
                    onSettled: () => setAddingId(null),
                    onError: (err) => {
                      setOptimisticAdded((prev) => {
                        const next = new Set(prev);
                        next.delete(id);
                        return next;
                      });
                      Alert.alert('Error', 'Could not add show: ' + (err?.message ?? 'Unknown error'));
                    },
                  });
                }}
                isAdding={addingId === id}
              />
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Horizontal Show Section ─────────────────────────────────────────────────

interface HorizontalShowSectionProps {
  title: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  shows: TraktShowExtended[];
  isLoading: boolean;
  myShowIds: Set<number>;
  optimisticAdded: Set<number>;
  addingId: number | null;
  onAdd: (id: number, show?: TraktShowExtended) => void;
  onPress: (show: TraktShowExtended) => void;
}

function HorizontalShowSection({
  title,
  subtitle,
  icon,
  iconColor,
  shows,
  isLoading,
  myShowIds,
  optimisticAdded,
  addingId,
  onAdd,
  onPress,
}: HorizontalShowSectionProps) {
  return (
    <View style={styles.recsSection}>
      <View style={styles.recsSectionHeader}>
        <Ionicons name={icon as any} size={16} color={iconColor} />
        <Text style={styles.recsSectionTitle}>{title}</Text>
      </View>
      <Text style={styles.recsSectionSub}>{subtitle}</Text>

      {isLoading ? (
        <View style={styles.recsLoading}>
          <ActivityIndicator size="small" color={iconColor} />
          <Text style={styles.recsLoadingText}>Loading…</Text>
        </View>
      ) : shows.length === 0 ? (
        <View style={styles.recsEmpty}>
          <Text style={styles.recsEmptyText}>Nothing to show here yet.</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recsScroll}
        >
          {shows.map((show) => {
            const id = show.ids.trakt;
            const inList = myShowIds.has(id) || optimisticAdded.has(id);
            return (
              <RecommendationCard
                key={id}
                show={show}
                isInList={inList}
                isAdding={addingId === id}
                onPress={() => onPress(show)}
                onAdd={() => onAdd(id, show)}
              />
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Recommendation Card ───────────────────────────────────────────────────────

interface RecommendationCardProps {
  show: TraktShowExtended;
  isInList: boolean;
  isAdding: boolean;
  onPress: () => void;
  onAdd: () => void;
}

function RecommendationCard({
  show,
  isInList,
  isAdding,
  onPress,
  onAdd,
}: RecommendationCardProps) {
  const [posterFailed, setPosterFailed] = React.useState(false);

  const { data: tmdbImages } = useQuery({
    queryKey: ['tmdbPoster', show.ids.tmdb],
    queryFn: () => getTmdbPoster(show.ids.tmdb, TMDB_CONFIG.API_KEY),
    enabled: !!show.ids.tmdb && !!TMDB_CONFIG.API_KEY,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });

  const posterUrl = tmdbImages?.poster ?? null;

  return (
    <View style={styles.recCard}>
      {/* Poster */}
      <View style={styles.recPoster}>
        {/* Image — base layer */}
        {posterUrl && !posterFailed ? (
          <Image
            source={{ uri: posterUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onError={() => setPosterFailed(true)}
          />
        ) : (
          <View style={styles.recPosterFallback}>
            <Ionicons name="tv-outline" size={28} color={Colors.text.muted} />
          </View>
        )}
        {/* Nav overlay — sibling above image, below add button */}
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onPress} activeOpacity={0.7} />
        {/* Add button — rendered last so it sits above nav overlay */}
        <TouchableOpacity
          style={[styles.recAddBtn, isInList && styles.recAddBtnAdded]}
          onPress={isInList ? undefined : onAdd}
          disabled={isInList || isAdding}
        >
          {isAdding ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons
              name={isInList ? 'checkmark' : 'add'}
              size={16}
              color="#fff"
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Title + year — separate touchable for navigation */}
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <Text style={styles.recTitle} numberOfLines={2}>{show.title}</Text>
        <Text style={styles.recYear}>{show.year}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Search Result Card ────────────────────────────────────────────────────────

interface SearchResultCardProps {
  result: TraktSearchResult;
  isInList: boolean;
  onPress: () => void;
  onAdd: () => void;
  isAdding: boolean;
}

function SearchResultCard({
  result,
  isInList,
  onPress,
  onAdd,
  isAdding,
}: SearchResultCardProps) {
  const show = result.show!;
  const [posterFailed, setPosterFailed] = React.useState(false);

  const { data: tmdbImages } = useQuery({
    queryKey: ['tmdbPoster', show.ids.tmdb],
    queryFn: () => getTmdbPoster(show.ids.tmdb, TMDB_CONFIG.API_KEY),
    enabled: !!show.ids.tmdb && !!TMDB_CONFIG.API_KEY,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });

  const posterUrl = tmdbImages?.poster ?? null;

  const statusColors: Record<string, string> = {
    'returning series': Colors.status.running,
    continuing: Colors.status.running,
    'in production': Colors.status.waiting,
    planned: Colors.status.waiting,
    ended: Colors.status.ended,
    canceled: Colors.status.ended,
  };

  const statusColor = statusColors[show.status] ?? Colors.text.muted;

  return (
    <TouchableOpacity style={styles.resultCard} onPress={onPress} activeOpacity={0.8}>
      {/* Poster */}
      <View style={styles.resultPoster}>
        {posterUrl && !posterFailed ? (
          <Image
            source={{ uri: posterUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onError={() => setPosterFailed(true)}
          />
        ) : (
          <View style={styles.posterFallback}>
            <Ionicons name="tv-outline" size={24} color={Colors.text.muted} />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={2}>
          {show.title}
        </Text>
        <View style={styles.resultMeta}>
          <Text style={styles.resultYear}>{show.year ?? 'TBA'}</Text>
          {show.network ? (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.resultNetwork} numberOfLines={1}>
                {show.network}
              </Text>
            </>
          ) : null}
        </View>
        {show.status && (
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor + '22' },
            ]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {show.status.charAt(0).toUpperCase() + show.status.slice(1)}
            </Text>
          </View>
        )}
        {show.overview && (
          <Text style={styles.overview} numberOfLines={2}>
            {show.overview}
          </Text>
        )}
      </View>

      {/* Add button */}
      <TouchableOpacity
        style={[
          styles.addBtn,
          isInList && styles.addBtnAdded,
        ]}
        onPress={isInList ? undefined : onAdd}
        disabled={isInList || isAdding}
      >
        {isAdding ? (
          <ActivityIndicator size="small" color={Colors.accent.primary} />
        ) : (
          <Ionicons
            name={isInList ? 'checkmark' : 'add'}
            size={22}
            color={isInList ? Colors.status.running : Colors.text.primary}
          />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  title: {
    color: Colors.text.primary,
    fontSize: Typography['2xl'],
    fontWeight: '800',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: Typography.base,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 32,
  },
  // Recommendations
  recsSection: {
    paddingTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  recsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  recsSectionTitle: {
    color: Colors.text.primary,
    fontSize: Typography.lg,
    fontWeight: '700',
  },
  recsSectionSub: {
    color: Colors.text.muted,
    fontSize: Typography.xs,
    marginBottom: Spacing.md,
  },
  recsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  recsLoadingText: {
    color: Colors.text.muted,
    fontSize: Typography.sm,
  },
  recsEmpty: {
    paddingVertical: Spacing.lg,
  },
  recsEmptyText: {
    color: Colors.text.muted,
    fontSize: Typography.sm,
    lineHeight: 18,
  },
  recsScroll: {
    gap: Spacing.md,
    paddingRight: Spacing.lg,
  },
  recCard: {
    width: 120,
  },
  recPoster: {
    width: 120,
    height: 180,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg.elevated,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  recPosterFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recAddBtn: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recAddBtnAdded: {
    backgroundColor: Colors.status.running,
  },
  recTitle: {
    color: Colors.text.primary,
    fontSize: Typography.xs,
    fontWeight: '600',
    lineHeight: 15,
  },
  recYear: {
    color: Colors.text.muted,
    fontSize: 10,
    marginTop: 2,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  // Result card
  resultCard: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    alignItems: 'center',
  },
  resultPoster: {
    width: 64,
    height: 96,
    backgroundColor: Colors.bg.elevated,
    overflow: 'hidden',
  },
  posterFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: {
    flex: 1,
    padding: Spacing.md,
    gap: 4,
  },
  resultTitle: {
    color: Colors.text.primary,
    fontSize: Typography.base,
    fontWeight: '600',
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  resultYear: {
    color: Colors.text.muted,
    fontSize: Typography.xs,
  },
  metaDot: {
    color: Colors.text.muted,
    fontSize: Typography.xs,
  },
  resultNetwork: {
    color: Colors.text.muted,
    fontSize: Typography.xs,
    flex: 1,
  },
  statusBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  overview: {
    color: Colors.text.secondary,
    fontSize: Typography.xs,
    lineHeight: 16,
  },
  addBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    backgroundColor: Colors.bg.elevated,
    borderRadius: Radius.md,
  },
  addBtnAdded: {
    backgroundColor: Colors.status.running + '22',
  },
});
