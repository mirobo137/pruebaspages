import type { TargetPoint } from './TargetNode';

export interface PathProjection {
  progress: number;
  distance: number;
}

const SAMPLE_COUNT = 36;

export class DragPath {
  readonly points: TargetPoint[] = [];
  private readonly cumulativeDistances: number[] = [];
  readonly length: number;

  constructor(anchors: TargetPoint[]) {
    const safeAnchors = anchors.length >= 2
      ? anchors.slice(0, 4)
      : [{ x: 0, y: 0 }, anchors[0] ?? { x: 0, y: 0 }];

    for (let sample = 0; sample <= SAMPLE_COUNT; sample += 1) {
      this.points.push(sampleCurve(safeAnchors, sample / SAMPLE_COUNT));
    }

    this.cumulativeDistances.push(0);
    let total = 0;
    for (let index = 1; index < this.points.length; index += 1) {
      total += distance(this.points[index - 1], this.points[index]);
      this.cumulativeDistances.push(total);
    }
    this.length = Math.max(1, total);
  }

  pointAt(progress: number): TargetPoint {
    const targetDistance = clamp01(progress) * this.length;
    for (let index = 1; index < this.cumulativeDistances.length; index += 1) {
      if (this.cumulativeDistances[index] < targetDistance) continue;
      const segmentStart = this.cumulativeDistances[index - 1];
      const segmentLength = Math.max(0.0001, this.cumulativeDistances[index] - segmentStart);
      const localProgress = (targetDistance - segmentStart) / segmentLength;
      return lerpPoint(this.points[index - 1], this.points[index], localProgress);
    }
    return { ...this.points[this.points.length - 1] };
  }

  tangentAt(progress: number): TargetPoint {
    const before = this.pointAt(Math.max(0, progress - 0.015));
    const after = this.pointAt(Math.min(1, progress + 0.015));
    return { x: after.x - before.x, y: after.y - before.y };
  }

  project(point: TargetPoint): PathProjection {
    let nearestDistance = Number.POSITIVE_INFINITY;
    let nearestProgress = 0;

    for (let index = 1; index < this.points.length; index += 1) {
      const start = this.points[index - 1];
      const end = this.points[index];
      const segment = projectOnSegment(point, start, end);
      if (segment.distance >= nearestDistance) continue;
      nearestDistance = segment.distance;
      const distanceAlongPath = this.cumulativeDistances[index - 1]
        + distance(start, end) * segment.progress;
      nearestProgress = distanceAlongPath / this.length;
    }

    return { progress: nearestProgress, distance: nearestDistance };
  }
}

export function distanceToSegment(
  point: TargetPoint,
  start: TargetPoint,
  end: TargetPoint,
): number {
  return projectOnSegment(point, start, end).distance;
}

function sampleCurve(anchors: TargetPoint[], progress: number): TargetPoint {
  if (anchors.length === 2) return lerpPoint(anchors[0], anchors[1], progress);
  if (anchors.length === 3) {
    const inverse = 1 - progress;
    return {
      x: inverse * inverse * anchors[0].x
        + 2 * inverse * progress * anchors[1].x
        + progress * progress * anchors[2].x,
      y: inverse * inverse * anchors[0].y
        + 2 * inverse * progress * anchors[1].y
        + progress * progress * anchors[2].y,
    };
  }

  const inverse = 1 - progress;
  return {
    x: inverse ** 3 * anchors[0].x
      + 3 * inverse * inverse * progress * anchors[1].x
      + 3 * inverse * progress * progress * anchors[2].x
      + progress ** 3 * anchors[3].x,
    y: inverse ** 3 * anchors[0].y
      + 3 * inverse * inverse * progress * anchors[1].y
      + 3 * inverse * progress * progress * anchors[2].y
      + progress ** 3 * anchors[3].y,
  };
}

function projectOnSegment(
  point: TargetPoint,
  start: TargetPoint,
  end: TargetPoint,
): PathProjection {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  if (lengthSquared <= 0.0001) {
    return { progress: 0, distance: distance(point, start) };
  }
  const progress = clamp01(
    ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) / lengthSquared,
  );
  const nearest = {
    x: start.x + deltaX * progress,
    y: start.y + deltaY * progress,
  };
  return { progress, distance: distance(point, nearest) };
}

function lerpPoint(start: TargetPoint, end: TargetPoint, progress: number): TargetPoint {
  return {
    x: start.x + (end.x - start.x) * progress,
    y: start.y + (end.y - start.y) * progress,
  };
}

function distance(left: TargetPoint, right: TargetPoint): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
