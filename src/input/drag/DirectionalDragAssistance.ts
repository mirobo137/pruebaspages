export interface DirectionalDragSample {
  currentProgress: number;
  projectedProgress: number;
  distanceFromPath: number;
  corridor: number;
  movementDistance: number;
  directionAlignment: number;
  pathLength: number;
}

export interface DirectionalDragResult {
  valid: boolean;
  progress: number;
}

const CORRIDOR_FACTOR = 1.45;
const PROGRESS_PER_POINTER_PIXEL = 1.35;
const MINIMUM_DIRECTION_ALIGNMENT = -0.12;

export function resolveDirectionalDragProgress(
  sample: DirectionalDragSample,
): DirectionalDragResult {
  const valid = sample.movementDistance > 0.001
    && sample.distanceFromPath <= sample.corridor * CORRIDOR_FACTOR
    && sample.projectedProgress >= sample.currentProgress - 0.16
    && sample.directionAlignment >= MINIMUM_DIRECTION_ALIGNMENT;
  if (!valid) return { valid: false, progress: sample.currentProgress };

  const maximumAdvance = sample.movementDistance
    / Math.max(1, sample.pathLength)
    * PROGRESS_PER_POINTER_PIXEL;
  return {
    valid: true,
    progress: Math.max(
      sample.currentProgress,
      Math.min(
        sample.projectedProgress,
        sample.currentProgress + maximumAdvance,
      ),
    ),
  };
}
