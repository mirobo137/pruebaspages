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

  const catalog = await response.json() as MusicTrack[];
  const parameters = new URLSearchParams(window.location.search);
  const previewMode = parameters.get('beatmapPreview');
  if (previewMode !== 'm4' && previewMode !== 'm4-v2') return catalog;
  const requestedTrack = parameters.get('previewTrack');
  if (!requestedTrack) return catalog;
  const previewUrl = new URL(`./assets/beatmap-previews/${previewMode}/catalog.json`, document.baseURI);
  const previewResponse = await fetch(previewUrl);
  if (!previewResponse.ok || !previewResponse.headers.get('content-type')?.includes('application/json')) {
    return catalog;
  }
  const previews = await previewResponse.json() as MusicTrack[];
  const preview = previews.find((track) => track.id === requestedTrack);
  return preview ? [preview] : catalog;
}
