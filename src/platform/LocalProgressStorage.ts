import { DIFFICULTIES } from '../game/difficulty/Difficulty';
import type { Difficulty } from '../game/difficulty/Difficulty';
import type {
  PerformanceRecord,
  ProgressState,
  TrackProgress,
} from '../progression/ProgressionTypes';
import { createEmptyProgressState } from '../progression/ProgressionTypes';
import {
  THEME_COMPONENT_SLOTS,
  type ThemeComponentSlot,
} from '../customization/ThemeComponents';

interface StorageEnvelope {
  format: 1;
  payload: string;
  checksum: string;
}

interface ProgressStateV2 {
  version: 2;
  coins: number;
  unlockedTrackIds: string[];
  records: Record<string, TrackProgress>;
  totalRuns: number;
  menuPreferences: ProgressState['menuPreferences'];
}

interface LegacyProgressState {
  coins?: unknown;
  unlockedTrackIds?: unknown;
}

interface ThemeSelectionV1 {
  version?: unknown;
  themeId?: unknown;
}

export type ProgressStorageAdapter = Pick<Storage, 'getItem' | 'setItem'>;

const STORAGE_KEY = 'superflow:progress:v3';
const BACKUP_KEY = 'superflow:progress:v3:backup';
const V2_STORAGE_KEY = 'superflow:progress:v2';
const V2_BACKUP_KEY = 'superflow:progress:v2:backup';
const LEGACY_KEY = 'rhythm-circles:progression';
const THEME_V1_KEY = 'superflow:visual-theme:v1';
const V3_CHECKSUM_CONTEXT = 'superflow-local-progress-v3-2026';
const V2_CHECKSUM_CONTEXT = 'superflow-local-progress-2026';
const MAX_SAFE_VALUE = 1_000_000_000;

function getBrowserStorage(): ProgressStorageAdapter | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export class LocalProgressStorage {
  constructor(private readonly storage: ProgressStorageAdapter | null = getBrowserStorage()) {}

  load(): ProgressState {
    const primary = this.readV3Envelope(STORAGE_KEY);
    if (primary) return primary;

    const backup = this.readV3Envelope(BACKUP_KEY);
    if (backup) {
      this.save(backup);
      return backup;
    }

    const v2 = this.readV2Envelope(V2_STORAGE_KEY)
      ?? this.readV2Envelope(V2_BACKUP_KEY);
    if (v2) {
      const migrated = this.migrateV2(v2);
      this.save(migrated);
      return migrated;
    }

    const legacy = this.loadLegacyState();
    if (legacy) {
      this.save(legacy);
      return legacy;
    }

    return createEmptyProgressState();
  }

  save(state: ProgressState): void {
    try {
      if (!this.storage) return;
      const sanitized = sanitizeV3State(state);
      if (!sanitized) return;

      const current = this.storage.getItem(STORAGE_KEY);
      if (current && this.decodeV3Envelope(current)) {
        this.storage.setItem(BACKUP_KEY, current);
      }
      this.storage.setItem(STORAGE_KEY, this.encodeEnvelope(
        sanitized,
        V3_CHECKSUM_CONTEXT,
      ));
    } catch {
      // El modo privado o una cuota llena no deben interrumpir el juego.
    }
  }

  private readV3Envelope(key: string): ProgressState | null {
    try {
      const stored = this.storage?.getItem(key);
      return stored ? this.decodeV3Envelope(stored) : null;
    } catch {
      return null;
    }
  }

  private readV2Envelope(key: string): ProgressStateV2 | null {
    try {
      const stored = this.storage?.getItem(key);
      return stored ? this.decodeV2Envelope(stored) : null;
    } catch {
      return null;
    }
  }

  private encodeEnvelope(state: ProgressState, context: string): string {
    const payload = encodeBase64(JSON.stringify(state));
    const envelope: StorageEnvelope = {
      format: 1,
      payload,
      checksum: checksum(payload, context),
    };
    return JSON.stringify(envelope);
  }

  private decodeV3Envelope(stored: string): ProgressState | null {
    const payload = decodeEnvelopePayload(stored, V3_CHECKSUM_CONTEXT);
    return payload === null ? null : sanitizeV3State(payload);
  }

  private decodeV2Envelope(stored: string): ProgressStateV2 | null {
    const payload = decodeEnvelopePayload(stored, V2_CHECKSUM_CONTEXT);
    return payload === null ? null : sanitizeV2State(payload);
  }

  private migrateV2(source: ProgressStateV2): ProgressState {
    const migrated = createEmptyProgressState();
    migrated.coins = source.coins;
    migrated.unlockedTrackIds = [...source.unlockedTrackIds];
    migrated.records = source.records;
    migrated.totalRuns = source.totalRuns;
    migrated.menuPreferences = source.menuPreferences;

    const provisionalThemeId = this.loadProvisionalThemeId();
    if (provisionalThemeId) {
      migrated.customization.equippedThemeId = provisionalThemeId;
      migrated.customization.unlockedThemeIds = uniqueIdentifiers([
        ...migrated.customization.unlockedThemeIds,
        provisionalThemeId,
      ]);
    }
    return migrated;
  }

  private loadProvisionalThemeId(): string | null {
    try {
      const raw = this.storage?.getItem(THEME_V1_KEY);
      if (!raw) return null;
      const candidate = JSON.parse(raw) as ThemeSelectionV1;
      return candidate.version === 1 && isSafeIdentifier(candidate.themeId)
        ? candidate.themeId
        : null;
    } catch {
      return null;
    }
  }

  private loadLegacyState(): ProgressState | null {
    try {
      const rawLegacy = this.storage?.getItem(LEGACY_KEY);
      if (!rawLegacy) return null;
      const legacy = JSON.parse(rawLegacy) as LegacyProgressState;
      const state = createEmptyProgressState();
      state.coins = sanitizeInteger(legacy.coins);
      state.unlockedTrackIds = sanitizeIdentifiers(legacy.unlockedTrackIds, 500);
      return state;
    } catch {
      return null;
    }
  }
}

