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
  Modal,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getShowDetails, getNextEpisode, getTmdbPoster, getTmdbCast, getOmdbRatings } from '../../services/traktApi';
import { useAddToWatchlist, useRemoveFromWatchlist, useAllShows, useMarkEpisodeWatched, useShowProgressDetail } from '../../hooks/useShows';
import { useAuthStore } from '../../store/authStore';
import { Colors, Radius, Spacing, Typography, CategoryConfig } from '../../constants/theme';
import { countdownLabel, countdownColor, formatAirDate, daysUntil } from '../../utils/dateUtils';
import { LoadingSpinner } from '../../components/UI';
import { SeasonsSection } from '../../components/SeasonsSection';
import { TMDB_CONFIG, OMDB_CONFIG } from '../../config/trakt';

export default function ShowDetailScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const getValidToken = useAuthStore((s) => s.getValidToken);
  const { width } = useWindowDimensions();
  const [backdropFailed, setBackdropFailed] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const [optimisticAdded, setOptimisticAdded] = useState(false);
  const [removeConfirmVisible, setRemoveConfirmVisible] = useState(false);

  const { data: myShows = [] } = useAllShows();
  const addMutation = useAddToWatchlist();
  const removeMutation = useRemoveFromWatchlist();
  const markWatchedMutation = useMarkEpisodeWatched(id);

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

  // Fetch watch progress if user is actively watching this show
  const { data: progress } = useShowProgressDetail(id, myShow?.category === 'watching');

  // Fetch real poster/backdrop paths from TMDB (must be before any early returns)
  const tmdbId = show?.ids.tmdb;
  const { data: tmdbImages } = useQuery({
    queryKey: ['tmdbPoster', tmdbId, 'v2'],
    queryFn: () => getTmdbPoster(tmdbId, TMDB_CONFIG.API_KEY),
    enabled: !!tmdbId && !!TMDB_CONFIG.API_KEY,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });

  const { data: castMembers = [] } = useQuery({
    queryKey: ['tmdbCast', tmdbId],
    queryFn: () => getTmdbCast(tmdbId, TMDB_CONFIG.API_KEY, 15),
    enabled: !!tmdbId && !!TMDB_CONFIG.API_KEY,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });

  // Fetch IMDb & Rotten Tomatoes ratings via OMDB (requires EXPO_PUBLIC_OMDB_API_KEY)
  const imdbId = show?.ids.imdb;
  const { data: omdbRatings } = useQuery({
    queryKey: ['omdbRatings', imdbId],
    queryFn: () => getOmdbRatings(imdbId!, OMDB_CONFIG.API_KEY),
    enabled: !!imdbId && !!OMDB_CONFIG.API_KEY,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });

  // Poster size matching Awaiting Release Date grid posters
  const posterWidth = Math.floor((width - 48) / 3);
  const posterHeight = Math.floor(posterWidth * 1.5);

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
            <View style={styles.heroPosterRow}>
              <View style={styles.posterWrapper}>
                {posterUri && !posterFailed ? (
                  <Image
                    source={{ uri: posterUri }}
                    style={[styles.poster, { width: posterWidth, height: posterHeight }]}
                    resizeMode="cover"
                    onError={() => setPosterFailed(true)}
                  />
                ) : (
                  <View style={[styles.poster, styles.posterFallback, { width: posterWidth, height: posterHeight }]}>
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

            {/* Ratings row inside hero */}
            {(omdbRatings?.imdb || omdbRatings?.tomatometer || tmdbImages?.tmdbRating) && (
              <View style={styles.heroRatings}>
                {omdbRatings?.imdb && (
                  <View style={styles.ratingChip}>
                    <Ionicons name="star" size={12} color="#F5C518" />
                    <Text style={styles.ratingChipText}>{omdbRatings.imdb}</Text>
                    <Text style={styles.ratingChipLabel}>IMDb</Text>
                  </View>
                )}
                {omdbRatings?.tomatometer && (
                  <View style={styles.ratingChip}>
                    <Text style={styles.ratingEmoji}>🍅</Text>
                    <Text style={styles.ratingChipText}>{omdbRatings.tomatometer}</Text>
                    <Text style={styles.ratingChipLabel}>RT</Text>
                  </View>
                )}
                {tmdbImages?.tmdbRating && (
                  <View style={styles.ratingChip}>
                    <Text style={styles.ratingEmoji}>🍿</Text>
                    <Text style={styles.ratingChipText}>{tmdbImages.tmdbRating}%</Text>
                    <Text style={styles.ratingChipLabel}>TMDB</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={() => {
              if (isInList) {
                setRemoveConfirmVisible(true);
              } else {
                setOptimisticAdded(true);
                addMutation.mutate({ traktId: show.ids.trakt, show }, {
                  onError: () => setOptimisticAdded(false),
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

              {/* Current episode row */}
              {progress.next_episode && (
                <>
                  <View style={styles.progressDivider} />
                  <View style={styles.currentEpRow}>
                    <View style={styles.currentEpInfo}>
                      <Text style={styles.currentEpCode}>
                        S{String(progress.next_episode.season).padStart(2, '0')}E
                        {String(progress.next_episode.number).padStart(2, '0')}
                      </Text>
                      <Text style={styles.currentEpTitle} numberOfLines={1}>
                        {progress.next_episode.title ?? 'Unknown episode'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.markWatchedBtn}
                      onPress={() =>
                        markWatchedMutation.mutate(progress.next_episode!.ids.trakt)
                      }
                      disabled={markWatchedMutation.isPending}
                    >
                      {markWatchedMutation.isPending ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.markWatchedBtnText}>Mark as watched</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
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

        {/* Cast */}
        {castMembers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cast</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.castList}>
              {castMembers.map((member) => (
                <TouchableOpacity
                  key={member.id}
                  style={styles.castCard}
                  onPress={() =>
                    router.push({
                      pathname: '/person/[id]',
                      params: { id: String(member.id), name: member.name },
                    })
                  }
                  activeOpacity={0.75}
                >
                  {member.profileUrl ? (
                    <Image
                      source={{ uri: member.profileUrl }}
                      style={styles.castPhoto}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.castPhoto, styles.castPhotoFallback]}>
                      <Ionicons name="person" size={24} color={Colors.text.muted} />
                    </View>
                  )}
                  <Text style={styles.castName} numberOfLines={2}>{member.name}</Text>
                  {member.character ? (
                    <Text style={styles.castCharacter} numberOfLines={2}>{member.character}</Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Details */}
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

      {/* Remove from Watchlist confirmation modal */}
      <Modal
        visible={removeConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRemoveConfirmVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Remove from Watchlist</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to remove &quot;{show.title}&quot; from your watchlist?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => setRemoveConfirmVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalRemoveBtn]}
                onPress={() => {
                  setRemoveConfirmVisible(false);
                  setOptimisticAdded(false);
                  removeMutation.mutate(show.ids.trakt);
                }}
                disabled={removeMutation.isPending}
              >
                {removeMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalRemoveText}>Remove</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    height: 320,
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
    flexDirection: 'column',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  heroPosterRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
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
  // Ratings
  heroRatings: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  ratingChipText: {
    color: Colors.text.primary,
    fontSize: Typography.sm,
    fontWeight: '700',
  },
  ratingChipLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.xs,
  },
  ratingEmoji: {
    fontSize: 12,
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
    color: Colors.text.secondary,
  },
  progressPct: {
    color: Colors.status.watching,
    fontSize: Typography.sm,
    fontWeight: '700',
  },
  progressDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginTop: 4,
  },
  currentEpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingTop: 2,
  },
  currentEpInfo: {
    flex: 1,
    gap: 2,
  },
  currentEpCode: {
    color: Colors.text.secondary,
    fontSize: Typography.xs,
    fontWeight: '600',
  },
  currentEpTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sm,
    fontWeight: '500',
  },
  markWatchedBtn: {
    backgroundColor: Colors.status.watching,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    minWidth: 110,
    alignItems: 'center',
  },
  markWatchedBtnText: {
    color: '#fff',
    fontSize: Typography.xs,
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
    color: Colors.text.secondary,
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
  // Cast
  castList: {
    gap: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  castCard: {
    width: 80,
    alignItems: 'center',
    gap: 5,
  },
  castPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.bg.elevated,
    overflow: 'hidden',
  },
  castPhotoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  castName: {
    color: Colors.text.primary,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  castCharacter: {
    color: Colors.text.secondary,
    fontSize: 10,
    textAlign: 'center',
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
  // Confirmation modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalBox: {
    width: '100%',
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: {
    color: Colors.text.primary,
    fontSize: Typography.lg,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalMessage: {
    color: Colors.text.secondary,
    fontSize: Typography.base,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  modalBtn: {
    flex: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  modalCancelBtn: {
    backgroundColor: Colors.bg.elevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalRemoveBtn: {
    backgroundColor: Colors.status.ended,
  },
  modalCancelText: {
    color: Colors.text.primary,
    fontSize: Typography.base,
    fontWeight: '600',
  },
  modalRemoveText: {
    color: '#fff',
    fontSize: Typography.base,
    fontWeight: '700',
  },
});
