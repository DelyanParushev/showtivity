// ─── Trakt API Types ───────────────────────────────────────────────────────────

export interface TraktShow {
  title: string;
  year: number;
  ids: {
    trakt: number;
    slug: string;
    tvdb?: number;
    imdb?: string;
    tmdb?: number;
  };
}

export interface TraktShowExtended extends TraktShow {
  overview: string;
  first_aired: string | null;
  airs: {
    day: string;
    time: string;
    timezone: string;
  };
  runtime: number;
  certification: string;
  network: string;
  country: string;
  trailer: string | null;
  homepage: string | null;
  status: ShowStatus;
  rating: number;
  votes: number;
  comment_count: number;
  updated_at: string;
  language: string;
  available_translations: string[];
  genres: string[];
  aired_episodes: number;
}

export type ShowStatus =
  | 'returning series'
  | 'continuing'
  | 'in production'
  | 'planned'
  | 'upcoming'
  | 'pilot'
  | 'canceled'
  | 'ended';

export interface TraktEpisode {
  season: number;
  number: number;
  title: string;
  ids: {
    trakt: number;
    tvdb?: number;
    imdb?: string;
    tmdb?: number;
  };
  number_abs?: number;
  overview?: string;
  rating?: number;
  votes?: number;
  comment_count?: number;
  first_aired?: string | null;
  updated_at?: string;
  available_translations?: string[];
  runtime?: number;
}

export interface TraktWatchlistItem {
  rank: number;
  id: number;
  listed_at: string;
  notes: string | null;
  type: 'show' | 'movie' | 'season' | 'episode';
  show: TraktShowExtended;
}

export interface TraktWatchedShow {
  plays: number;
  last_watched_at: string;
  last_updated_at: string;
  reset_at: string | null;
  show: TraktShowExtended;
  seasons: TraktWatchedSeason[];
}

export interface TraktWatchedSeason {
  number: number;
  episodes: TraktWatchedEpisode[];
}

export interface TraktWatchedEpisode {
  number: number;
  plays: number;
  last_watched_at: string;
}

export interface TraktWatchProgress {
  aired: number;
  completed: number;
  last_watched_at: string | null;
  reset_at: string | null;
  seasons: TraktProgressSeason[];
  hidden_seasons: TraktProgressSeason[];
  next_episode: TraktEpisode | null;
  last_episode: TraktEpisode | null;
}

export interface TraktProgressSeason {
  number: number;
  title?: string;
  aired: number;
  completed: number;
  episodes: TraktProgressEpisode[];
}

export interface TraktProgressEpisode {
  number: number;
  completed: boolean;
  last_watched_at: string | null;
}

export interface TraktSearchResult {
  type: 'show' | 'movie' | 'episode' | 'person' | 'list';
  score: number;
  show?: TraktShowExtended;
}

export interface TraktSeason {
  number: number;
  ids: {
    trakt: number;
    tvdb?: number;
    tmdb?: number;
  };
  episode_count: number;
  aired_episodes: number;
  title?: string;
  overview?: string | null;
  first_aired?: string | null;
  rating?: number;
  votes?: number;
  network?: string;
}

export interface TraktSeasonEpisode {
  season: number;
  number: number;
  title: string;
  ids: {
    trakt: number;
    tvdb?: number;
    imdb?: string;
    tmdb?: number;
  };
  number_abs?: number | null;
  overview?: string | null;
  rating?: number;
  votes?: number;
  first_aired?: string | null;
  runtime?: number | null;
}



export interface TraktAuthTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  created_at: number;
}

export interface TraktUser {
  username: string;
  private: boolean;
  name: string;
  vip: boolean;
  vip_ep: boolean;
  ids: {
    slug: string;
    uuid: string;
  };
  joined_at: string;
  location: string | null;
  about: string | null;
  gender: string | null;
  age: number | null;
  images: {
    avatar: { full: string };
  };
}

// ─── App-level Types ───────────────────────────────────────────────────────────

export type ShowCategory =
  | 'watching'
  | 'watchlist'
  | 'running'
  | 'waiting'
  | 'ended';

export interface EnrichedShow {
  show: TraktShowExtended;
  category: ShowCategory;
  progress?: TraktWatchProgress;
  nextEpisode?: TraktEpisode | null;
  daysUntilNext?: number | null;
  lastWatchedAt?: string | null;
  watchlistId?: number;
}

export interface TraktDeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_url: string;
  expires_in: number;
  interval: number;
}
