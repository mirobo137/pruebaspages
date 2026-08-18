import type { ThemeComponentSlot } from '../customization/ThemeComponents';

export const DAILY_ROULETTE_VERSION = 1;
export const DAILY_ROULETTE_ID = 'daily-roulette';

export type DailyRouletteRewardKind = 'coins' | 'theme' | 'component';

export interface DailyRouletteProgress {
  dayKey: string | null;
  outcomeId: string | null;
  claimed: boolean;
}

export interface DailyRouletteRewardDefinition {
  id: string;
  kind: DailyRouletteRewardKind;
  label: string;
  amount?: number;
  themeId?: string;
  slot?: ThemeComponentSlot;
  weight: number;
  duplicateCoins: number;
}

export interface DailyRouletteInventory {
  unlockedThemeIds: readonly string[];
  unlockedCosmeticIds: readonly string[];
}

export interface DailyRouletteOffer {
  dayKey: string;
  opportunityId: string;
  reward: DailyRouletteRewardDefinition;
  claimed: boolean;
  duplicate: boolean;
  canClaim: boolean;
}

export interface DailyRouletteClaimResult {
  claimed: boolean;
  offer: DailyRouletteOffer;
  reward: DailyRouletteRewardDefinition;
  coinsAwarded: number;
  grantedThemeId: string | null;
  grantedCosmeticId: string | null;
  duplicate: boolean;
  progress: DailyRouletteProgress;
}

const DAY_MILLISECONDS = 24 * 60 * 60 * 1000;

// El peso total es 100. Los premios de monedas mantienen una ruta de recompensa
// aunque el inventario ya tenga los componentes de la rotacion.
const DAILY_REWARDS: readonly DailyRouletteRewardDefinition[] = [
  {
    id: 'coins-150', kind: 'coins', label: '150 MONEDAS', amount: 150,
    weight: 36, duplicateCoins: 0,
  },
  {
    id: 'coins-350', kind: 'coins', label: '350 MONEDAS', amount: 350,
    weight: 20, duplicateCoins: 0,
  },
  {
    id: 'coins-600', kind: 'coins', label: '600 MONEDAS', amount: 600,
    weight: 2, duplicateCoins: 0,
  },
  {
    id: 'component-aqua-flow', kind: 'component', label: 'FONDO FLOW · AQUA VECTOR',
    themeId: 'aqua-vector', slot: 'flow-background', weight: 7, duplicateCoins: 180,
  },
  {
    id: 'component-violet-super', kind: 'component', label: 'FONDO SUPER FLOW · VIOLET DRIVE',
    themeId: 'violet-drive', slot: 'super-flow-background', weight: 6, duplicateCoins: 180,
  },
  {
    id: 'component-ember-ring', kind: 'component', label: 'ARO · EMBER BEAT',
    themeId: 'ember-beat', slot: 'timing-ring', weight: 4, duplicateCoins: 180,
  },
  {
    id: 'component-aurora-bars', kind: 'component', label: 'BARRAS Â· AURORA PULSE',
    themeId: 'aurora-pulse', slot: 'music-visualizer', weight: 6, duplicateCoins: 180,
  },
  {
    id: 'component-magenta-flow', kind: 'component', label: 'FONDO FLOW Â· MAGENTA CIRCUIT',
    themeId: 'magenta-circuit', slot: 'flow-background', weight: 5, duplicateCoins: 180,
  },
  {
    id: 'component-midnight-super', kind: 'component', label: 'FONDO SUPER FLOW Â· MIDNIGHT NEBULA',
    themeId: 'midnight-nebula', slot: 'super-flow-background', weight: 4, duplicateCoins: 180,
  },
  {
    id: 'component-lime-palette', kind: 'component', label: 'OBJETIVOS Â· LIME VELOCITY',
    themeId: 'lime-velocity', slot: 'target-palette', weight: 3, duplicateCoins: 180,
  },
  {
    id: 'theme-aqua-vector', kind: 'theme', label: 'SKIN COMPLETA · AQUA VECTOR',
    themeId: 'aqua-vector', weight: 2, duplicateCoins: 500,
  },
  {
    id: 'theme-violet-drive', kind: 'theme', label: 'SKIN COMPLETA · VIOLET DRIVE',
    themeId: 'violet-drive', weight: 1, duplicateCoins: 500,
  },
  {
    id: 'theme-aurora-pulse', kind: 'theme', label: 'SKIN COMPLETA Â· AURORA PULSE',
    themeId: 'aurora-pulse', weight: 1, duplicateCoins: 500,
  },
  {
    id: 'theme-magenta-circuit', kind: 'theme', label: 'SKIN COMPLETA Â· MAGENTA CIRCUIT',
    themeId: 'magenta-circuit', weight: 1, duplicateCoins: 500,
  },
  {
    id: 'theme-midnight-nebula', kind: 'theme', label: 'SKIN COMPLETA Â· MIDNIGHT NEBULA',
    themeId: 'midnight-nebula', weight: 1, duplicateCoins: 500,
  },
  {
    id: 'theme-lime-velocity', kind: 'theme', label: 'SKIN COMPLETA Â· LIME VELOCITY',
    themeId: 'lime-velocity', weight: 1, duplicateCoins: 500,
  },
];

