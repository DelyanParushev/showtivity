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

// Prevents both openAuthSessionAsync inline handler AND the Linking fallback
// listener from processing the same code simultaneously.
let _processingAuth = false;
let _refreshPromise: Promise<TraktAuthTokens> | null = null;

const getRedirectUri = () =>
  Platform.OS === 'web'
    ? TRAKT_CONFIG.REDIRECT_URI_WEB
    : TRAKT_CONFIG.REDIRECT_URI_NATIVE;

const isRefreshAuthError = (err: any) => {
  const status = err?.response?.status;
  const oauthError = err?.response?.data?.error;
  return (
    status === 400 ||
    status === 401 ||
    oauthError === 'invalid_grant' ||
    oauthError === 'invalid_client' ||
    oauthError === 'invalid_request'
  );
};

const refreshTokens = async (refreshToken: string) => {
  if (!_refreshPromise) {
    _refreshPromise = refreshAccessToken(refreshToken, getRedirectUri()).finally(() => {
      _refreshPromise = null;
    });
  }
  return _refreshPromise;
};

interface AuthState {
  tokens: TraktAuthTokens | null;
  user: TraktUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: () => Promise<void>;
  handleCallback: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  getValidToken: () => Promise<string | null>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  tokens: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  initialize: async () => {
    set({ isLoading: true });
    let stored: TraktAuthTokens | null = null;
    try {
      stored = await loadTokens();
      if (!stored) {
        set({ isLoading: false });
        return;
      }
      let tokens = stored;
      if (isTokenExpired(tokens)) {
        try {
          tokens = await refreshTokens(tokens.refresh_token);
          await saveTokens(tokens);
        } catch (err) {
          if (isRefreshAuthError(err)) {
            await clearTokens();
            set({ tokens: null, user: null, isAuthenticated: false });
            return;
          }
          set({ tokens, user: null, isAuthenticated: true });
          return;
        }
      }
      const user = await getMe(tokens.access_token);
      set({ tokens, user, isAuthenticated: true });
    } catch (err) {
      if (isRefreshAuthError(err)) {
        await clearTokens();
        set({ tokens: null, user: null, isAuthenticated: false });
        return;
      }
      if (stored) {
        set({ tokens: stored, user: null, isAuthenticated: true });
      }
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
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      if (result.type === 'success' && result.url) {
        const Linking = await import('expo-linking');
        const parsed = Linking.parse(result.url);
        const code = parsed.queryParams?.code as string | undefined;
        if (code) {
          await get().handleCallback(code);
        }
      } else if (result.type === 'cancel') {
        // User explicitly cancelled — show nothing, just unblock the button
      }
      // If result.type === 'dismiss', the deep link may have re-opened the app
      // and the Linking listener in login.tsx will handle the code.
    }
  },

  clearError: () => set({ error: null }),

  handleCallback: async (code: string) => {
    if (_processingAuth) return;
    _processingAuth = true;
    set({ isLoading: true, error: null });
    try {
      const redirectUri =
        Platform.OS === 'web'
          ? TRAKT_CONFIG.REDIRECT_URI_WEB
          : TRAKT_CONFIG.REDIRECT_URI_NATIVE;
      const tokens = await exchangeCodeForTokens(code, redirectUri);
      await saveTokens(tokens);
      const user = await getMe(tokens.access_token);
      set({ tokens, user, isAuthenticated: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.error_description ??
        err?.response?.data?.error ??
        err?.message ??
        'Sign-in failed. Please try again.';
      set({ error: String(msg) });
    } finally {
      _processingAuth = false;
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
        tokens = await refreshTokens(tokens.refresh_token);
        await saveTokens(tokens);
        set({ tokens });
      } catch (err) {
        if (isRefreshAuthError(err)) {
          await clearTokens();
          set({ tokens: null, user: null, isAuthenticated: false });
        }
        return null;
      }
    }
    return tokens.access_token;
  },
}));
