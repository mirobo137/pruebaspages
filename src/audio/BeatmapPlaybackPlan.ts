import type { Beatmap } from '../content/Beatmap';

export interface BeatmapPlaybackOptions {
  loop: boolean;
  loopDuration?: number;
  playbackDuration?: number;
  startOffset: number;
  clipDuration?: number;
  timelineOffset: number;
}

export function createBeatmapPlaybackOptions(
  beatmap: Beatmap,
  timelineStart: number,
): BeatmapPlaybackOptions {
  const safeStart = Math.max(0, Math.min(timelineStart, beatmap.duration));
  const remaining = Math.max(0.01, beatmap.duration - safeStart);
  if (beatmap.audioMode === 'loop') {
    if (!beatmap.loopDuration || beatmap.loopDuration <= 0) {
      throw new Error('Beatmap loop sin loopDuration valido.');
    }
    return {
      loop: true,
      loopDuration: beatmap.loopDuration,
      playbackDuration: remaining,
      startOffset: safeStart % beatmap.loopDuration,
      timelineOffset: safeStart,
    };
  }
  return {
    loop: false,
    startOffset: safeStart,
    clipDuration: remaining,
    timelineOffset: safeStart,
  };
}