function decodeEnvelopePayload(stored: string, context: string): unknown | null {
  try {
    const envelope = JSON.parse(stored) as Partial<StorageEnvelope>;
    if (
      envelope.format !== 1
      || typeof envelope.payload !== 'string'
      || typeof envelope.checksum !== 'string'
      || checksum(envelope.payload, context) !== envelope.checksum
    ) return null;
    return JSON.parse(decodeBase64(envelope.payload));
  } catch {
    return null;
  }
}

function sanitizeV3State(value: unknown): ProgressState | null {
  if (!isRecord(value) || value.version !== 3) return null;
  const empty = createEmptyProgressState();
  return {
    version: 3,
    coins: sanitizeInteger(value.coins),
    unlockedTrackIds: sanitizeIdentifiers(value.unlockedTrackIds, 500),
    records: sanitizeRecords(value.records),
    totalRuns: sanitizeInteger(value.totalRuns),
    menuPreferences: sanitizeMenuPreferences(value.menuPreferences),
    customization: sanitizeCustomization(value.customization, empty.customization),
    weeklyEvent: sanitizeWeeklyEvent(value.weeklyEvent),
    rewardedLimits: sanitizeRewardedLimits(value.rewardedLimits),
  };
}

function sanitizeV2State(value: unknown): ProgressStateV2 | null {
  if (!isRecord(value) || value.version !== 2) return null;
  return {
    version: 2,
    coins: sanitizeInteger(value.coins),
    unlockedTrackIds: sanitizeIdentifiers(value.unlockedTrackIds, 500),
    records: sanitizeRecords(value.records),
    totalRuns: sanitizeInteger(value.totalRuns),
    menuPreferences: sanitizeMenuPreferences(value.menuPreferences),
  };
}

