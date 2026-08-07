import type { NoteKind } from '../game/notes/NoteKind';
import type { MusicTrack } from './MusicCatalog';

export interface BeatEvent {
  time: number;
  kind: NoteKind;
}

export interface Beatmap {
  trackId: string;
  duration: number;
  events: BeatEvent[];
}

export async function loadBeatmap(track: MusicTrack): Promise<Beatmap | null> {
  const beatmapUrl = new URL(track.beatmapPath, document.baseURI);
  const response = await fetch(beatmapUrl);

  if (!response.ok) return null;

  return response.json() as Promise<Beatmap>;
}

