import type { TelemetryRecord, TelemetrySink } from './TelemetryTypes';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface StoredTelemetry {
  version: 1;
  events: TelemetryRecord[];
}

export const TELEMETRY_STORAGE_KEY = 'poki_ignore:superflow:telemetry:v1';
const MAX_EVENTS = 200;

export class LocalTelemetrySink implements TelemetrySink {
  private readonly events: TelemetryRecord[];

  constructor(private readonly storage: StorageLike) {
    this.events = loadEvents(storage);
  }

  track(record: TelemetryRecord): void {
    this.events.push(record);
    if (this.events.length > MAX_EVENTS) {
      this.events.splice(0, this.events.length - MAX_EVENTS);
    }
    this.save();
  }

  snapshot(): readonly TelemetryRecord[] {
    return this.events.map((record) => ({
      at: record.at,
      event: { ...record.event },
    }));
  }

  private save(): void {
    try {
      this.storage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify({
        version: 1,
        events: this.events,
      } satisfies StoredTelemetry));
    } catch {
      // Telemetria nunca debe impedir jugar ni guardar el progreso principal.
    }
  }
}

function loadEvents(storage: StorageLike): TelemetryRecord[] {
  try {
    const raw = storage.getItem(TELEMETRY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<StoredTelemetry>;
    if (parsed.version !== 1 || !Array.isArray(parsed.events)) return [];
    return parsed.events
      .filter(isTelemetryRecord)
      .slice(-MAX_EVENTS);
  } catch {
    return [];
  }
}

function isTelemetryRecord(value: unknown): value is TelemetryRecord {
  return typeof value === 'object'
    && value !== null
    && 'at' in value
    && typeof value.at === 'number'
    && Number.isFinite(value.at)
    && 'event' in value
    && typeof value.event === 'object'
    && value.event !== null
    && 'type' in value.event
    && typeof value.event.type === 'string';
}
