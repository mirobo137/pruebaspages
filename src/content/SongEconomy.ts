import songCategories from './song-categories.json';

export type SongPriceTier = 'free' | 'economy' | 'select' | 'premium';

export interface SongPriceTierDefinition {
  id: SongPriceTier;
  folder: string | null;
  label: string;
  shortLabel: string;
  price: number;
  targetCompletedRuns: string;
  color: number;
}

/** Fuente compartida con el generador de `music-manifest.json`. */
export const SONG_PRICE_TIERS = songCategories as SongPriceTierDefinition[];

export function getSongTierDefinition(
  tier: SongPriceTier,
): SongPriceTierDefinition {
  return SONG_PRICE_TIERS.find((definition) => definition.id === tier)
    ?? SONG_PRICE_TIERS[0];
}
