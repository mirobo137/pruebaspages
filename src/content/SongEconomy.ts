export type SongPriceTier = 'free' | 'economy' | 'select' | 'premium';

export interface SongPriceTierDefinition {
  id: SongPriceTier;
  label: string;
  shortLabel: string;
  price: number;
  targetCompletedRuns: string;
  color: number;
}

export const SONG_PRICE_TIERS: SongPriceTierDefinition[] = [
  {
    id: 'free',
    label: 'Gratis',
    shortLabel: 'GRATIS',
    price: 0,
    targetCompletedRuns: 'Incluidas',
    color: 0x5ee6ae,
  },
  {
    id: 'economy',
    label: 'Economicas',
    shortLabel: 'ECONOMICAS',
    price: 400,
    targetCompletedRuns: '2-3 partidas',
    color: 0x5eeaff,
  },
  {
    id: 'select',
    label: 'Selectas',
    shortLabel: 'SELECTAS',
    price: 800,
    targetCompletedRuns: '4-6 partidas',
    color: 0x8c8cff,
  },
  {
    id: 'premium',
    label: 'Premium',
    shortLabel: 'PREMIUM',
    price: 1400,
    targetCompletedRuns: '7-10 partidas',
    color: 0xff67d9,
  },
];

/**
 * Las canciones que ya formaban parte del prototipo permanecen gratuitas.
 * Una cancion nueva entra como Economica hasta que se le asigne otra categoria.
 */
const FREE_TRACK_IDS = new Set([
  'chrono-echo-bloom',
  'coffee-in-the-driveway',
  'echoes-of-the-conservatory',
  'emerald-glade',
  'epilogue-in-echoes',
  'final-score-lament',
  'final-score',
  'neon-serenade',
  'softly-into-stone',
  'the-last-ember',
  'whispering-glades',
]);

/** Asigna aqui las futuras canciones Selectas o Premium por su ID estable. */
const TRACK_TIER_OVERRIDES: Partial<Record<string, SongPriceTier>> = {};

export function getSongPriceTier(trackId: string): SongPriceTier {
  if (FREE_TRACK_IDS.has(trackId)) return 'free';
  return TRACK_TIER_OVERRIDES[trackId] ?? 'economy';
}

export function getSongTierDefinition(
  tier: SongPriceTier,
): SongPriceTierDefinition {
  return SONG_PRICE_TIERS.find((definition) => definition.id === tier)
    ?? SONG_PRICE_TIERS[0];
}

export function getSongPrice(trackId: string): number {
  return getSongTierDefinition(getSongPriceTier(trackId)).price;
}
