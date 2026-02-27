import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import {
  useSeasons,
  useSeasonEpisodes,
  useShowProgressDetail,
  useMarkEpisodeWatched,
  useUnmarkEpisodeWatched,
  useMarkSeasonWatched,
  useUnmarkSeasonWatched,
} from '../hooks/useShows';
import type { TraktSeason, TraktSeasonEpisode, TraktProgressSeason } from '../types/trakt';
import { formatAirDate } from '../utils/dateUtils';
import { TMDB_CONFIG } from '../config/trakt';

// ─── TMDB Season Fetcher ───────────────────────────────────────────────────────
// One call per season returns both the season poster AND all episode stills.
// TanStack Query dedupes/caches this so SeasonCard + EpisodeRow share the same result.

async function fetchTmdbSeasonData(
  tmdbId: number,
  season: number,
  apiKey: string
): Promise<{ poster: string | null; stills: Record<number, string | null> }> {
  try {
    const res = await axios.get(
      `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season}`,
      { params: { api_key: apiKey } }
    );
    const data = res.data;
    const stills: Record<number, string | null> = {};
    (data.episodes ?? []).forEach((ep: any) => {
      stills[ep.episode_number] = ep.still_path
        ? `https://image.tmdb.org/t/p/w300${ep.still_path}`
        : null;
    });
    return {
      poster: data.poster_path
        ? `https://image.tmdb.org/t/p/w342${data.poster_path}`
        : null,
      stills,
    };
  } catch {
    return { poster: null, stills: {} };
  }
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface SeasonsSectionProps {
  showSlug: string;
  showTraktId: number;
  showTmdbId?: number;
  isInMyShows: boolean;
}

export function SeasonsSection({
  showSlug,
  showTraktId,
  showTmdbId,
  isInMyShows,
}: SeasonsSectionProps) {
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);

  const { data: seasons = [], isLoading } = useSeasons(showSlug);
  const { data: progressData } = useShowProgressDetail(showSlug, isInMyShows);
  const markSeason = useMarkSeasonWatched(showSlug);
  const unmarkSeason = useUnmarkSeasonWatched(showSlug);

  const getSeasonProgress = (n: number) =>
    progressData?.seasons.find((s) => s.number === n);

  const handleSeasonCheck = (seasonNumber: number, allWatched: boolean) => {
    const fn = allWatched ? unmarkSeason : markSeason;
    fn.mutate(
      { showTraktId, season: seasonNumber },
      { onError: (err) => Alert.alert('Error', err?.message ?? 'Could not update season') }
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color={Colors.accent.primary} />
        <Text style={styles.loadingText}>Loading seasons...</Text>
      </View>
    );
  }

  if (seasons.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Horizontal season poster row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.seasonsScroll}
      >
        {seasons.map((season) => {
          const sp = getSeasonProgress(season.number);
          const aired = sp?.aired ?? season.aired_episodes ?? 0;
          const completed = sp?.completed ?? 0;
          const allWatched = aired > 0 && completed >= aired;
          const isSelected = selectedSeason === season.number;

          return (
            <SeasonCard
              key={season.number}
              season={season}
              showTmdbId={showTmdbId}
              completed={completed}
              aired={aired}
              allWatched={allWatched}
              isSelected={isSelected}
              isInMyShows={isInMyShows}
              isCheckPending={markSeason.isPending || unmarkSeason.isPending}
              onSelect={() => setSelectedSeason(isSelected ? null : season.number)}
              onCheck={() => handleSeasonCheck(season.number, allWatched)}
            />
          );
        })}
      </ScrollView>

      {/* Horizontal episode still row - appears when a season is tapped */}
      {selectedSeason !== null && (
        <EpisodeRow
          showSlug={showSlug}
          seasonNumber={selectedSeason}
          showTmdbId={showTmdbId}
          seasonProgress={getSeasonProgress(selectedSeason)}
          isInMyShows={isInMyShows}
        />
      )}
    </View>
  );
}

// ─── Season Card ───────────────────────────────────────────────────────────────

interface SeasonCardProps {
  season: TraktSeason;
  showTmdbId?: number;
  completed: number;
  aired: number;
  allWatched: boolean;
  isSelected: boolean;
  isInMyShows: boolean;
  isCheckPending: boolean;
  onSelect: () => void;
  onCheck: () => void;
}

