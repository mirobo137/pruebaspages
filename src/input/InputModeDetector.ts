import type { GameplayPointerMode } from './GameplayInteractionProfile';

export interface PointerEnvironment {
  maxTouchPoints: number;
  coarsePointer: boolean;
  finePointer: boolean;
}

export function normalizePointerMode(pointerType: string): GameplayPointerMode {
  if (pointerType === 'touch' || pointerType === 'pen') return pointerType;
  return 'mouse';
}

export function detectInitialPointerMode(
  environment: PointerEnvironment,
): GameplayPointerMode {
  if (environment.finePointer) return 'mouse';
  if (environment.coarsePointer || environment.maxTouchPoints > 0) return 'touch';
  return 'mouse';
}
