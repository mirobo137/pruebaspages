import type { BeatmapPhase } from '../../content/Beatmap';

export function findPhaseIndexAtTime(
  phases: readonly BeatmapPhase[],
  currentTime: number,
): number {
  if (phases.length === 0) return -1;
  const safeTime = Math.max(0, currentTime);
  let low = 0;
  let high = phases.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (phases[middle].endTime <= safeTime) low = middle + 1;
    else high = middle;
  }
  return Math.min(phases.length - 1, low);
}
