import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getShowDetails, getNextEpisode, getShowProgress, getTmdbPoster } from '../../services/traktApi';
import { useAddToWatchlist, useRemoveFromWatchlist, useAllShows } from '../../hooks/useShows';
import { useAuthStore } from '../../store/authStore';
import { Colors, Radius, Spacing, Typography, CategoryConfig } from '../../constants/theme';
import { countdownLabel, countdownColor, formatAirDate, daysUntil } from '../../utils/dateUtils';
import { LoadingSpinner } from '../../components/UI';
import { SeasonsSection } from '../../components/SeasonsSection';
import { TMDB_CONFIG } from '../../config/trakt';

export default function ShowDetailScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title: string }>();
  const navigation = useNavigation();
  const getValidToken = useAuthStore((s) => s.getValidToken);
  const [backdropFailed, setBackdropFailed] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const [optimisticAdded, setOptimisticAdded] = useState(false);

  const { data: myShows = [] } = useAllShows();
  const addMutation = useAddToWatchlist();
  const removeMutation = useRemoveFromWatchlist();

  const myShow = myShows.find((s) => s.show.ids.slug === id);
  const isInList = Boolean(myShow) || optimisticAdded;

  // Fetch show details
  const { data: show, isLoading: showLoading } = useQuery({
    queryKey: ['show', id],
    queryFn: async () => {
      const token = await getValidToken();
      return getShowDetails(id, token ?? undefined);
    },
    enabled: Boolean(id),
  });

  // Fetch next episode
  const { data: nextEpisode } = useQuery({
    queryKey: ['nextEpisode', id],
    queryFn: async () => {
      const token = await getValidToken();
      return getNextEpisode(id, token ?? undefined);
    },
    enabled: Boolean(id) && Boolean(show),
  });

  // Fetch watch progress if user has watched this show
  const { data: progress } = useQuery({
    queryKey: ['progress', id],
    queryFn: async () => {
      const token = await getValidToken();
      if (!token) return null;
      return getShowProgress(token, id);
    },
    enabled: Boolean(id) && Boolean(myShow?.category === 'watching'),
  });

  // Fetch real poster/backdrop paths from TMDB (must be before any early returns)
  const tmdbId = show?.ids.tmdb;
  const { data: tmdbImages } = useQuery({
    queryKey: ['tmdbPoster', tmdbId],
    queryFn: () => getTmdbPoster(tmdbId, TMDB_CONFIG.API_KEY),
    enabled: !!tmdbId && !!TMDB_CONFIG.API_KEY,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });

  React.useEffect(() => {
    if (show) {
      navigation.setOptions({ headerTitle: show.title });
    }
  }, [show]);

  if (showLoading || !show) {
    return <LoadingSpinner label="Loading show…" />;
  }

  const backdropUri = tmdbImages?.backdrop ?? null;
  const posterUri = tmdbImages?.poster ?? null;

  const days = daysUntil(nextEpisode?.first_aired ?? null);
  const countdownColor_ = countdownColor(days);

  const statusColor: Record<string, string> = {
    'returning series': Colors.status.running,
    continuing: Colors.status.running,
    'in production': Colors.status.waiting,
    planned: Colors.status.waiting,
    upcoming: Colors.status.waiting,
    pilot: Colors.status.waiting,
    ended: Colors.status.ended,
    canceled: Colors.status.ended,
  };
  const currentStatusColor = statusColor[show.status] ?? Colors.text.muted;

  const completionPct =
    progress && progress.aired > 0
      ? Math.min(100, (progress.completed / progress.aired) * 100)
      : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Backdrop */}
        <View style={styles.backdropContainer}>
          {backdropUri && !backdropFailed ? (
            <Image
              source={{ uri: backdropUri }}
              style={styles.backdrop}
              resizeMode="cover"
              onError={() => setBackdropFailed(true)}
            />
          ) : (
            <View style={[styles.backdrop, styles.backdropFallback]} />
          )}
          <View style={styles.backdropOverlay} />

          {/* Poster + title overlay */}
          <View style={styles.heroContent}>
            <View style={styles.posterWrapper}>
              {posterUri && !posterFailed ? (
                <Image
                  source={{ uri: posterUri }}
                  style={styles.poster}
                  resizeMode="cover"
                  onError={() => setPosterFailed(true)}
                />
              ) : (
                <View style={[styles.poster, styles.posterFallback]}>
                  <Ionicons name="tv-outline" size={32} color={Colors.text.muted} />
                </View>
              )}
            </View>

            <View style={styles.heroInfo}>
              <Text style={styles.heroTitle}>{show.title}</Text>
              <View style={styles.heroMeta}>
                <Text style={styles.heroYear}>{show.year}</Text>
                {show.network ? (
                  <>
                    <Text style={styles.heroDot}>·</Text>
                    <Text style={styles.heroNetwork}>{show.network}</Text>
                  </>
                ) : null}
              </View>
              {show.status && (
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: currentStatusColor + '33' },
                  ]}
                >
                  <Text style={[styles.statusText, { color: currentStatusColor }]}>
                    {show.status.charAt(0).toUpperCase() + show.status.slice(1)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={() => {
              if (isInList) {
                setOptimisticAdded(false);
                removeMutation.mutate(show.ids.trakt, {
                  onError: (err) => {
                    setOptimisticAdded(Boolean(myShow));
                    Alert.alert('Error', 'Could not remove show: ' + (err?.message ?? 'Unknown error'));
                  },
                });
              } else {
                setOptimisticAdded(true);
                addMutation.mutate({ traktId: show.ids.trakt, show }, {
                  onError: (err) => {
                    setOptimisticAdded(false);
                    Alert.alert('Error', 'Could not add show: ' + (err?.message ?? 'Unknown error'));
                  },
                });
              }
            }}
            disabled={addMutation.isPending || removeMutation.isPending}
          >
            {addMutation.isPending || removeMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons
                  name={isInList ? 'checkmark-circle' : 'add-circle-outline'}
                  size={18}
                  color="#fff"
                />
                <Text style={styles.actionBtnText}>
                  {isInList ? 'In My List' : 'Add to Watchlist'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {show.homepage && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => Linking.openURL(show.homepage!)}
            >
              <Ionicons name="globe-outline" size={18} color={Colors.text.primary} />
              <Text style={styles.actionBtnTextSecondary}>Website</Text>
            </TouchableOpacity>
          )}

          {show.trailer && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => Linking.openURL(show.trailer!)}
            >
              <Ionicons name="play-circle-outline" size={18} color={Colors.text.primary} />
              <Text style={styles.actionBtnTextSecondary}>Trailer</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Progress section */}
        {progress && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Progress</Text>
            <View style={styles.progressCard}>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${completionPct}%` },
                  ]}
                />
              </View>
              <View style={styles.progressStats}>
                <Text style={styles.progressStat}>
                  <Text style={{ color: Colors.status.watching, fontWeight: '700' }}>
                    {progress.completed}
                  </Text>
                  <Text style={styles.progressStatLabel}>
                    /{progress.aired} episodes
                  </Text>
                </Text>
                <Text style={styles.progressPct}>
                  {completionPct.toFixed(0)}%
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Next Episode */}
        {nextEpisode && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Next Episode</Text>
            <View
              style={[
                styles.nextEpisodeCard,
                { borderLeftColor: countdownColor_ },
              ]}
            >
              <View style={styles.nextEpHeader}>
                <Text style={styles.nextEpCode}>
                  S{String(nextEpisode.season).padStart(2, '0')}E
                  {String(nextEpisode.number).padStart(2, '0')}
                </Text>
                <View
                  style={[
                    styles.countdownBadge,
                    { backgroundColor: countdownColor_ + '22' },
                  ]}
                >
                  <Ionicons name="time-outline" size={12} color={countdownColor_} />
                  <Text style={[styles.countdownText, { color: countdownColor_ }]}>
                    {countdownLabel(nextEpisode.first_aired)}
                  </Text>
                </View>
              </View>
              <Text style={styles.nextEpTitle}>{nextEpisode.title}</Text>
              <Text style={styles.nextEpAirDate}>
                {formatAirDate(nextEpisode.first_aired)}
              </Text>
              {nextEpisode.overview && (
                <Text style={styles.nextEpOverview} numberOfLines={3}>
                  {nextEpisode.overview}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Overview */}
        {show.overview && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <Text style={styles.overview}>{show.overview}</Text>
          </View>
        )}

        {/* Show Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailsGrid}>
            {[
              { label: 'Status', value: show.status },
              { label: 'Network', value: show.network },
              { label: 'Country', value: show.country?.toUpperCase() },
              { label: 'Runtime', value: show.runtime ? `${show.runtime} min` : null },
              { label: 'Episodes', value: show.aired_episodes?.toString() },
              { label: 'Premiered', value: formatAirDate(show.first_aired) },
              { label: 'Language', value: show.language?.toUpperCase() },
              { label: 'Rating', value: show.rating > 0 ? `⭐ ${show.rating.toFixed(1)}/10` : null },
            ]
              .filter((d) => d.value)
              .map((detail) => (
                <View key={detail.label} style={styles.detailItem}>
                  <Text style={styles.detailLabel}>{detail.label}</Text>
                  <Text style={styles.detailValue}>{detail.value}</Text>
                </View>
              ))}
          </View>
        </View>

        {/* Genres */}
        {show.genres && show.genres.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Genres</Text>
            <View style={styles.genreRow}>
              {show.genres.map((genre) => (
                <View key={genre} style={styles.genreBadge}>
                  <Text style={styles.genreText}>
                    {genre.charAt(0).toUpperCase() + genre.slice(1)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Seasons & Episodes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seasons & Episodes</Text>
          <SeasonsSection
            showSlug={show.ids.slug}
            showTraktId={show.ids.trakt}
            showTmdbId={show.ids.tmdb}
            isInMyShows={isInList}
          />
        </View>

        {/* External Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>External Links</Text>
          <View style={styles.linksRow}>
            {show.ids.imdb && (
              <TouchableOpacity
                style={styles.linkBtn}
                onPress={() =>
                  Linking.openURL(`https://www.imdb.com/title/${show.ids.imdb}`)
                }
              >
                <Text style={styles.linkBtnText}>IMDb</Text>
              </TouchableOpacity>
            )}
            {show.ids.tmdb && (
              <TouchableOpacity
                style={styles.linkBtn}
                onPress={() =>
                  Linking.openURL(`https://www.themoviedb.org/tv/${show.ids.tmdb}`)
                }
              >
                <Text style={styles.linkBtnText}>TMDB</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() =>
                Linking.openURL(`https://trakt.tv/shows/${show.ids.slug}`)
              }
            >
              <Text style={styles.linkBtnText}>Trakt</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    paddingBottom: 40,
  },
  // Backdrop / Hero
  backdropContainer: {
    height: 240,
    position: 'relative',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropFallback: {
    backgroundColor: Colors.bg.elevated,
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,15,20,0.55)',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  posterWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  poster: {
    width: 80,
    height: 120,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bg.elevated,
  },
  posterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    color: Colors.text.primary,
    fontSize: Typography.xl,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  heroYear: {
    color: Colors.text.secondary,
    fontSize: Typography.sm,
  },
  heroDot: {
    color: Colors.text.muted,
    fontSize: Typography.sm,
  },
  heroNetwork: {
    color: Colors.text.secondary,
    fontSize: Typography.sm,
  },
  statusBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: Typography.xs,
    fontWeight: '600',
  },
  // Actions
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionBtnPrimary: {
    backgroundColor: Colors.accent.primary,
    borderColor: Colors.accent.primary,
    flex: 1,
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: Typography.sm,
    fontWeight: '600',
  },
  actionBtnTextSecondary: {
    color: Colors.text.secondary,
    fontSize: Typography.sm,
  },
  // Section
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    color: Colors.text.primary,
    fontSize: Typography.lg,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  // Progress
  progressCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.bg.elevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.status.watching,
    borderRadius: 3,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressStat: {
    color: Colors.text.secondary,
    fontSize: Typography.sm,
  },
  progressStatLabel: {
    color: Colors.text.muted,
  },
  progressPct: {
    color: Colors.status.watching,
    fontSize: Typography.sm,
    fontWeight: '700',
  },
  // Next Episode
  nextEpisodeCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderLeftWidth: 3,
    gap: 6,
  },
  nextEpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nextEpCode: {
    color: Colors.text.muted,
    fontSize: Typography.sm,
    fontWeight: '600',
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  countdownText: {
    fontSize: Typography.xs,
    fontWeight: '700',
  },
  nextEpTitle: {
    color: Colors.text.primary,
    fontSize: Typography.base,
    fontWeight: '600',
  },
  nextEpAirDate: {
    color: Colors.text.muted,
    fontSize: Typography.xs,
  },
  nextEpOverview: {
    color: Colors.text.secondary,
    fontSize: Typography.sm,
    lineHeight: 18,
  },
  // Overview
  overview: {
    color: Colors.text.secondary,
    fontSize: Typography.base,
    lineHeight: 22,
  },
  // Details grid
  detailsGrid: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailLabel: {
    color: Colors.text.muted,
    fontSize: Typography.sm,
  },
  detailValue: {
    color: Colors.text.primary,
    fontSize: Typography.sm,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  // Genres
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  genreBadge: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  genreText: {
    color: Colors.text.secondary,
    fontSize: Typography.sm,
  },
  // Links
  linksRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  linkBtn: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  linkBtnText: {
    color: Colors.text.secondary,
    fontSize: Typography.sm,
    fontWeight: '500',
  },
});
