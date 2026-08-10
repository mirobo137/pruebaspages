import type { Beatmap } from './Beatmap';
import type { MusicTrack } from './MusicCatalog';
import type { Difficulty } from '../game/difficulty/Difficulty';

export interface TrackSelection {
  track: MusicTrack;
  beatmaps: Record<Difficulty, Beatmap>;
}
