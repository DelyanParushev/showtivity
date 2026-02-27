import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWatchlist,
  getWatchedShows,
  getShowDetails,
  getShowProgress,
  getNextEpisode,
  searchShows,
  addToWatchlist,
  removeFromWatchlist,
  getRecommendations,
  getSeasons,
  getSeasonEpisodes,
  markEpisodeWatched,
  unmarkEpisodeWatched,
  markSeasonWatched,
  unmarkSeasonWatched,
} from '../services/traktApi';
import { useAuthStore } from '../store/authStore';
import { daysUntil } from '../utils/dateUtils';
import type { EnrichedShow, TraktSearchResult, ShowCategory, TraktShowExtended, TraktSeason, TraktSeasonEpisode, TraktProgressSeason } from '../types/trakt';

// ─── Query Keys ────────────────────────────────────────────────────────────────

export const queryKeys = {
  watchlist: ['watchlist'] as const,
  watchedShows: ['watchedShows'] as const,
  showProgress: (id: string | number) => ['showProgress', id] as const,
  nextEpisode: (id: string | number) => ['nextEpisode', id] as const,
  search: (q: string) => ['search', q] as const,
  allShows: ['allShows'] as const,
  recommendations: ['recommendations'] as const,
  seasons: (slug: string) => ['seasons', slug] as const,
  seasonEpisodes: (slug: string, season: number) => ['seasonEpisodes', slug, season] as const,
  showProgressDetail: (slug: string) => ['showProgressDetail', slug] as const,
};

// ─── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * Fetches all shows across every category and enriches them with
 * progress data, next episode info, and countdown values.
 */
