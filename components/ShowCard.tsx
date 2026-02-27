import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { CategoryConfig } from '../constants/theme';
import { showStatusLabel, showStatusColor } from '../utils/dateUtils';
import { getTmdbPoster } from '../services/traktApi';
import type { EnrichedShow } from '../types/trakt';
import { TMDB_CONFIG } from '../config/trakt';

const CARD_WIDTH = Math.min(
  160,
  (Dimensions.get('window').width - Spacing.lg * 2 - Spacing.md) / 2
);
const CARD_HEIGHT = CARD_WIDTH * 1.5;

interface ShowCardProps {
  item: EnrichedShow;
  onPress: () => void;
  onWatchlistToggle?: () => void;
  isInWatchlist?: boolean;
  compact?: boolean;
}

export function ShowCard({
  item,
  onPress,
  onWatchlistToggle,
  isInWatchlist,
  compact = false,
}: ShowCardProps) {
  const { show, category, nextEpisode, daysUntilNext, progress } = item;
  const categoryConfig = CategoryConfig[category];
  const posterUrl = show.ids.tmdb
    ? `${TMDB_CONFIG.IMAGE_BASE_URL}${show.ids.tmdb ? `/3/tv/${show.ids.tmdb}/images` : ''}`
    : null;

  // Build a placeholder poster URL via TMDB
  const tmdbPosterUrl = show.ids.tmdb
    ? `https://image.tmdb.org/t/p/w342${show.ids.tmdb}` // will fail, but handled
    : null;

  const statusText = showStatusLabel(show.status, nextEpisode?.first_aired, daysUntilNext ?? null);
  const statusCol = showStatusColor(show.status, daysUntilNext ?? null);

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactCard}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.compactPosterContainer}>
          <PosterImage tmdbId={show.ids.tmdb} title={show.title} />
        </View>
        <View style={styles.compactInfo}>
          <Text style={styles.compactTitle} numberOfLines={2}>
            {show.title}
          </Text>
          <Text style={styles.compactYear}>{show.year}</Text>
          <View style={styles.tagRow}>
            <StatusTag category={category} />
          </View>
          <Text style={[styles.countdown, { color: statusCol }]}>
            {statusText}
          </Text>
        </View>
        {onWatchlistToggle && (
          <TouchableOpacity
            onPress={onWatchlistToggle}
            style={styles.bookmarkBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isInWatchlist ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={isInWatchlist ? Colors.status.watchlist : Colors.text.muted}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, { width: CARD_WIDTH }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Poster */}
      <View style={[styles.posterContainer, { height: CARD_HEIGHT }]}>
        <PosterImage tmdbId={show.ids.tmdb} title={show.title} large />

        {/* Watchlist toggle button */}
        {onWatchlistToggle && (
          <TouchableOpacity
            style={styles.bookmarkOverlay}
            onPress={onWatchlistToggle}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons
              name={isInWatchlist ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={isInWatchlist ? Colors.status.watchlist : '#fff'}
            />
          </TouchableOpacity>
        )}

        {/* Progress bar overlay */}
        {progress && progress.aired > 0 && (
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${Math.min(
                    100,
                    (progress.completed / progress.aired) * 100
                  )}%`,
                },
              ]}
            />
          </View>
        )}

        {/* Category badge */}
        <View style={styles.categoryBadge}>
          {category === 'watching' ? (
            <View style={[styles.tag, styles.tagSmall, { backgroundColor: Colors.status.watching + '25' }]}>
              <Text style={[styles.tagText, styles.tagTextSmall, { color: Colors.status.watching }]}>
                {nextEpisode
                  ? `S${String(nextEpisode.season).padStart(2, '0')}E${String(nextEpisode.number).padStart(2, '0')}`
                  : 'Up to date'}
              </Text>
            </View>
          ) : (
            <StatusTag category={category} small />
          )}
        </View>
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {show.title}
        </Text>
        <Text style={styles.cardYear}>{show.year}</Text>

        {/* Status */}
        <View style={styles.countdownRow}>
          <Ionicons
            name="time-outline"
            size={11}
            color={statusCol}
          />
          <Text style={[styles.countdownSmall, { color: statusCol }]}>
            {statusText}
          </Text>
        </View>

        {/* Rating */}
        {show.rating > 0 && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={11} color="#f59e0b" />
            <Text style={styles.ratingText}>{show.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Poster Image ──────────────────────────────────────────────────────────────

interface PosterImageProps {
  tmdbId?: number;
  title: string;
  large?: boolean;
}

export function PosterImage({ tmdbId, title, large }: PosterImageProps) {
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
        <Ionicons name="tv-outline" size={large ? 36 : 24} color={Colors.text.muted} />
        <Text style={styles.posterPlaceholderText} numberOfLines={3}>
          {title}
        </Text>
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

// ─── Status Tag ────────────────────────────────────────────────────────────────

interface StatusTagProps {
  category: EnrichedShow['category'];
  small?: boolean;
}

function StatusTag({ category, small }: StatusTagProps) {
  const config = CategoryConfig[category];
  return (
    <View
      style={[
        styles.tag,
        { backgroundColor: config.color + '25' },
        small && styles.tagSmall,
      ]}
    >
      <Text
        style={[
          styles.tagText,
          { color: config.color },
          small && styles.tagTextSmall,
        ]}
      >
        {small ? config.label.split(' ')[0] : config.label}
      </Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Grid card
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  posterContainer: {
    backgroundColor: Colors.bg.elevated,
    overflow: 'hidden',
  },
  posterPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg.elevated,
    gap: Spacing.sm,
    padding: Spacing.sm,
  },
  posterPlaceholderText: {
    color: Colors.text.muted,
    fontSize: Typography.xs,
    textAlign: 'center',
  },
  bookmarkOverlay: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: Radius.full,
    padding: 5,
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.status.watching,
    borderRadius: 2,
  },
  categoryBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
  },
  cardInfo: {
    padding: Spacing.sm,
    gap: 3,
  },
  cardTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sm,
    fontWeight: '600',
    lineHeight: 17,
  },
  cardYear: {
    color: Colors.text.muted,
    fontSize: Typography.xs,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 3,
  },
  countdownSmall: {
    fontSize: Typography.xs,
    fontWeight: '500',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    color: Colors.text.secondary,
    fontSize: Typography.xs,
  },
  // Compact (list) card
  compactCard: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  compactPosterContainer: {
    width: 60,
    height: 90,
    backgroundColor: Colors.bg.elevated,
    overflow: 'hidden',
  },
  compactInfo: {
    flex: 1,
    padding: Spacing.sm,
    gap: 4,
  },
  compactTitle: {
    color: Colors.text.primary,
    fontSize: Typography.base,
    fontWeight: '600',
  },
  compactYear: {
    color: Colors.text.muted,
    fontSize: Typography.xs,
  },
  tagRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  countdown: {
    fontSize: Typography.xs,
    fontWeight: '600',
  },
  bookmarkBtn: {
    padding: Spacing.md,
  },
  // Tags
  tag: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  tagSmall: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: Typography.xs,
    fontWeight: '600',
  },
  tagTextSmall: {
    fontSize: 10,
  },
});
