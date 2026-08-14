import type { Difficulty } from '../game/difficulty/Difficulty';
import type { TargetPoint } from '../game/targets/TargetNode';
import type { GameplayPointerMode } from './GameplayInteractionProfile';
import type { TargetPlayfieldBounds } from './PlayfieldLayout';

export interface TravelBudgetProfile {
  maximumHeadSpeed: number;
  maximumHeadDistance: number;
  maximumTurnRadians: number;
  maximumDragLength: number;
  comfortableDragSpeed: number;
  postDragRestSeconds: number;
}

interface TravelAnchor {
  point: TargetPoint;
  readyTime: number;
  direction: TargetPoint | null;
}

const MOUSE_BUDGETS: Record<Difficulty, TravelBudgetProfile> = {
  easy: {
    maximumHeadSpeed: 900,
    maximumHeadDistance: 340,
    maximumTurnRadians: Math.PI * 2 / 3,
    maximumDragLength: 340,
    comfortableDragSpeed: 620,
    postDragRestSeconds: 0.16,
  },
  medium: {
    maximumHeadSpeed: 1_000,
    maximumHeadDistance: 380,
    maximumTurnRadians: Math.PI * 3 / 4,
    maximumDragLength: 360,
    comfortableDragSpeed: 680,
    postDragRestSeconds: 0.13,
  },
  hard: {
    maximumHeadSpeed: 1_100,
    maximumHeadDistance: 420,
    maximumTurnRadians: Math.PI * 5 / 6,
    maximumDragLength: 380,
    comfortableDragSpeed: 740,
    postDragRestSeconds: 0.1,
  },
};

export class TravelBudget {
  private anchor: TravelAnchor | null = null;

  constructor(private readonly difficulty: Difficulty) {}

  get profile(): TravelBudgetProfile {
    return MOUSE_BUDGETS[this.difficulty];
  }

  get expectedPointerAnchor(): { x: number; y: number; time: number } | null {
    return this.anchor
      ? { x: this.anchor.point.x, y: this.anchor.point.y, time: this.anchor.readyTime }
      : null;
  }

  projectHead(
    desired: TargetPoint,
    eventTime: number,
    bounds: TargetPlayfieldBounds,
    mode: GameplayPointerMode,
  ): TargetPoint {
    const clampedDesired = clampPoint(desired, bounds);
    if (mode !== 'mouse' || !this.anchor) return clampedDesired;

    const delta = subtract(clampedDesired, this.anchor.point);
    const requestedDistance = magnitude(delta);
    if (requestedDistance <= 0.001) return { ...this.anchor.point };

    const availableSeconds = Math.max(0, eventTime - this.anchor.readyTime);
    const maximumDistance = Math.min(
      this.profile.maximumHeadDistance,
      this.profile.maximumHeadSpeed * availableSeconds,
    );
    const requestedDirection = scale(delta, 1 / requestedDistance);
    const direction = this.anchor.direction
      ? limitDirectionTurn(
          this.anchor.direction,
          requestedDirection,
          this.profile.maximumTurnRadians,
        )
      : requestedDirection;
    const boundaryDistance = distanceToBoundary(this.anchor.point, direction, bounds);
    return add(
      this.anchor.point,
      scale(direction, Math.min(requestedDistance, maximumDistance, boundaryDistance)),
    );
  }

  projectDragEnd(
    start: TargetPoint,
    desiredEnd: TargetPoint,
    bounds: TargetPlayfieldBounds,
    mode: GameplayPointerMode,
  ): TargetPoint {
    const clampedEnd = clampPoint(desiredEnd, bounds);
    if (mode !== 'mouse') return clampedEnd;
    const delta = subtract(clampedEnd, start);
    const distance = magnitude(delta);
    if (distance <= this.profile.maximumDragLength || distance <= 0.001) {
      return clampedEnd;
    }
    return clampPoint(
      add(start, scale(delta, this.profile.maximumDragLength / distance)),
      bounds,
    );
  }

