import type { Beatmap } from './Beatmap';
import type { MusicTrack } from './MusicCatalog';

export interface TrackSelection {
  track: MusicTrack;
  beatmap: Beatmap;
}
