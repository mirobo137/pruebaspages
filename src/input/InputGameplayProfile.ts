import type {
  DesktopReachVariant,
  GameplayInteractionProfile,
  GameplayPointerMode,
} from './GameplayInteractionProfile';
import { normalizePointerMode } from './InputModeDetector';
import { getInteractionProfile } from './InteractionProfileCatalog';
import {
  calculateTargetPlayfield,
  pointInTargetPlayfield,
  type TargetPlayfieldBounds,
} from './PlayfieldLayout';

export type { DesktopReachVariant, GameplayPointerMode } from './GameplayInteractionProfile';
export type { PointerEnvironment } from './InputModeDetector';
export { detectInitialPointerMode, normalizePointerMode } from './InputModeDetector';
export type { TargetPlayfieldBounds } from './PlayfieldLayout';
export { calculateTargetPlayfield, pointInTargetPlayfield } from './PlayfieldLayout';

export class InputGameplayProfile {
  private activeMode: GameplayPointerMode;
  private viewportWidth: number;
  private viewportHeight: number;
  private targetBounds: TargetPlayfieldBounds;
  private lockedPointerId: number | null = null;
  private pendingMode: GameplayPointerMode | null = null;

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

  get interaction(): GameplayInteractionProfile {
    return getInteractionProfile(this.activeMode);
  }

  get bounds(): TargetPlayfieldBounds {
    return this.targetBounds;
  }

  get usesGameplayCursor(): boolean {
    return this.interaction.usesGameplayCursor;
  }

  registerPointer(pointerType: string): boolean {
    const nextMode = normalizePointerMode(pointerType);
    if (this.lockedPointerId !== null && nextMode !== this.activeMode) {
      this.pendingMode = nextMode;
      return false;
    }
    return this.activate(nextMode);
  }

  lockGesture(pointerId: number, pointerType: string): void {
    if (this.lockedPointerId !== null) return;
    this.registerPointer(pointerType);
    this.lockedPointerId = pointerId;
  }

  releaseGesture(pointerId: number): boolean {
    if (this.lockedPointerId !== pointerId) return false;
    this.lockedPointerId = null;
    const pendingMode = this.pendingMode;
    this.pendingMode = null;
    return pendingMode ? this.activate(pendingMode) : false;
  }

  resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.recalculate();
  }

  map(point: { x: number; y: number }): { x: number; y: number } {
    return pointInTargetPlayfield(point, this.targetBounds);
  }

  private activate(nextMode: GameplayPointerMode): boolean {
    if (nextMode === this.activeMode) return false;
    this.activeMode = nextMode;
    this.recalculate();
    return true;
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
