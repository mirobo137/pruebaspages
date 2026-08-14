import type { GameplayPointerMode } from './GameplayInteractionProfile';

export type GameplayInputProfileId = GameplayPointerMode | 'hybrid';

// Increment only when playfield projection, travel budgets or mouse assistance
// changes enough to affect competitive comparability.
export const SPATIAL_MODEL_VERSION = 'spatial-v3-hard-mouse-acquisition';
export const PROGRESSION_SCOPE = 'shared-across-input-profiles' as const;
export const COMPETITIVE_RANKING_POLICY = 'separate-by-profile-and-spatial-version' as const;

export interface CompetitiveResultContext {
  inputProfileId: GameplayInputProfileId;
  spatialModelVersion: string;
}

export function resolveInputProfileId(
  modes: ReadonlySet<GameplayPointerMode>,
  fallback: GameplayPointerMode,
): GameplayInputProfileId {
  if (modes.size <= 1) return modes.values().next().value ?? fallback;
  return 'hybrid';
}

export function areCompetitiveResultsComparable(
  left: CompetitiveResultContext,
  right: CompetitiveResultContext,
): boolean {
  return left.inputProfileId === right.inputProfileId
    && left.spatialModelVersion === right.spatialModelVersion;
}
