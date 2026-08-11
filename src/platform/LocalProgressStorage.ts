import { DIFFICULTIES } from '../game/difficulty/Difficulty';
import type { Difficulty } from '../game/difficulty/Difficulty';
import type {
  PerformanceRecord,
  ProgressState,
  TrackProgress,
} from '../progression/ProgressionTypes';
import { createEmptyProgressState } from '../progression/ProgressionTypes';

interface StorageEnvelope {
  format: 1;
  payload: string;
  checksum: string;
}

interface LegacyProgressState {
  coins?: unknown;
  unlockedTrackIds?: unknown;
}

const STORAGE_KEY = 'superflow:progress:v2';
const BACKUP_KEY = 'superflow:progress:v2:backup';
const LEGACY_KEY = 'rhythm-circles:progression';
const CHECKSUM_CONTEXT = 'superflow-local-progress-2026';
const MAX_SAFE_VALUE = 1_000_000_000;

export class LocalProgressStorage {
  load(): ProgressState {
    const primary = this.readEnvelope(STORAGE_KEY);
    if (primary) return primary;

    const backup = this.readEnvelope(BACKUP_KEY);
    if (backup) {
      this.save(backup);
      return backup;
    }

    const migrated = this.loadLegacyState();
    if (migrated) {
      this.save(migrated);
      return migrated;
    }

    return createEmptyProgressState();
  }

  save(state: ProgressState): void {
    try {
      const sanitized = sanitizeState(state);
      if (!sanitized) return;

      const current = localStorage.getItem(STORAGE_KEY);
      if (current && this.decodeEnvelope(current)) {
        localStorage.setItem(BACKUP_KEY, current);
      }
      localStorage.setItem(STORAGE_KEY, this.encodeEnvelope(sanitized));
    } catch {
      // Private browsing or a full quota must not interrupt the game.
    }
  }

  private readEnvelope(key: string): ProgressState | null {
    try {
      const stored = localStorage.getItem(key);
      return stored ? this.decodeEnvelope(stored) : null;
    } catch {
      return null;
    }
  }

  private encodeEnvelope(state: ProgressState): string {
    const payload = encodeBase64(JSON.stringify(state));
    const envelope: StorageEnvelope = {
      format: 1,
      payload,
      checksum: checksum(payload),
    };
    return JSON.stringify(envelope);
  }

  private decodeEnvelope(stored: string): ProgressState | null {
    try {
      const envelope = JSON.parse(stored) as Partial<StorageEnvelope>;
      if (
        envelope.format !== 1
        || typeof envelope.payload !== 'string'
        || typeof envelope.checksum !== 'string'
        || checksum(envelope.payload) !== envelope.checksum
      ) return null;

      return sanitizeState(JSON.parse(decodeBase64(envelope.payload)));
    } catch {
      return null;
    }
  }

  private loadLegacyState(): ProgressState | null {
    try {
      const rawLegacy = localStorage.getItem(LEGACY_KEY);
      if (!rawLegacy) return null;
      const legacy = JSON.parse(rawLegacy) as LegacyProgressState;
      const state = createEmptyProgressState();
      state.coins = sanitizeInteger(legacy.coins);
      state.unlockedTrackIds = sanitizeTrackIds(legacy.unlockedTrackIds);
      return state;
    } catch {
      return null;
    }
  }
}

function sanitizeState(value: unknown): ProgressState | null {
  if (!isRecord(value) || value.version !== 2) return null;

  const records: Record<string, TrackProgress> = {};
  if (isRecord(value.records)) {
    for (const [trackId, trackValue] of Object.entries(value.records).slice(0, 500)) {
      if (!isSafeTrackId(trackId) || !isRecord(trackValue)) continue;
      const trackProgress: TrackProgress = {};

      for (const difficulty of DIFFICULTIES) {
        const record = sanitizePerformanceRecord(trackValue[difficulty]);
        if (record) trackProgress[difficulty] = record;
      }
      records[trackId] = trackProgress;
    }
  }

  return {
    version: 2,
    coins: sanitizeInteger(value.coins),
    unlockedTrackIds: sanitizeTrackIds(value.unlockedTrackIds),
    records,
    totalRuns: sanitizeInteger(value.totalRuns),
    menuPreferences: sanitizeMenuPreferences(value.menuPreferences),
  };
}

function sanitizeMenuPreferences(value: unknown): ProgressState['menuPreferences'] {
  if (!isRecord(value)) {
    return { selectedTrackId: null, difficulty: 'medium' };
  }

  const selectedTrackId = value.selectedTrackId === null
    ? null
    : isSafeTrackId(value.selectedTrackId)
      ? value.selectedTrackId
      : null;
  const difficulty = DIFFICULTIES.includes(value.difficulty as Difficulty)
    ? value.difficulty as Difficulty
    : 'medium';
  return { selectedTrackId, difficulty };
}

function sanitizePerformanceRecord(value: unknown): PerformanceRecord | null {
  if (!isRecord(value)) return null;

  return {
    stars: clamp(sanitizeInteger(value.stars), 0, 3),
    highScore: sanitizeInteger(value.highScore),
    bestCombo: sanitizeInteger(value.bestCombo),
    bestAccuracy: clamp(sanitizeNumber(value.bestAccuracy), 0, 1),
    bestPerfects: sanitizeInteger(value.bestPerfects),
    fewestMisses: sanitizeInteger(value.fewestMisses),
    attempts: sanitizeInteger(value.attempts),
    completions: sanitizeInteger(value.completions),
    bestFlowActivations: sanitizeInteger(value.bestFlowActivations),
    bestSuperFlowActivations: sanitizeInteger(value.bestSuperFlowActivations),
    lastPlayedAt: sanitizeInteger(value.lastPlayedAt),
  };
}

function sanitizeTrackIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isSafeTrackId))].slice(0, 500);
}

function isSafeTrackId(value: unknown): value is string {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= 100
    && /^[a-z0-9-]+$/.test(value);
}

function sanitizeInteger(value: unknown): number {
  return Math.floor(clamp(sanitizeNumber(value), 0, MAX_SAFE_VALUE));
}

function sanitizeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64(value: string): string {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function checksum(payload: string): string {
  const value = `${CHECKSUM_CONTEXT}:${payload}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