export function createEmptyDailyRouletteProgress(): DailyRouletteProgress {
  return { dayKey: null, outcomeId: null, claimed: false };
}

export function listDailyRouletteRewards(): readonly DailyRouletteRewardDefinition[] {
  return DAILY_REWARDS;
}

export function getUtcDayKey(date: Date = new Date()): string {
  const timestamp = Number.isFinite(date.getTime()) ? date.getTime() : 0;
  const day = new Date(timestamp);
  return [
    day.getUTCFullYear(),
    String(day.getUTCMonth() + 1).padStart(2, '0'),
    String(day.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

export function getDailyRouletteOffer(
  progress: DailyRouletteProgress,
  inventory: DailyRouletteInventory,
  date: Date = new Date(),
): DailyRouletteOffer {
  const dayKey = getUtcDayKey(date);
  const outcomeId = progress.dayKey === dayKey && progress.outcomeId
    ? progress.outcomeId
    : selectRewardId(dayKey);
  const reward = DAILY_REWARDS.find((candidate) => candidate.id === outcomeId)
    ?? DAILY_REWARDS[0];
  const duplicate = isRewardOwned(reward, inventory);
  return {
    dayKey,
    opportunityId: `${DAILY_ROULETTE_ID}:${dayKey}:${reward.id}`,
    reward,
    claimed: progress.dayKey === dayKey && progress.claimed,
    duplicate,
    canClaim: !(progress.dayKey === dayKey && progress.claimed),
  };
}

export function claimDailyRoulette(
  progress: DailyRouletteProgress,
  inventory: DailyRouletteInventory,
  date: Date = new Date(),
): DailyRouletteClaimResult {
  const offer = getDailyRouletteOffer(progress, inventory, date);
  const nextProgress: DailyRouletteProgress = {
    dayKey: offer.dayKey,
    outcomeId: offer.reward.id,
    claimed: true,
  };
  if (!offer.canClaim) {
    return {
      claimed: false,
      offer,
      reward: offer.reward,
      coinsAwarded: 0,
      grantedThemeId: null,
      grantedCosmeticId: null,
      duplicate: offer.duplicate,
      progress,
    };
  }

  if (offer.reward.kind === 'coins') {
    return {
      claimed: true,
      offer,
      reward: offer.reward,
      coinsAwarded: offer.reward.amount ?? 0,
      grantedThemeId: null,
      grantedCosmeticId: null,
      duplicate: false,
      progress: nextProgress,
    };
  }

  if (offer.duplicate) {
    return {
      claimed: true,
      offer,
      reward: offer.reward,
      coinsAwarded: offer.reward.duplicateCoins,
      grantedThemeId: null,
      grantedCosmeticId: null,
      duplicate: true,
      progress: nextProgress,
    };
  }

  return {
    claimed: true,
    offer,
    reward: offer.reward,
    coinsAwarded: 0,
    grantedThemeId: offer.reward.kind === 'theme' ? offer.reward.themeId ?? null : null,
    grantedCosmeticId: offer.reward.kind === 'component'
      ? `${offer.reward.themeId}:${offer.reward.slot}`
      : null,
    duplicate: false,
    progress: nextProgress,
  };
}

export function isRewardOwned(
  reward: DailyRouletteRewardDefinition,
  inventory: DailyRouletteInventory,
): boolean {
  if (reward.kind === 'coins') return false;
  if (reward.kind === 'theme') {
    return Boolean(reward.themeId && inventory.unlockedThemeIds.includes(reward.themeId));
  }
  if (!reward.themeId || !reward.slot) return true;
  return inventory.unlockedThemeIds.includes(reward.themeId)
    || inventory.unlockedCosmeticIds.includes(`${reward.themeId}:${reward.slot}`);
}

function selectRewardId(dayKey: string): string {
  const totalWeight = DAILY_REWARDS.reduce((total, reward) => total + reward.weight, 0);
  let cursor = hashDay(dayKey) % totalWeight;
  for (const reward of DAILY_REWARDS) {
    if (cursor < reward.weight) return reward.id;
    cursor -= reward.weight;
  }
  return DAILY_REWARDS.at(-1)?.id ?? DAILY_REWARDS[0].id;
}

function hashDay(dayKey: string): number {
  let hash = 0x811c9dc5;
  for (const character of `${DAILY_ROULETTE_VERSION}:${dayKey}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function dayDistance(fromDayKey: string, toDayKey: string): number {
  const from = Date.parse(`${fromDayKey}T00:00:00.000Z`);
  const to = Date.parse(`${toDayKey}T00:00:00.000Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  return Math.max(0, Math.round((to - from) / DAY_MILLISECONDS));
}
