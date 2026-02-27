import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { TraktAuthTokens } from '../types/trakt';

const TOKEN_KEY = 'showtivity_trakt_tokens';

// SecureStore is not available on web; fall back to localStorage
const isWeb = Platform.OS === 'web';

export async function saveTokens(tokens: TraktAuthTokens): Promise<void> {
  const value = JSON.stringify(tokens);
  if (isWeb) {
    localStorage.setItem(TOKEN_KEY, value);
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, value);
  }
}

export async function loadTokens(): Promise<TraktAuthTokens | null> {
  try {
    let value: string | null = null;
    if (isWeb) {
      value = localStorage.getItem(TOKEN_KEY);
    } else {
      value = await SecureStore.getItemAsync(TOKEN_KEY);
    }
    if (!value) return null;
    return JSON.parse(value) as TraktAuthTokens;
  } catch {
    return null;
  }
}

export async function clearTokens(): Promise<void> {
  if (isWeb) {
    localStorage.removeItem(TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

export function isTokenExpired(tokens: TraktAuthTokens): boolean {
  const expiresAt = (tokens.created_at + tokens.expires_in) * 1000;
  // Refresh 5 minutes early
  return Date.now() > expiresAt - 5 * 60 * 1000;
}
