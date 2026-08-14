export type GameplayPointerMode = 'mouse' | 'touch' | 'pen';
export type DesktopReachVariant = 'compact' | 'balanced' | 'expansive';
export type DragInteractionPolicyId = 'trace' | 'mouse-assisted';
export type DragTrackingMode = 'trace' | 'directional-assisted';

export interface PointerTuning {
  hitRadiusBonus: number;
  dragToleranceBonus: number;
  dragCompletionThreshold: number;
  earlyInputBuffer: number;
  sparkDistance: number;
  latencyCompensationLimit: number;
}

export interface GameplayInteractionProfile {
  id: GameplayPointerMode;
  usesGameplayCursor: boolean;
  playfield: 'desktop-bounded' | 'safe-viewport';
  dragPolicyId: DragInteractionPolicyId;
  tuning: PointerTuning;
  compactBonusFactor: number;
}
