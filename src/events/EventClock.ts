import type { EventWeekWindow } from './EventTypes';

const WEEK_MILLISECONDS = 7 * 24 * 60 * 60 * 1000;

export function getUtcWeekWindow(date: Date): EventWeekWindow {
  const timestamp = Number.isFinite(date.getTime()) ? date.getTime() : 0;
  const current = new Date(timestamp);
  const day = current.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  const startsAt = Date.UTC(
    current.getUTCFullYear(),
    current.getUTCMonth(),
    current.getUTCDate() - daysSinceMonday,
  );
  const start = new Date(startsAt);
  const weekKey = [
    start.getUTCFullYear(),
    String(start.getUTCMonth() + 1).padStart(2, '0'),
    String(start.getUTCDate()).padStart(2, '0'),
  ].join('-');
  return { weekKey, startsAt, endsAt: startsAt + WEEK_MILLISECONDS };
}
