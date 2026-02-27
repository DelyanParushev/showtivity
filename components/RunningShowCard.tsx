import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { showStatusLabel, showStatusColor, formatAirDate } from '../utils/dateUtils';
import { getTmdbPoster } from '../services/traktApi';
import type { EnrichedShow } from '../types/trakt';
import { TMDB_CONFIG } from '../config/trakt';

interface RunningShowCardProps {
  item: EnrichedShow;
  onPress: () => void;
}

export function RunningShowCard({ item, onPress }: RunningShowCardProps) {
  const { show, nextEpisode, daysUntilNext, progress } = item;
  const days = daysUntilNext ?? null;
  const color = showStatusColor(show.status, days);
  const label = showStatusLabel(show.status, nextEpisode?.first_aired, days);

  const completionPct =
    progress && progress.aired > 0
      ? (progress.completed / progress.aired) * 100
      : 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Poster thumbnail */}
      <View style={styles.posterContainer}>
        <RunningPoster tmdbId={show.ids.tmdb} title={show.title} />
      </View>

      {/* Main info */}
      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {show.title}
        </Text>
        <Text style={styles.network} numberOfLines={1}>
          {show.network} · {show.year}
        </Text>

        {/* Status + next episode */}
        <View style={styles.episodeRow}>
          <View style={[styles.countdownBadge, { backgroundColor: color + '22' }]}>
            <Ionicons name="time-outline" size={12} color={color} />
            <Text style={[styles.countdownText, { color }]}>{label}</Text>
          </View>
          {nextEpisode ? (
            <Text style={styles.episodeLabel}>
              S{String(nextEpisode.season).padStart(2, '0')}E
              {String(nextEpisode.number).padStart(2, '0')}
              {nextEpisode.title ? ` · ${nextEpisode.title}` : ''}
            </Text>
          ) : null}
        </View>

        {/* Progress bar */}
        {progress && progress.aired > 0 && (
          <View style={styles.progressSection}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(100, completionPct)}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {progress.completed}/{progress.aired} eps
            </Text>
          </View>
        )}
      </View>

      {/* Countdown circle */}
      <View style={[styles.countdownCircle, { backgroundColor: color }]}>
        <Text style={styles.countdownDays}>
          {days !== null && days >= 0 ? days : '—'}
        </Text>
        <Text style={styles.countdownDaysLabel}>
          {days === 0 ? 'today' : 'days'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function RunningPoster({
  tmdbId,
  title,
}: {
  tmdbId?: number;
  title: string;
}) {
  const [failed, setFailed] = React.useState(false);

  const { data: images } = useQuery({
    queryKey: ['tmdbPoster', tmdbId],
    queryFn: () => getTmdbPoster(tmdbId, TMDB_CONFIG.API_KEY),
    enabled: !!tmdbId && !!TMDB_CONFIG.API_KEY,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });

  const posterUrl = images?.poster ?? null;

  if (!posterUrl || failed) {
    return (
      <View style={styles.posterPlaceholder}>
        <Ionicons name="tv-outline" size={20} color={Colors.text.muted} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: posterUrl }}
      style={StyleSheet.absoluteFill}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  posterContainer: {
    width: 100,
    height: 150,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bg.elevated,
    overflow: 'hidden',
  },
  posterPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    flex: 1,
    gap: 5,
  },
  title: {
    color: Colors.text.primary,
    fontSize: Typography.base,
    fontWeight: '600',
  },
  network: {
    color: Colors.text.muted,
    fontSize: Typography.xs,
  },
  episodeRow: {
    gap: 4,
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    gap: 4,
  },
  countdownText: {
    fontSize: Typography.xs,
    fontWeight: '700',
  },
  episodeLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.xs,
  },
  noEpisode: {
    color: Colors.text.muted,
    fontSize: Typography.xs,
    fontStyle: 'italic',
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 2,
  },
  progressBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.bg.elevated,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.status.running,
    borderRadius: 2,
  },
  progressText: {
    color: Colors.text.muted,
    fontSize: 10,
    minWidth: 50,
    textAlign: 'right',
  },
  countdownCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownDays: {
    color: '#fff',
    fontSize: Typography.lg,
    fontWeight: '700',
    lineHeight: 20,
  },
  countdownDaysLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 9,
  },
});
