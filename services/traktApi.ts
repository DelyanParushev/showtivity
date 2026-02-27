import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { TRAKT_CONFIG } from '../config/trakt';
import type {
  TraktAuthTokens,
  TraktEpisode,
  TraktSearchResult,
  TraktSeason,
  TraktSeasonEpisode,
  TraktShowExtended,
  TraktUser,
  TraktWatchlistItem,
  TraktWatchProgress,
  TraktWatchedShow,
  TraktDeviceCodeResponse,
} from '../types/trakt';

// ─── Axios instance ────────────────────────────────────────────────────────────

const createApiClient = (accessToken?: string): AxiosInstance => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'trakt-api-key': TRAKT_CONFIG.CLIENT_ID,
    'trakt-api-version': TRAKT_CONFIG.API_VERSION,
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  return axios.create({ baseURL: TRAKT_CONFIG.BASE_URL, headers });
};

// ─── Auth ──────────────────────────────────────────────────────────────────────

/**
 * Exchange an OAuth authorization code for tokens.
 * Used in the web/native redirect flow.
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<TraktAuthTokens> {
  const response = await axios.post<TraktAuthTokens>(TRAKT_CONFIG.TOKEN_URL, {
    code,
    client_id: TRAKT_CONFIG.CLIENT_ID,
    client_secret: TRAKT_CONFIG.CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  return response.data;
}

/**
 * Refresh an expired access token using the refresh token.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<TraktAuthTokens> {
  const response = await axios.post<TraktAuthTokens>(TRAKT_CONFIG.TOKEN_URL, {
    refresh_token: refreshToken,
    client_id: TRAKT_CONFIG.CLIENT_ID,
    client_secret: TRAKT_CONFIG.CLIENT_SECRET,
    redirect_uri: TRAKT_CONFIG.REDIRECT_URI_NATIVE,
    grant_type: 'refresh_token',
  });
  return response.data;
}

/**
 * Revoke tokens (logout).
 */
export async function revokeToken(accessToken: string): Promise<void> {
  await axios.post(`${TRAKT_CONFIG.BASE_URL}/oauth/revoke`, {
    token: accessToken,
    client_id: TRAKT_CONFIG.CLIENT_ID,
    client_secret: TRAKT_CONFIG.CLIENT_SECRET,
  });
}

// ─── Device Code Auth (for TV / no-browser flow) ───────────────────────────────

export async function requestDeviceCode(): Promise<TraktDeviceCodeResponse> {
  const response = await axios.post<TraktDeviceCodeResponse>(
    TRAKT_CONFIG.DEVICE_CODE_URL,
    { client_id: TRAKT_CONFIG.CLIENT_ID }
  );
  return response.data;
}

export async function pollDeviceToken(
  deviceCode: string
): Promise<TraktAuthTokens | null> {
  try {
    const response = await axios.post<TraktAuthTokens>(
      TRAKT_CONFIG.TOKEN_URL,
      {
        code: deviceCode,
        client_id: TRAKT_CONFIG.CLIENT_ID,
        client_secret: TRAKT_CONFIG.CLIENT_SECRET,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }
    );
    return response.data;
  } catch {
    return null;
  }
}

// ─── User ──────────────────────────────────────────────────────────────────────

export async function getMe(accessToken: string): Promise<TraktUser> {
  const client = createApiClient(accessToken);
  const response = await client.get<TraktUser>('/users/me', {
    params: { extended: 'full' },
  });
  return response.data;
}

// ─── Shows ─────────────────────────────────────────────────────────────────────

export async function getShowDetails(
  showIdOrSlug: string | number,
  accessToken?: string
): Promise<TraktShowExtended> {
  const client = createApiClient(accessToken);
  const response = await client.get<TraktShowExtended>(
    `/shows/${showIdOrSlug}`,
    { params: { extended: 'full' } }
  );
  return response.data;
}

export async function getNextEpisode(
  showIdOrSlug: string | number,
  accessToken?: string
): Promise<TraktEpisode | null> {
  const client = createApiClient(accessToken);
  try {
    const response = await client.get<TraktEpisode>(
      `/shows/${showIdOrSlug}/next_episode`,
      { params: { extended: 'full' } }
    );
    return response.data;
  } catch {
    return null;
  }
}

export async function getLastEpisode(
  showIdOrSlug: string | number,
  accessToken?: string
): Promise<TraktEpisode | null> {
  const client = createApiClient(accessToken);
  try {
    const response = await client.get<TraktEpisode>(
      `/shows/${showIdOrSlug}/last_episode`,
      { params: { extended: 'full' } }
    );
    return response.data;
  } catch {
    return null;
  }
}

// ─── Watchlist ─────────────────────────────────────────────────────────────────

