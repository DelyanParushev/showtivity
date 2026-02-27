import { differenceInDays, differenceInHours, parseISO } from 'date-fns';

/**
 * Returns days until the given ISO date string.
 * Returns null if no date provided.
 * Returns negative if the date has passed.
 */
export function daysUntil(isoDate: string | null | undefined): number | null {
  if (!isoDate) return null;
  try {
    const target = parseISO(isoDate);
    const now = new Date();
    return differenceInDays(target, now);
  } catch {
    return null;
  }
}

/**
 * Returns a human-friendly countdown string.
 */
export function countdownLabel(isoDate: string | null | undefined): string {
  if (!isoDate) return 'TBA';
  try {
    const target = parseISO(isoDate);
    const now = new Date();
    const days = differenceInDays(target, now);
    const hours = differenceInHours(target, now);

    if (days < 0) return 'Aired';
    if (days === 0) {
      if (hours <= 0) return 'Airing now';
      return `Today in ${hours}h`;
    }
    if (days === 1) return 'Tomorrow';
    if (days < 7) return `In ${days} days`;
    if (days < 14) return 'Next week';
    if (days < 30) return `In ${Math.round(days / 7)} weeks`;
    if (days < 365) return `In ${Math.round(days / 30)} months`;
    return `In ${Math.round(days / 365)} years`;
  } catch {
    return 'TBA';
  }
}

/**
 * Format a date for display.
 */
export function formatAirDate(isoDate: string | null | undefined): string {
  if (!isoDate) return 'TBA';
  try {
    const date = parseISO(isoDate);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'TBA';
  }
}

/**
 * Returns a CSS color class string based on urgency of countdown.
 */
export function countdownColor(days: number | null): string {
  if (days === null) return '#9ca3af'; // gray
  if (days <= 0) return '#10b981'; // green - airing
  if (days <= 3) return '#f59e0b'; // amber - very soon
  if (days <= 7) return '#3b82f6'; // blue - this week
  return '#9ca3af'; // gray - later
}

/**
 * Returns a contextual status label for a show card, combining show status
 * and next air date so users see meaningful text instead of raw countdowns.
 */
export function showStatusLabel(
  status: string | null | undefined,
  nextEpisodeDate: string | null | undefined,
  daysUntilNext: number | null
): string {
  // Only show a countdown for confirmed future/today episodes
  if (nextEpisodeDate && daysUntilNext !== null && daysUntilNext >= 0) {
    if (daysUntilNext === 0) {
      // Less than 24 hours — count down in hours
      try {
        const hours = differenceInHours(parseISO(nextEpisodeDate), new Date());
        if (hours <= 0) return 'Airing now';
        if (hours === 1) return 'In 1h';
        return `In ${hours}h`;
      } catch {
        return 'Airing today';
      }
    }
    const d = daysUntilNext;
    if (d === 1) return 'Tomorrow';
    if (d < 7) return `In ${d} days`;
    if (d < 14) return 'Next week';
    if (d < 60) return `In ${Math.round(d / 7)} weeks`;
    if (d < 365) return `In ${Math.round(d / 30)} months`;
    return `In ${Math.round(d / 365)} years`;
  }
  // Past date or no date — derive label from show status
  const s = (status ?? '').toLowerCase();
  if (s === 'ended') return 'Ended';
  if (s === 'canceled') return 'Canceled';
  if (s === 'returning series' || s === 'continuing') return 'Returning Series';
  if (s === 'in production') return 'In Production';
  if (s === 'planned' || s === 'upcoming' || s === 'pilot') return 'Coming Soon';
  return 'Returning Series';
}

/**
 * Returns an appropriate theme color for a show's status label.
 */
export function showStatusColor(
  status: string | null | undefined,
  daysUntilNext: number | null
): string {
  if (daysUntilNext !== null && daysUntilNext >= 0) return '#10b981'; // green — airing today or future
  const s = (status ?? '').toLowerCase();
  if (s === 'ended' || s === 'canceled') return '#6b7280'; // gray
  return '#f59e0b'; // amber — undated returning / in-production
}
