export const Colors = {
  bg: {
    primary: '#0f0f14',
    secondary: '#161620',
    card: '#1c1c28',
    elevated: '#242432',
  },
  accent: {
    primary: '#e50914',
    secondary: '#b91c1c',
    muted: 'rgba(229,9,20,0.15)',
  },
  text: {
    primary: '#f1f5f9',
    secondary: '#94a3b8',
    muted: '#475569',
  },
  status: {
    watching: '#3b82f6',
    running: '#10b981',
    watchlist: '#8b5cf6',
    waiting: '#f59e0b',
    ended: '#6b7280',
  },
  border: 'rgba(255,255,255,0.08)',
  overlay: 'rgba(0,0,0,0.7)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
};

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
};

export const Typography = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
};

// Category display config
export const CategoryConfig = {
  watching: {
    label: 'Currently Watching',
    color: Colors.status.watching,
    icon: 'play-circle',
    description: 'Shows you are actively watching',
  },
  watchlist: {
    label: 'Saved for Later',
    color: Colors.status.watchlist,
    icon: 'bookmark',
    description: 'Shows you want to watch',
  },
  running: {
    label: 'Running Series',
    color: Colors.status.running,
    icon: 'tv',
    description: 'Airing shows with upcoming episodes',
  },
  waiting: {
    label: 'Awaiting Release',
    color: Colors.status.waiting,
    icon: 'clock',
    description: 'Shows without a confirmed air date',
  },
  ended: {
    label: 'Ended / Cancelled',
    color: Colors.status.ended,
    icon: 'archive',
    description: 'Shows that have concluded',
  },
} as const;
