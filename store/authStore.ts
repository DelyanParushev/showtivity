import { create } from 'zustand';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { TRAKT_CONFIG } from '../config/trakt';
import {
  exchangeCodeForTokens,
  refreshAccessToken,
  revokeToken,
  getMe,
} from '../services/traktApi';
import {
  saveTokens,
  loadTokens,
  clearTokens,
  isTokenExpired,
} from '../services/storage';
import type { TraktAuthTokens, TraktUser } from '../types/trakt';

WebBrowser.maybeCompleteAuthSession();

interface AuthState {
  tokens: TraktAuthTokens | null;
  user: TraktUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  initialize: () => Promise<void>;
  login: () => Promise<void>;
  handleCallback: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  getValidToken: () => Promise<string | null>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  tokens: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const stored = await loadTokens();
      if (!stored) {
        set({ isLoading: false });
        return;
      }
      let tokens = stored;
      if (isTokenExpired(tokens)) {
        tokens = await refreshAccessToken(tokens.refresh_token);
        await saveTokens(tokens);
      }
      const user = await getMe(tokens.access_token);
      set({ tokens, user, isAuthenticated: true });
    } catch {
      await clearTokens();
    } finally {
      set({ isLoading: false });
    }
  },

  login: async () => {
    const redirectUri =
      Platform.OS === 'web'
        ? TRAKT_CONFIG.REDIRECT_URI_WEB
        : TRAKT_CONFIG.REDIRECT_URI_NATIVE;

    const authUrl =
      `${TRAKT_CONFIG.AUTH_URL}` +
      `?response_type=code` +
      `&client_id=${TRAKT_CONFIG.CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}`;

    if (Platform.OS === 'web') {
      window.location.href = authUrl;
    } else {
      await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
    }
  },

  handleCallback: async (code: string) => {
    set({ isLoading: true });
    try {
      const redirectUri =
        Platform.OS === 'web'
          ? TRAKT_CONFIG.REDIRECT_URI_WEB
          : TRAKT_CONFIG.REDIRECT_URI_NATIVE;
      const tokens = await exchangeCodeForTokens(code, redirectUri);
      await saveTokens(tokens);
      const user = await getMe(tokens.access_token);
      set({ tokens, user, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    const { tokens } = get();
    if (tokens) {
      try {
        await revokeToken(tokens.access_token);
      } catch {}
    }
    await clearTokens();
    set({ tokens: null, user: null, isAuthenticated: false });
  },

  getValidToken: async (): Promise<string | null> => {
    let { tokens } = get();
    if (!tokens) return null;
    if (isTokenExpired(tokens)) {
      try {
        tokens = await refreshAccessToken(tokens.refresh_token);
        await saveTokens(tokens);
        set({ tokens });
      } catch {
        await clearTokens();
        set({ tokens: null, user: null, isAuthenticated: false });
        return null;
      }
    }
    return tokens.access_token;
  },
}));
