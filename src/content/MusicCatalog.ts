import type { Difficulty } from '../game/difficulty/Difficulty';
import type { SongPriceTier } from './SongEconomy';

export interface MusicTrack {
  id: string;
  title: string;
  audioPath: string;
  priceTier: SongPriceTier;
  price: number;
  beatmapPaths: Record<Difficulty, string>;
  bpm?: number;
}

export const MUSIC_MANIFEST_PATH = './assets/music-manifest.json';

export async function loadMusicCatalog(): Promise<MusicTrack[]> {
  const manifestUrl = new URL(MUSIC_MANIFEST_PATH, document.baseURI);
  const response = await fetch(manifestUrl);

  if (!response.ok) {
    throw new Error(`No se pudo cargar el catálogo musical: ${response.status}`);
  }

  return response.json() as Promise<MusicTrack[]>;
}
