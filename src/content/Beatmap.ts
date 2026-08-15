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
  const previewVersion = import.meta.env.DEV
    ? new URLSearchParams(window.location.search).get('beatmapPreview')
    : null;
  const beatmapPath = previewVersion === 'm4'
    ? `./assets/beatmap-previews/m4/${track.id}/${difficulty}.json`
    : track.beatmapPaths[difficulty];
  let documentData = await fetchBeatmapDocument(beatmapPath);
  if (!documentData && previewVersion === 'm4') {
    documentData = await fetchBeatmapDocument(track.beatmapPaths[difficulty]);
  }
  if (!documentData) return null;
  const beatmap = documentData.schemaVersion === 2
    ? adaptBeatmapV2(documentData)
    : adaptBeatmapV1(documentData);
  if (beatmap.trackId !== track.id || beatmap.difficulty !== difficulty) {
    throw new Error(`Beatmap no corresponde a ${track.id}/${difficulty}.`);
  }
  return beatmap;
}

export function isBeatmapJsonContentType(contentType: string | null): boolean {
  return contentType?.toLowerCase().includes('application/json') ?? false;
}

async function fetchBeatmapDocument(
  relativePath: string,
): Promise<BeatmapV1Document | BeatmapV2Document | null> {
  const response = await fetch(new URL(relativePath, document.baseURI));
  if (!response.ok || !isBeatmapJsonContentType(response.headers.get('content-type'))) {
    return null;
  }
  try {
    return await response.json() as BeatmapV1Document | BeatmapV2Document;
  } catch {
    return null;
  }
}