export function useAllShows() {
  const getValidToken = useAuthStore((s) => s.getValidToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAuthLoading = useAuthStore((s) => s.isLoading);

  return useQuery<EnrichedShow[]>({
    queryKey: queryKeys.allShows,
    queryFn: async () => {
      const token = await getValidToken();
      if (!token) return [];

      // Parallel: fetch watchlist and watched shows
      const [watchlistItems, watchedItems] = await Promise.all([
        getWatchlist(token),
        getWatchedShows(token),
      ]);

      // Filter to shows only — the watchlist can contain movies/episodes too
      const showWatchlist = watchlistItems.filter(
        (i) => i.type === 'show' && i.show != null
      );

      // Build a map of watchlist show IDs
      const watchlistIds = new Set(
        showWatchlist.map((i) => i.show.ids.trakt)
      );

      // Collect all unique shows to enrich
      const allShowsMap = new Map<number, EnrichedShow>();

      // Add watchlist shows
      for (const item of showWatchlist) {
        const id = item.show.ids.trakt;
        allShowsMap.set(id, {
          show: item.show,
          category: 'watchlist',
          watchlistId: item.id,
          lastWatchedAt: null,
        });
      }

      // Add / override with watched shows (currently watching takes priority)
      // noseasons gives only basic show data (title/year/ids), so fetch full
      // details for watched shows that aren't already in the watchlist.
      const watchedOnlyShows = watchedItems.filter(
        (w) => !watchlistIds.has(w.show.ids.trakt)
      );
      const fullDetails = await Promise.all(
        watchedOnlyShows.map((w) =>
          getShowDetails(w.show.ids.slug, token).catch(() => w.show)
        )
      );
      watchedItems.forEach((item, idx) => {
        const id = item.show.ids.trakt;
        const notInWatchlist = !watchlistIds.has(id);
        const detailIdx = watchedOnlyShows.findIndex(
          (w) => w.show.ids.trakt === id
        );
        allShowsMap.set(id, {
          show: notInWatchlist && detailIdx >= 0 ? fullDetails[detailIdx] : item.show,
          category: 'watching',
          lastWatchedAt: item.last_watched_at,
        });
      });

      // Enrich each show with progress and next episode
      const enriched = await Promise.all(
        Array.from(allShowsMap.values()).map(async (entry) => {
          const slug = entry.show.ids.slug;
          const status = entry.show.status;

          try {
            // Only fetch progress for shows that have been started
            let progress = undefined;
            let nextEpisode = undefined;
            let daysUntilNext: number | null = null;

            if (entry.category === 'watching') {
              progress = await getShowProgress(token, slug);
              nextEpisode = progress.next_episode ?? null;
              // For returning series, the Airing page needs the future season
              // premiere date. progress.next_episode gives the next *unwatched*
              // episode — which may already have aired (user behind on seasons).
              // In that case its date is in the past and useless as a countdown.
              // Always fetch /next_episode for returning shows so we get the
              // real future premiere, regardless of watch progress.
              if (status === 'returning series' || status === 'continuing') {
                const progressEpDays = nextEpisode?.first_aired
                  ? daysUntil(nextEpisode.first_aired)
                  : null;
                // Fetch future premiere if: no episode, no date, or date is past
                if (!nextEpisode?.first_aired || (progressEpDays !== null && progressEpDays < 0)) {
                  const futureEp = await getNextEpisode(slug, token);
                  if (futureEp?.first_aired) {
                    nextEpisode = futureEp;
                  }
                }
              }
              if (nextEpisode?.first_aired) {
                daysUntilNext = daysUntil(nextEpisode.first_aired);
              }
              // Guard: if the user is fully caught up but the resolved next-episode
              // date is in the past, Trakt returned a stale placeholder. Treat as
              // no confirmed date → show moves to "Awaiting Release" not "Today".
              const isCaughtUp =
                progress.aired > 0 && progress.completed >= progress.aired;
              if (isCaughtUp && daysUntilNext !== null && daysUntilNext < 0) {
                daysUntilNext = null;
                nextEpisode = null;
              }
            } else if (status === 'returning series' || status === 'continuing') {
              nextEpisode = await getNextEpisode(slug, token);
              if (nextEpisode?.first_aired) {
                daysUntilNext = daysUntil(nextEpisode.first_aired);
              }
            }

            // Determine category
            let category: ShowCategory = entry.category;
            if (entry.category === 'watching') {
              // User is actively watching — always keep as 'watching'.
              // The show may have ended but the user is still mid-watch.
              category = 'watching';
            } else if (entry.category !== 'watchlist') {
              if (status === 'ended' || status === 'canceled') {
                category = 'ended';
              } else if (
                status === 'returning series' ||
                status === 'continuing'
              ) {
                category = 'running';
              } else if (
                status === 'planned' ||
                status === 'in production' ||
                status === 'upcoming' ||
                status === 'pilot'
              ) {
                category = 'waiting';
              }
            }

            return {
              ...entry,
              category,
              progress,
              nextEpisode,
              daysUntilNext,
            } as EnrichedShow;
          } catch {
            return entry;
          }
        })
      );

      return enriched;
    },
    enabled: isAuthenticated && !isAuthLoading,
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 30 * 60 * 1000,   // keep in cache 30 min
  });
}

/**
 * Search shows hook.
 */
export function useSearchShows(query: string) {
  const getValidToken = useAuthStore((s) => s.getValidToken);

  return useQuery<TraktSearchResult[]>({
    queryKey: queryKeys.search(query),
    queryFn: async () => {
      const token = await getValidToken();
      return searchShows(query, token ?? undefined);
    },
    enabled: query.trim().length >= 2,
    staleTime: 60 * 1000,
  });
}

/**
 * Personalised show recommendations for the authenticated user.
 */
export function useRecommendations() {
  const getValidToken = useAuthStore((s) => s.getValidToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAuthLoading = useAuthStore((s) => s.isLoading);

  return useQuery<TraktShowExtended[]>({
    queryKey: queryKeys.recommendations,
    queryFn: async () => {
      const token = await getValidToken();
      if (!token) return [];
      return getRecommendations(token, 20);
    },
    enabled: isAuthenticated && !isAuthLoading,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

/**
 * Add show to watchlist mutation.
 * Pass `show` (TraktShowExtended) to get an instant optimistic cache update
 * in "My Shows" without waiting for the full background refetch.
 */
export function useAddToWatchlist() {
  const queryClient = useQueryClient();
  const getValidToken = useAuthStore((s) => s.getValidToken);

  return useMutation({
    mutationFn: async ({ traktId }: { traktId: number; show?: TraktShowExtended }) => {
      const token = await getValidToken();
      if (!token) throw new Error('Not authenticated');
      await addToWatchlist(token, traktId);
    },
    onMutate: async ({ traktId, show }) => {
      // Snapshot the current cache for rollback on error
      const prev = queryClient.getQueryData<EnrichedShow[]>(queryKeys.allShows);
      // Optimistically insert the show immediately (if the cache is already populated)
      if (show && prev && !prev.find((s) => s.show.ids.trakt === traktId)) {
        const optimistic: EnrichedShow = {
          show,
          category: 'watchlist',
          lastWatchedAt: null,
          nextEpisode: null,
          daysUntilNext: null,
        };
        queryClient.setQueryData<EnrichedShow[]>(queryKeys.allShows, [...prev, optimistic]);
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      // Roll back to the snapshot on failure
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(queryKeys.allShows, ctx.prev);
      }
    },
    onSuccess: (_data, { traktId, show }) => {
      // Belt-and-suspenders: if the optimistic update in onMutate was skipped
      // (e.g. the initial fetch hadn't completed yet), insert the show now that
      // we know for certain the API call succeeded.
      if (show) {
        queryClient.setQueryData<EnrichedShow[]>(queryKeys.allShows, (old) => {
          if (!old) return old;
          if (old.find((s) => s.show.ids.trakt === traktId)) return old;
          const entry: EnrichedShow = {
            show,
            category: 'watchlist',
            lastWatchedAt: null,
            nextEpisode: null,
            daysUntilNext: null,
          };
          return [...old, entry];
        });
      }
      // Background refetch to get fully-enriched data (next episode, progress, etc.)
      queryClient.invalidateQueries({ queryKey: queryKeys.allShows });
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist });
      // Refresh recommendations so the added show disappears from the list
      queryClient.invalidateQueries({ queryKey: queryKeys.recommendations });
    },
  });
}

/**
 * Remove show from watchlist mutation.
 */
export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient();
  const getValidToken = useAuthStore((s) => s.getValidToken);

  return useMutation({
    mutationFn: async (showTraktId: number) => {
      const token = await getValidToken();
      if (!token) throw new Error('Not authenticated');
      await removeFromWatchlist(token, showTraktId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.allShows });
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist });
    },
  });
}