function SeasonCard({
  season,
  showTmdbId,
  completed,
  aired,
  allWatched,
  isSelected,
  isInMyShows,
  isCheckPending,
  onSelect,
  onCheck,
}: SeasonCardProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const pct = aired > 0 ? Math.min(100, (completed / aired) * 100) : 0;

  const { data: tmdbData } = useQuery({
    queryKey: ['tmdbSeason', showTmdbId, season.number],
    queryFn: () => fetchTmdbSeasonData(showTmdbId!, season.number, TMDB_CONFIG.API_KEY),
    enabled: !!showTmdbId && !!TMDB_CONFIG.API_KEY,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 48 * 60 * 60 * 1000,
  });

  return (
    <View style={styles.seasonCard}>
      {/* Poster area */}
      <View style={[styles.seasonPoster, isSelected && styles.seasonPosterSelected]}>
        {/* Image */}
        {tmdbData?.poster && !imgFailed ? (
          <Image
            source={{ uri: tmdbData.poster }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <View style={styles.posterFallback}>
            <Text style={styles.posterFallbackNum}>S{season.number}</Text>
          </View>
        )}

        {/* Completed overlay */}
        {allWatched && (
          <View style={styles.watchedOverlay}>
            <Ionicons name="checkmark-circle" size={34} color={Colors.status.running} />
          </View>
        )}

        {/* Progress bar along poster bottom */}
        {isInMyShows && aired > 0 && pct > 0 && !allWatched && (
          <View style={styles.posterProgressBg}>
            <View style={[styles.posterProgressFill, { width: `${pct}%` as any }]} />
          </View>
        )}

        {/* Invisible select overlay - sits below the check button */}
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onSelect} activeOpacity={0.75} />

        {/* Check button - rendered last so it is above the select overlay */}
        {isInMyShows && aired > 0 && (
          <TouchableOpacity
            style={[styles.seasonCheckBtn, allWatched && styles.seasonCheckBtnDone]}
            onPress={onCheck}
            disabled={isCheckPending}
          >
            {isCheckPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons
                name={allWatched ? 'checkmark' : 'add'}
                size={13}
                color="#fff"
              />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Label + progress count below poster */}
      <TouchableOpacity onPress={onSelect} activeOpacity={0.7}>
        <Text style={styles.seasonLabel} numberOfLines={1}>
          Season {season.number}
        </Text>
        {isInMyShows && aired > 0 && (
          <Text style={[styles.seasonMeta, allWatched && styles.seasonMetaDone]}>
            {completed}/{aired}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── Episode Row ───────────────────────────────────────────────────────────────

interface EpisodeRowProps {
  showSlug: string;
  seasonNumber: number;
  showTmdbId?: number;
  seasonProgress: TraktProgressSeason | undefined;
  isInMyShows: boolean;
}

function EpisodeRow({
  showSlug,
  seasonNumber,
  showTmdbId,
  seasonProgress,
  isInMyShows,
}: EpisodeRowProps) {
  const { data: episodes = [], isLoading } = useSeasonEpisodes(showSlug, seasonNumber);
  const markEp = useMarkEpisodeWatched(showSlug);
  const unmarkEp = useUnmarkEpisodeWatched(showSlug);
  const [pendingId, setPendingId] = useState<number | null>(null);

  // Reuse the exact same query key as SeasonCard - zero extra API calls
  const { data: tmdbData } = useQuery({
    queryKey: ['tmdbSeason', showTmdbId, seasonNumber],
    queryFn: () => fetchTmdbSeasonData(showTmdbId!, seasonNumber, TMDB_CONFIG.API_KEY),
    enabled: !!showTmdbId && !!TMDB_CONFIG.API_KEY,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 48 * 60 * 60 * 1000,
  });

  const isWatched = (ep: TraktSeasonEpisode): boolean =>
    seasonProgress?.episodes.find((e) => e.number === ep.number)?.completed ?? false;

  const handleToggle = (ep: TraktSeasonEpisode) => {
    const watched = isWatched(ep);
    setPendingId(ep.ids.trakt);
    (watched ? unmarkEp : markEp).mutate(ep.ids.trakt, {
      onSettled: () => setPendingId(null),
      onError: (err) => Alert.alert('Error', err?.message ?? 'Could not update episode'),
    });
  };

  if (isLoading) {
    return (
      <View style={styles.epLoadingRow}>
        <ActivityIndicator size="small" color={Colors.accent.primary} />
      </View>
    );
  }

  const today = new Date();

  return (
    <View style={styles.episodeRowWrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.episodesScroll}
      >
        {episodes.map((ep) => {
          const watched = isWatched(ep);
          const hasAired = ep.first_aired ? new Date(ep.first_aired) <= today : false;
          const stillUrl = tmdbData?.stills?.[ep.number] ?? null;

          return (
            <EpisodeCard
              key={ep.ids.trakt}
              episode={ep}
              stillUrl={stillUrl}
              watched={watched}
              isPending={pendingId === ep.ids.trakt}
              hasAired={hasAired}
              isInMyShows={isInMyShows}
              onToggle={() => handleToggle(ep)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Episode Card ───────────────────────────────────────────────────────────────

interface EpisodeCardProps {
  episode: TraktSeasonEpisode;
  stillUrl: string | null;
  watched: boolean;
  isPending: boolean;
  hasAired: boolean;
  isInMyShows: boolean;
  onToggle: () => void;
}

function EpisodeCard({
  episode,
  stillUrl,
  watched,
  isPending,
  hasAired,
  isInMyShows,
  onToggle,
}: EpisodeCardProps) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <View style={[styles.epCard, watched && styles.epCardWatched]}>
      {/* Still image */}
      <View style={styles.epStill}>
        {stillUrl && !imgFailed ? (
          <Image
            source={{ uri: stillUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <View style={styles.epStillFallback}>
            <Ionicons name="film-outline" size={22} color={Colors.text.muted} />
          </View>
        )}

        {/* Watched dim layer */}
        {watched && <View style={styles.watchedDim} />}

        {/* Episode number badge bottom-left */}
        <View style={styles.epNumBadge}>
          <Text style={styles.epNumText}>E{episode.number}</Text>
        </View>

        {/* Watch toggle top-right - only for aired eps */}
        {isInMyShows && hasAired && (
          <TouchableOpacity
            style={styles.epCheckBtn}
            onPress={onToggle}
            disabled={isPending}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons
                name={watched ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={watched ? Colors.status.running : 'rgba(255,255,255,0.8)'}
              />
            )}
          </TouchableOpacity>
        )}

        {/* Upcoming badge for unaired episodes */}
        {!hasAired && episode.first_aired ? (
          <View style={styles.unairedBadge}>
            <Text style={styles.unairedText}>Upcoming</Text>
          </View>
        ) : null}
      </View>

      {/* Title + air date */}
      <Text style={[styles.epTitle, watched && styles.epTitleWatched]} numberOfLines={2}>
        {episode.title || `Episode ${episode.number}`}
      </Text>
      {episode.first_aired ? (
        <Text style={styles.epDate}>{formatAirDate(episode.first_aired)}</Text>
      ) : null}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const SEASON_W = 110;
const SEASON_H = 165;
const EP_W = 158;
const EP_STILL_H = 89;

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  loadingText: {
    color: Colors.text.muted,
    fontSize: Typography.sm,
  },
  seasonsScroll: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  seasonCard: {
    width: SEASON_W,
  },
  seasonPoster: {
    width: SEASON_W,
    height: SEASON_H,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg.elevated,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  seasonPosterSelected: {
    borderColor: Colors.accent.primary,
  },
  posterFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterFallbackNum: {
    color: Colors.text.muted,
    fontSize: Typography['2xl'],
    fontWeight: '800',
  },
  watchedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterProgressBg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  posterProgressFill: {
    height: '100%',
    backgroundColor: Colors.status.watching,
  },
  seasonCheckBtn: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seasonCheckBtnDone: {
    backgroundColor: Colors.status.running,
  },
  seasonLabel: {
    color: Colors.text.primary,
    fontSize: Typography.xs,
    fontWeight: '600',
  },
  seasonMeta: {
    color: Colors.text.muted,
    fontSize: 10,
    marginTop: 2,
  },
  seasonMetaDone: {
    color: Colors.status.running,
  },
  episodeRowWrapper: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  episodesScroll: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  epLoadingRow: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  epCard: {
    width: EP_W,
  },
  epCardWatched: {
    opacity: 0.6,
  },
  epStill: {
    width: EP_W,
    height: EP_STILL_H,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bg.elevated,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  epStillFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchedDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  epNumBadge: {
    position: 'absolute',
    bottom: Spacing.xs,
    left: Spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  epNumText: {
    color: Colors.text.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  epCheckBtn: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
  },
  unairedBadge: {
    position: 'absolute',
    top: Spacing.xs,
    left: Spacing.xs,
    backgroundColor: Colors.status.waiting + 'dd',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  unairedText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '700',
  },
  epTitle: {
    color: Colors.text.primary,
    fontSize: Typography.xs,
    fontWeight: '500',
    lineHeight: 15,
  },
  epTitleWatched: {
    color: Colors.text.muted,
  },
  epDate: {
    color: Colors.text.muted,
    fontSize: 10,
    marginTop: 2,
  },
});
