import { GAME_CONFIG } from '../game/config';
import type {
  DesktopReachVariant,
  GameplayPointerMode,
} from './GameplayInteractionProfile';
import { getInteractionProfile } from './InteractionProfileCatalog';

export interface TargetPlayfieldBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

export const DESKTOP_PLAYFIELD_SIZES: Record<
  DesktopReachVariant,
  { width: number; height: number }
> = {
  compact: { width: 720, height: 620 },
  balanced: { width: 820, height: 680 },
  expansive: { width: 920, height: 740 },
};

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
  if (getInteractionProfile(mode).playfield === 'safe-viewport') {
    return createBounds(fullLeft, fullRight, top, bottom);
  }
  const availableWidth = Math.max(0, fullRight - fullLeft);
  const availableHeight = Math.max(0, bottom - top);
  const requestedSize = DESKTOP_PLAYFIELD_SIZES[desktopReach];
  const desktopWidth = Math.min(availableWidth, requestedSize.width);
  const desktopHeight = Math.min(availableHeight, requestedSize.height);
  const centerX = viewportWidth * 0.5;
  const centerY = viewportHeight * 0.5;
  const desktopLeft = Math.max(
    fullLeft,
    Math.min(fullRight - desktopWidth, centerX - desktopWidth * 0.5),
  );
  const desktopTop = Math.max(
    top,
    Math.min(bottom - desktopHeight, centerY - desktopHeight * 0.5),
  );
  return createBounds(
    desktopLeft,
    desktopLeft + desktopWidth,
    desktopTop,
    desktopTop + desktopHeight,
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
