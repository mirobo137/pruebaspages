import { GAME_CONFIG } from '../game/config';

export type GameplayPointerMode = 'mouse' | 'touch' | 'pen';
export type DesktopReachVariant = 'compact' | 'balanced' | 'expansive';

export interface TargetPlayfieldBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

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

export function calculateTargetPlayfield(
  viewportWidth: number,
  viewportHeight: number,
  mode: GameplayPointerMode,
  desktopReach: DesktopReachVariant = 'balanced',
): TargetPlayfieldBounds {
  const fullLeft = GAME_CONFIG.targetSideMargin;
  const fullRight = Math.max(fullLeft, viewportWidth - GAME_CONFIG.targetSideMargin);
  const top = GAME_CONFIG.targetSpawnTop;
  const bottom = Math.max(
    top + GAME_CONFIG.targetSideMargin,
    viewportHeight - GAME_CONFIG.targetSideMargin,
  );

  if (mode !== 'mouse') {
    return createBounds(fullLeft, fullRight, top, bottom);
  }

  // A mouse pattern should demand precision, not repeated arm-length sweeps on
  // wide monitors. Height provides a stable physical-feeling width across 16:9
  // and ultrawide viewports while small desktop windows still use all room.
  const availableWidth = Math.max(0, fullRight - fullLeft);
  const reach = desktopReach === 'compact'
    ? { heightRatio: 0.88, maximum: 900 }
    : desktopReach === 'expansive'
      ? { heightRatio: 1.2, maximum: 1180 }
      : { heightRatio: 1.05, maximum: 1040 };
  const desktopWidth = Math.min(
    availableWidth,
    Math.max(660, Math.min(reach.maximum, viewportHeight * reach.heightRatio)),
  );
  const centerX = viewportWidth * 0.5;
  return createBounds(
    Math.max(fullLeft, centerX - desktopWidth * 0.5),
    Math.min(fullRight, centerX + desktopWidth * 0.5),
    top,
    bottom,
  );
}

export function pointInTargetPlayfield(
  point: { x: number; y: number },
  bounds: TargetPlayfieldBounds,
): { x: number; y: number } {
  return {
    x: bounds.left + clamp01(point.x) * bounds.width,
    y: bounds.top + clamp01(point.y) * bounds.height,
  };
}

export class InputGameplayProfile {
  private activeMode: GameplayPointerMode;
  private viewportWidth: number;
  private viewportHeight: number;
  private targetBounds: TargetPlayfieldBounds;

  constructor(
    viewportWidth: number,
    viewportHeight: number,
    initialMode: GameplayPointerMode,
    private readonly desktopReach: DesktopReachVariant = 'balanced',
  ) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.activeMode = initialMode;
    this.targetBounds = calculateTargetPlayfield(
      viewportWidth,
      viewportHeight,
      initialMode,
      desktopReach,
    );
  }

  get mode(): GameplayPointerMode {
    return this.activeMode;
  }

  get bounds(): TargetPlayfieldBounds {
    return this.targetBounds;
  }

  get usesGameplayCursor(): boolean {
    return this.activeMode === 'mouse';
  }

  registerPointer(pointerType: string): boolean {
    const nextMode = normalizePointerMode(pointerType);
    if (nextMode === this.activeMode) return false;
    this.activeMode = nextMode;
    this.recalculate();
    return true;
  }

  resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.recalculate();
  }

  map(point: { x: number; y: number }): { x: number; y: number } {
    return pointInTargetPlayfield(point, this.targetBounds);
  }

  private recalculate(): void {
    this.targetBounds = calculateTargetPlayfield(
      this.viewportWidth,
      this.viewportHeight,
      this.activeMode,
      this.desktopReach,
    );
  }
}

export function resolveDesktopReachVariant(search: string): DesktopReachVariant {
  const value = new URLSearchParams(search).get('mouseReach');
  return value === 'compact' || value === 'expansive' ? value : 'balanced';
}

function createBounds(
  left: number,
  right: number,
  top: number,
  bottom: number,
): TargetPlayfieldBounds {
  return {
    left,
    right,
    top,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