/**
 * Returns category-filtered show lists.
 */
export function useCategorizedShows() {
  const { data: shows = [], isLoading, error, refetch } = useAllShows();

  const WAITING_STATUSES = ['planned', 'in production', 'upcoming', 'pilot'];
  const RUNNING_STATUSES = ['returning series', 'continuing'];
  const ENDED_STATUSES = ['ended', 'canceled'];

  const watching = shows
    .filter((s) => {
      if (s.category !== 'watching') return false;
      // Fully watched + ended/canceled → move to ended section
      const isFullyWatched =
        s.progress && s.progress.aired > 0 && s.progress.completed >= s.progress.aired;
      if (ENDED_STATUSES.includes(s.show.status) && isFullyWatched) return false;
      // Caught up (no unwatched aired episodes) → nothing left to watch right now,
      // show belongs on the Airing page only (with or without a known return date)
      if (isFullyWatched) return false;
      return true;
    })
    .sort((a, b) => {
      // Most-recently watched first
      const aTime = a.lastWatchedAt ? new Date(a.lastWatchedAt).getTime() : 0;
      const bTime = b.lastWatchedAt ? new Date(b.lastWatchedAt).getTime() : 0;
      return bTime - aTime;
    });
  const watchlist = shows.filter((s) => s.category === 'watchlist');
  const running = shows
    .filter(
      (s) =>
        s.category === 'running' ||
        (s.category === 'watchlist' && RUNNING_STATUSES.includes(s.show.status)) ||
        // All watching shows with a returning/continuing status appear on the
        // Airing page. daysUntilNext is now always the future premiere date
        // (not a past unwatched episode), so the countdown is correct.
        (s.category === 'watching' && RUNNING_STATUSES.includes(s.show.status))
    )
    .sort((a, b) => (a.daysUntilNext ?? 9999) - (b.daysUntilNext ?? 9999));
  const waiting = shows.filter(
    (s) =>
      s.category === 'waiting' ||
      (s.category === 'watchlist' && WAITING_STATUSES.includes(s.show.status))
  );
  // Include pure ended shows + watchlist shows that ended
  // + actively-watched shows that are ended AND fully watched
  const ended = shows.filter((s) => {
    if (s.category === 'ended') return true;
    if (s.category === 'watchlist' && ENDED_STATUSES.includes(s.show.status)) return true;
    if (s.category === 'watching' && ENDED_STATUSES.includes(s.show.status)) {
      // Only move here once every episode has been watched — partially-watched
      // ended shows remain in "Continue Watching" until the user finishes them.
      const isFullyWatched = s.progress && s.progress.aired > 0 && s.progress.completed >= s.progress.aired;
      return Boolean(isFullyWatched);
    }
    return false;
  });

  return { watching, watchlist, running, waiting, ended, isLoading, error, refetch };
}

