import type { TelemetryEvent, TelemetrySink } from './TelemetryTypes';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface SessionState {
  version: 1;
  lastVisitDay: string;
}

export const TELEMETRY_SESSION_KEY = 'poki_ignore:superflow:telemetry-session:v1';

export class TelemetryService {
  private readonly onceKeys = new Set<string>();

  constructor(
    private readonly sinks: readonly TelemetrySink[],
    private readonly storage: StorageLike,
    private readonly now: () => number = Date.now,
  ) {}

  startSession(date = new Date(this.now())): void {
    const dayKey = toUtcDayKey(date);
    const previousDay = this.readLastVisitDay();
    this.track({ type: 'session_started', dayKey });
    if (previousDay && previousDay !== dayKey) {
      this.track({
        type: 'daily_return',
        dayKey,
        daysSinceLastVisit: dayDistance(previousDay, dayKey),
      });
    }
    this.writeLastVisitDay(dayKey);
  }

  track(event: TelemetryEvent): void {
    const record = { at: this.now(), event };
    for (const sink of this.sinks) {
      try {
        sink.track(record);
      } catch {
        // Un proveedor de analitica nunca debe alterar el juego.
      }
    }
  }

  trackOnce(key: string, event: TelemetryEvent): void {
    if (this.onceKeys.has(key)) return;
    this.onceKeys.add(key);
    this.track(event);
  }

  private readLastVisitDay(): string | null {
    try {
      const raw = this.storage.getItem(TELEMETRY_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<SessionState>;
      return parsed.version === 1 && typeof parsed.lastVisitDay === 'string'
        ? parsed.lastVisitDay
        : null;
    } catch {
      return null;
    }
  }

  private writeLastVisitDay(dayKey: string): void {
    try {
      this.storage.setItem(TELEMETRY_SESSION_KEY, JSON.stringify({
        version: 1,
        lastVisitDay: dayKey,
      } satisfies SessionState));
    } catch {
      // El almacenamiento puede estar bloqueado o lleno.
    }
  }
}

function toUtcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dayDistance(from: string, to: string): number {
  const fromTime = Date.parse(`${from}T00:00:00.000Z`);
  const toTime = Date.parse(`${to}T00:00:00.000Z`);
  if (!Number.isFinite(fromTime) || !Number.isFinite(toTime)) return 1;
  return Math.max(1, Math.round((toTime - fromTime) / 86_400_000));
}
