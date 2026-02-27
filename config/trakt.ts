// Trakt.tv API Configuration
// To use this app:
// 1. Go to https://trakt.tv/oauth/applications/new
// 2. Create a new application
// 3. Set Redirect URI to: showtivity://auth/callback (for native)
//    and https://your-app.vercel.app/auth/callback (for web/Vercel)
//    and http://localhost:8081/auth/callback (for local dev)
// 4. Copy your Client ID and Client Secret below

const appUrl = process.env.EXPO_PUBLIC_APP_URL ?? 'http://localhost:8081';

export const TRAKT_CONFIG = {
  CLIENT_ID: process.env.EXPO_PUBLIC_TRAKT_CLIENT_ID ?? 'YOUR_TRAKT_CLIENT_ID',
  CLIENT_SECRET: process.env.EXPO_PUBLIC_TRAKT_CLIENT_SECRET ?? 'YOUR_TRAKT_CLIENT_SECRET',
  REDIRECT_URI_NATIVE: 'showtivity://auth/callback',
  REDIRECT_URI_WEB: `${appUrl}/auth/callback`,
  BASE_URL: 'https://api.trakt.tv',
  AUTH_URL: 'https://trakt.tv/oauth/authorize',
  TOKEN_URL: 'https://api.trakt.tv/oauth/token',
  DEVICE_CODE_URL: 'https://api.trakt.tv/oauth/device/code',
  API_VERSION: '2',
};

export const TMDB_CONFIG = {
  // Optional: for show poster images. Get a free key at https://www.themoviedb.org/settings/api
  API_KEY: process.env.EXPO_PUBLIC_TMDB_API_KEY ?? '',
  IMAGE_BASE_URL: 'https://image.tmdb.org/t/p/w500',
  BACKDROP_BASE_URL: 'https://image.tmdb.org/t/p/w1280',
};

export const FANART_CONFIG = {
  // Optional: for show artwork. Get a free key at https://fanart.tv/get-an-api-key/
  API_KEY: process.env.EXPO_PUBLIC_FANART_API_KEY ?? '',
  BASE_URL: 'https://webservice.fanart.tv/v3',
};