// ─── Seasons & Episodes ────────────────────────────────────────────────────────

export function useSeasons(slug: string) {
  const getValidToken = useAuthStore((s) => s.getValidToken);
  return useQuery<TraktSeason[]>({
    queryKey: queryKeys.seasons(slug),
    queryFn: async () => {
      const token = await getValidToken();
      return getSeasons(slug, token ?? undefined);
    },
    enabled: Boolean(slug),
    staleTime: 60 * 60 * 1000, // season list rarely changes
    gcTime: 24 * 60 * 60 * 1000,
  });
}

export function useSeasonEpisodes(slug: string, season: number, enabled = true) {
  const getValidToken = useAuthStore((s) => s.getValidToken);
  return useQuery<TraktSeasonEpisode[]>({
    queryKey: queryKeys.seasonEpisodes(slug, season),
    queryFn: async () => {
      const token = await getValidToken();
      return getSeasonEpisodes(slug, season, token ?? undefined);
    },
    enabled: Boolean(slug) && season > 0 && enabled,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

/** Full per-episode watch progress for the show detail seasons view. */
export function useShowProgressDetail(slug: string, isInMyShows: boolean) {
  const getValidToken = useAuthStore((s) => s.getValidToken);
  return useQuery({
    queryKey: queryKeys.showProgressDetail(slug),
    queryFn: async () => {
      const token = await getValidToken();
      if (!token) return null;
      return getShowProgress(token, slug);
    },
    enabled: Boolean(slug) && isInMyShows,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useMarkEpisodeWatched(showSlug: string) {
  const queryClient = useQueryClient();
  const getValidToken = useAuthStore((s) => s.getValidToken);

  return useMutation({
    mutationFn: async (episodeTraktId: number) => {
      const token = await getValidToken();
      if (!token) throw new Error('Not authenticated');
      await markEpisodeWatched(token, episodeTraktId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.showProgressDetail(showSlug) });
      queryClient.invalidateQueries({ queryKey: queryKeys.allShows });
    },
  });
}

export function useUnmarkEpisodeWatched(showSlug: string) {
  const queryClient = useQueryClient();
  const getValidToken = useAuthStore((s) => s.getValidToken);

  return useMutation({
    mutationFn: async (episodeTraktId: number) => {
      const token = await getValidToken();
      if (!token) throw new Error('Not authenticated');
      await unmarkEpisodeWatched(token, episodeTraktId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.showProgressDetail(showSlug) });
      queryClient.invalidateQueries({ queryKey: queryKeys.allShows });
    },
  });
}

export function useMarkSeasonWatched(showSlug: string) {
  const queryClient = useQueryClient();
  const getValidToken = useAuthStore((s) => s.getValidToken);

  return useMutation({
    mutationFn: async ({ showTraktId, season }: { showTraktId: number; season: number }) => {
      const token = await getValidToken();
      if (!token) throw new Error('Not authenticated');
      await markSeasonWatched(token, showTraktId, season);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.showProgressDetail(showSlug) });
      queryClient.invalidateQueries({ queryKey: queryKeys.allShows });
    },
  });
}

export function useUnmarkSeasonWatched(showSlug: string) {
  const queryClient = useQueryClient();
  const getValidToken = useAuthStore((s) => s.getValidToken);

  return useMutation({
    mutationFn: async ({ showTraktId, season }: { showTraktId: number; season: number }) => {
      const token = await getValidToken();
      if (!token) throw new Error('Not authenticated');
      await unmarkSeasonWatched(token, showTraktId, season);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.showProgressDetail(showSlug) });
      queryClient.invalidateQueries({ queryKey: queryKeys.allShows });
    },
  });
}
