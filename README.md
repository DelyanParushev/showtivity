# 🎬 Showtivity

A cross-platform (Web, iOS, Android) TV show tracker powered by your [Trakt.tv](https://trakt.tv) account.

## Features

- **Currently Watching** — Shows you've started but haven't finished
- **Watchlist (Saved for Later)** — Shows you've bookmarked
- **Running Series** — Airing shows with live countdown to the next episode
- **Awaiting Release** — Shows in production or announced without an air date
- **Ended / Cancelled** — Concluded series
- **Search** — Discover any show and add it to your Trakt watchlist with one tap
- **Trakt Sync** — All changes sync directly with your Trakt account

---

## Getting Started

### 1. Prerequisites

- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- A [Trakt.tv account](https://trakt.tv/join) (free)

### 2. Create a Trakt OAuth Application

1. Go to [https://trakt.tv/oauth/applications/new](https://trakt.tv/oauth/applications/new)
2. Fill in the form:
   - **Name:** Showtivity
   - **Redirect URI:**
     - `showtivity://auth/callback` (native — iOS/Android)
     - `http://localhost:8081/auth/callback` (web)
3. Copy your **Client ID** and **Client Secret**

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
EXPO_PUBLIC_TRAKT_CLIENT_ID=your_client_id
EXPO_PUBLIC_TRAKT_CLIENT_SECRET=your_client_secret

# Optional: enables show posters and backdrops
# Get free key at https://www.themoviedb.org/settings/api
EXPO_PUBLIC_TMDB_API_KEY=your_tmdb_key
```

### 4. Install & Run

```bash
npm install

# Web
npm run web

# Android (requires Android Studio or physical device)
npm run android

# iOS (requires macOS + Xcode)
npm run ios
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | [Expo](https://expo.dev) + [React Native](https://reactnative.dev) |
| Routing | [Expo Router v3](https://expo.github.io/router) |
| Auth | OAuth 2.0 via `expo-auth-session` + `expo-web-browser` |
| Data Fetching | [TanStack Query v5](https://tanstack.com/query) |
| State | [Zustand](https://github.com/pmndrs/zustand) |
| Token Storage | `expo-secure-store` (native) / `localStorage` (web) |
| API | [Trakt.tv API v2](https://trakt.docs.apiary.io) |
| Images | [TMDB API](https://www.themoviedb.org) (optional) |
| Styling | StyleSheet + [NativeWind](https://www.nativewind.dev) |

---

## Project Structure

```
showtivity/
├── app/
│   ├── _layout.tsx          # Root layout, auth guard, QueryClient
│   ├── (auth)/
│   │   └── login.tsx        # Trakt OAuth login screen
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Tab navigator
│   │   ├── index.tsx        # Home — all show categories
│   │   ├── running.tsx      # Airing schedule with countdowns
│   │   ├── search.tsx       # Show search + add to watchlist
│   │   └── profile.tsx      # User profile + stats
│   └── show/[id].tsx        # Show detail screen
├── components/
│   ├── ShowCard.tsx          # Grid and compact show cards
│   ├── RunningShowCard.tsx   # Countdown-focused card for airing shows
│   └── UI.tsx               # Reusable UI: section headers, empty states
├── config/
│   └── trakt.ts             # API endpoints and configuration
├── constants/
│   └── theme.ts             # Colors, spacing, typography, category config
├── hooks/
│   └── useShows.ts          # React Query hooks for all show data
├── services/
│   ├── traktApi.ts          # Trakt API client (all endpoints)
│   └── storage.ts           # Secure token storage
├── store/
│   └── authStore.ts         # Zustand auth state + OAuth flow
├── types/
│   └── trakt.ts             # Full Trakt API TypeScript types
└── utils/
    └── dateUtils.ts         # Countdown, date formatting helpers
```

---

## Trakt API Endpoints Used

| Feature | Endpoint |
|---|---|
| Auth | `POST /oauth/token` |
| User info | `GET /users/me` |
| Watchlist | `GET /users/me/watchlist/shows` |
| Watched shows | `GET /users/me/watched/shows` |
| Watch progress | `GET /shows/:id/progress/watched` |
| Next episode | `GET /shows/:id/next_episode` |
| Search | `GET /search/show?query=...` |
| Add to watchlist | `POST /sync/watchlist` |
| Remove from watchlist | `POST /sync/watchlist/remove` |

---

## License

MIT