export async function getWatchlist(
  accessToken: string,
  username = 'me'
): Promise<TraktWatchlistItem[]> {
  const client = createApiClient(accessToken);
  const response = await client.get<TraktWatchlistItem[]>(
    `/users/${username}/watchlist/shows`,
    { params: { extended: 'full' } }
  );
  return response.data;
}

export async function addToWatchlist(
  accessToken: string,
  showTraktId: number
): Promise<void> {
  const client = createApiClient(accessToken);
  await client.post('/sync/watchlist', {
    shows: [{ ids: { trakt: showTraktId } }],
  });
}

export async function removeFromWatchlist(
  accessToken: string,
  showTraktId: number
): Promise<void> {
  const client = createApiClient(accessToken);
  await client.post('/sync/watchlist/remove', {
    shows: [{ ids: { trakt: showTraktId } }],
  });
}

// ─── Watched / Progress ────────────────────────────────────────────────────────

export async function getWatchedShows(
  accessToken: string,
  username = 'me'
): Promise<TraktWatchedShow[]> {
  const client = createApiClient(accessToken);
  const response = await client.get<TraktWatchedShow[]>(
    `/users/${username}/watched/shows`,
    { params: { extended: 'noseasons' } }
  );
  return response.data;
}

export async function getShowProgress(
  accessToken: string,
  showIdOrSlug: string | number
): Promise<TraktWatchProgress> {
  const client = createApiClient(accessToken);
  const response = await client.get<TraktWatchProgress>(
    `/shows/${showIdOrSlug}/progress/watched`
  );
  return response.data;
}

export async function getSeasons(
  showIdOrSlug: string | number,
  accessToken?: string
): Promise<TraktSeason[]> {
  const client = createApiClient(accessToken);
  const response = await client.get<TraktSeason[]>(
    `/shows/${showIdOrSlug}/seasons`,
    { params: { extended: 'full' } }
  );
  // Filter out specials (season 0) for a cleaner UI
  return response.data.filter((s) => s.number > 0);
}

export async function getSeasonEpisodes(
  showIdOrSlug: string | number,
  season: number,
  accessToken?: string
): Promise<TraktSeasonEpisode[]> {
  const client = createApiClient(accessToken);
  const response = await client.get<TraktSeasonEpisode[]>(
    `/shows/${showIdOrSlug}/seasons/${season}`,
    { params: { extended: 'full' } }
  );
  return response.data;
}

export async function markEpisodeWatched(
  accessToken: string,
  episodeTraktId: number
): Promise<void> {
  const client = createApiClient(accessToken);
  await client.post('/sync/history', {
    episodes: [{ watched_at: new Date().toISOString(), ids: { trakt: episodeTraktId } }],
  });
}

export async function unmarkEpisodeWatched(
  accessToken: string,
  episodeTraktId: number
): Promise<void> {
  const client = createApiClient(accessToken);
  await client.post('/sync/history/remove', {
    episodes: [{ ids: { trakt: episodeTraktId } }],
  });
}

export async function markSeasonWatched(
  accessToken: string,
  showTraktId: number,
  season: number
): Promise<void> {
  const client = createApiClient(accessToken);
  await client.post('/sync/history', {
    shows: [{
      watched_at: new Date().toISOString(),
      ids: { trakt: showTraktId },
      seasons: [{ number: season }],
    }],
  });
}

export async function unmarkSeasonWatched(
  accessToken: string,
  showTraktId: number,
  season: number
): Promise<void> {
  const client = createApiClient(accessToken);
  await client.post('/sync/history/remove', {
    shows: [{
      ids: { trakt: showTraktId },
      seasons: [{ number: season }],
    }],
  });
}

// ─── Recommendations ──────────────────────────────────────────────────────────

export async function getRecommendations(
  accessToken: string,
  limit = 20
): Promise<TraktShowExtended[]> {
  const client = createApiClient(accessToken);
  const response = await client.get<TraktShowExtended[]>('/recommendations/shows', {
    params: { extended: 'full', limit },
  });
  return response.data;
}

// ─── Search ────────────────────────────────────────────────────────────────────

export async function searchShows(
  query: string,
  accessToken?: string,
  page = 1,
  limit = 20
): Promise<TraktSearchResult[]> {
  const client = createApiClient(accessToken);
  const response = await client.get<TraktSearchResult[]>('/search/show', {
    params: { query, extended: 'full', page, limit },
  });
  return response.data;
}

// ─── Images (via TMDB) ────────────────────────────────────────────────────────

export async function getTmdbPoster(
  tmdbId: number | undefined,
  tmdbApiKey: string
): Promise<{ poster: string | null; backdrop: string | null }> {
  if (!tmdbId || !tmdbApiKey) return { poster: null, backdrop: null };
  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/tv/${tmdbId}`,
      { params: { api_key: tmdbApiKey } }
    );
    const data = response.data;
    return {
      poster: data.poster_path
        ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
        : null,
      backdrop: data.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`
        : null,
    };
  } catch {
    return { poster: null, backdrop: null };
  }
}
