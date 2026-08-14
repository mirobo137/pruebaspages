import type { Difficulty } from '../game/difficulty/Difficulty';
import type { MusicTrack } from './MusicCatalog';
import { adaptBeatmapV1 } from './beatmap/BeatmapV1Adapter';
import type { BeatmapV1Document } from './beatmap/BeatmapV1Adapter';
import { adaptBeatmapV2 } from './beatmap/BeatmapV2Adapter';
import type { BeatmapV2Document } from './beatmap/BeatmapV2Adapter';

export type {
  BeatEvent,
  Beatmap,
  BeatmapAudioMode,
  BeatmapPhase,
  BeatPosition,
} from './beatmap/BeatmapTypes';
export {
  PHASE_ENTRY_SAFE_OFFSET,
  PHASE_TRANSITION_DURATION,
} from './beatmap/BeatmapV1Adapter';

export async function loadBeatmap(
  track: MusicTrack,
  difficulty: Difficulty,
) {
  const beatmapUrl = new URL(track.beatmapPaths[difficulty], document.baseURI);
  const response = await fetch(beatmapUrl);
  if (!response.ok) return null;

  const documentData = await response.json() as BeatmapV1Document | BeatmapV2Document;
  const beatmap = documentData.schemaVersion === 2
    ? adaptBeatmapV2(documentData)
    : adaptBeatmapV1(documentData);
  if (beatmap.trackId !== track.id || beatmap.difficulty !== difficulty) {
    throw new Error(`Beatmap no corresponde a ${track.id}/${difficulty}.`);
  }
  return beatmap;
}