function sanitizeRecords(value: unknown): Record<string, TrackProgress> {
  const records: Record<string, TrackProgress> = {};
  if (!isRecord(value)) return records;
  for (const [trackId, trackValue] of Object.entries(value).slice(0, 500)) {
    if (!isSafeIdentifier(trackId) || !isRecord(trackValue)) continue;
    const trackProgress: TrackProgress = {};
    for (const difficulty of DIFFICULTIES) {
      const record = sanitizePerformanceRecord(trackValue[difficulty]);
      if (record) trackProgress[difficulty] = record;
    }
    records[trackId] = trackProgress;
  }
  return records;
}

function sanitizeCustomization(
  value: unknown,
  fallback: ProgressState['customization'],
): ProgressState['customization'] {
  if (!isRecord(value)) return {
    ...fallback,
    unlockedThemeIds: [...fallback.unlockedThemeIds],
    unlockedCosmeticIds: [...fallback.unlockedCosmeticIds],
  };
  const unlockedThemeIds = sanitizeIdentifiers(value.unlockedThemeIds, 200);
  const unlockedCosmeticIds = sanitizeIdentifiers(value.unlockedCosmeticIds, 500);
  const equippedThemeId = isSafeIdentifier(value.equippedThemeId)
    ? value.equippedThemeId
    : fallback.equippedThemeId;
  const customThemeValue = isRecord(value.customTheme) ? value.customTheme : null;
  const componentValue = customThemeValue && isRecord(customThemeValue.componentThemeIds)
    ? customThemeValue.componentThemeIds
    : {};
  const componentThemeIds = Object.fromEntries(THEME_COMPONENT_SLOTS.map((slot) => [
    slot,
    isSafeIdentifier(componentValue[slot])
      ? componentValue[slot]
      : fallback.customTheme.componentThemeIds[slot],
  ])) as Record<ThemeComponentSlot, string>;
  return {
    unlockedThemeIds,
    unlockedCosmeticIds,
    equippedThemeId,
    customTheme: { slotId: 'custom-1', componentThemeIds },
  };
}

function sanitizeWeeklyEvent(value: unknown): ProgressState['weeklyEvent'] {
  const missionProgress: Record<string, number> = {};
  if (isRecord(value) && isRecord(value.missionProgress)) {
    for (const [missionId, progress] of Object.entries(value.missionProgress).slice(0, 100)) {
      if (isSafeIdentifier(missionId)) missionProgress[missionId] = sanitizeInteger(progress);
    }
  }
  return {
    eventId: isRecord(value) ? sanitizeNullableIdentifier(value.eventId) : null,
    weekKey: isRecord(value) ? sanitizeNullableIdentifier(value.weekKey) : null,
    points: isRecord(value) ? sanitizeInteger(value.points) : 0,
    claimedRewardIds: isRecord(value)
      ? sanitizeIdentifiers(value.claimedRewardIds, 100)
      : [],
    missionProgress,
  };
}

function sanitizeRewardedLimits(value: unknown): ProgressState['rewardedLimits'] {
  return {
    dayKey: isRecord(value) ? sanitizeNullableIdentifier(value.dayKey) : null,
    usedRewardIds: isRecord(value)
      ? sanitizeIdentifiers(value.usedRewardIds, 50)
      : [],
    claimedOpportunityIds: isRecord(value)
      ? sanitizeIdentifiers(value.claimedOpportunityIds, 250)
      : [],
  };
}

function sanitizeMenuPreferences(value: unknown): ProgressState['menuPreferences'] {
  if (!isRecord(value)) return { selectedTrackId: null, difficulty: 'medium' };
  const selectedTrackId = value.selectedTrackId === null
    ? null
    : isSafeIdentifier(value.selectedTrackId)
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

function sanitizeIdentifiers(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return uniqueIdentifiers(value.filter(isSafeIdentifier)).slice(0, limit);
}

function uniqueIdentifiers(value: readonly string[]): string[] {
  return [...new Set(value)];
}

function sanitizeNullableIdentifier(value: unknown): string | null {
  return value === null || value === undefined
    ? null
    : isSafeIdentifier(value)
      ? value
      : null;
}

function isSafeIdentifier(value: unknown): value is string {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= 100
    && /^[a-zA-Z0-9:_-]+$/.test(value);
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

function checksum(payload: string, context: string): string {
  const value = `${context}:${payload}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