  limitDragAnchors(
    relativeAnchors: TargetPoint[],
    mode: GameplayPointerMode,
  ): TargetPoint[] {
    if (mode !== 'mouse' || relativeAnchors.length === 0) return relativeAnchors;
    let polygonLength = 0;
    let previous = { x: 0, y: 0 };
    for (const anchor of relativeAnchors) {
      polygonLength += magnitude(subtract(anchor, previous));
      previous = anchor;
    }
    if (polygonLength <= this.profile.maximumDragLength || polygonLength <= 0.001) {
      return relativeAnchors;
    }
    const ratio = this.profile.maximumDragLength / polygonLength;
    return relativeAnchors.map((anchor) => scale(anchor, ratio));
  }

  commit(
    eventTime: number,
    start: TargetPoint,
    mode: GameplayPointerMode,
    drag?: {
      end: TargetPoint;
      length: number;
      completionTimeSeconds: number;
    },
  ): void {
    const previousPoint = this.anchor?.point ?? null;
    const point = drag?.end ?? start;
    const movement = drag
      ? subtract(drag.end, start)
      : previousPoint
        ? subtract(start, previousPoint)
        : null;
    const direction = movement && magnitude(movement) > 0.001
      ? scale(movement, 1 / magnitude(movement))
      : this.anchor?.direction ?? null;
    const dragDuration = drag && mode === 'mouse'
      ? Math.min(
          drag.completionTimeSeconds,
          drag.length / this.profile.comfortableDragSpeed,
        )
      : 0;
    this.anchor = {
      point: { ...point },
      readyTime: eventTime + dragDuration
        + (drag && mode === 'mouse' ? this.profile.postDragRestSeconds : 0),
      direction,
    };
  }

  reset(): void {
    this.anchor = null;
  }
}

export function deterministicNormalizedPoint(
  eventTime: number,
  phaseIndex: number,
  salt = 0,
): TargetPoint {
  return {
    x: deterministicUnit(eventTime * 17 + phaseIndex * 31 + salt * 13),
    y: deterministicUnit(eventTime * 29 + phaseIndex * 19 + salt * 37),
  };
}

function deterministicUnit(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43_758.5453;
  return value - Math.floor(value);
}

function limitDirectionTurn(
  previous: TargetPoint,
  requested: TargetPoint,
  maximumTurn: number,
): TargetPoint {
  const previousAngle = Math.atan2(previous.y, previous.x);
  const requestedAngle = Math.atan2(requested.y, requested.x);
  const difference = normalizeAngle(requestedAngle - previousAngle);
  const angle = previousAngle + Math.max(-maximumTurn, Math.min(maximumTurn, difference));
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

function normalizeAngle(angle: number): number {
  let normalized = angle;
  while (normalized > Math.PI) normalized -= Math.PI * 2;
  while (normalized < -Math.PI) normalized += Math.PI * 2;
  return normalized;
}

function clampPoint(point: TargetPoint, bounds: TargetPlayfieldBounds): TargetPoint {
  return {
    x: Math.max(bounds.left, Math.min(bounds.right, point.x)),
    y: Math.max(bounds.top, Math.min(bounds.bottom, point.y)),
  };
}

function distanceToBoundary(
  point: TargetPoint,
  direction: TargetPoint,
  bounds: TargetPlayfieldBounds,
): number {
  const distances: number[] = [];
  if (direction.x > 0.0001) distances.push((bounds.right - point.x) / direction.x);
  if (direction.x < -0.0001) distances.push((bounds.left - point.x) / direction.x);
  if (direction.y > 0.0001) distances.push((bounds.bottom - point.y) / direction.y);
  if (direction.y < -0.0001) distances.push((bounds.top - point.y) / direction.y);
  const forward = distances.filter((distance) => distance >= 0);
  return forward.length > 0 ? Math.min(...forward) : 0;
}

function add(left: TargetPoint, right: TargetPoint): TargetPoint {
  return { x: left.x + right.x, y: left.y + right.y };
}

function subtract(left: TargetPoint, right: TargetPoint): TargetPoint {
  return { x: left.x - right.x, y: left.y - right.y };
}

function scale(point: TargetPoint, factor: number): TargetPoint {
  return { x: point.x * factor, y: point.y * factor };
}

function magnitude(point: TargetPoint): number {
  return Math.hypot(point.x, point.y);
}
