import { resolveVisualTheme } from './ThemeSelection';
import type { VisualTheme } from './ThemeTypes';
import {
  AQUA_VECTOR_THEME,
  EMBER_BEAT_THEME,
  VIOLET_DRIVE_THEME,
} from './themes/rewardedBasicThemes';

export interface RewardedThemeDefinition {
  theme: VisualTheme;
  coinPrice: number;
}

export interface DailyRewardedThemeOffer extends RewardedThemeDefinition {
  dayKey: string;
  opportunityId: string;
}

export interface DailyRewardedThemeState extends DailyRewardedThemeOffer {
  owned: boolean;
  claimedToday: boolean;
  canAfford: boolean;
}

export const DAILY_COSMETIC_REWARD_ID = 'daily-cosmetic';
export const DAILY_COSMETIC_COIN_PRICE = 1_200;
const DAY_MILLISECONDS = 24 * 60 * 60 * 1000;

const REWARDED_THEMES: readonly RewardedThemeDefinition[] = [
  AQUA_VECTOR_THEME,
  VIOLET_DRIVE_THEME,
  EMBER_BEAT_THEME,
].map((candidate) => ({
  theme: resolveVisualTheme(candidate),
  coinPrice: DAILY_COSMETIC_COIN_PRICE,
}));

export function listRewardedThemeDefinitions(): readonly RewardedThemeDefinition[] {
  return REWARDED_THEMES;
}

export function listRewardedVisualThemes(): readonly VisualTheme[] {
  return REWARDED_THEMES.map((definition) => definition.theme);
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

export function getDailyRewardedThemeOffer(
  date: Date = new Date(),
): DailyRewardedThemeOffer {
  const timestamp = Number.isFinite(date.getTime()) ? date.getTime() : 0;
  const dayIndex = Math.floor(timestamp / DAY_MILLISECONDS);
  const definition = REWARDED_THEMES[positiveModulo(dayIndex, REWARDED_THEMES.length)];
  const dayKey = getUtcDayKey(date);
  return {
    ...definition,
    dayKey,
    opportunityId: `daily:${dayKey}:${definition.theme.id}`,
  };
}

export function isRewardedTheme(themeId: string): boolean {
  return REWARDED_THEMES.some((definition) => definition.theme.id === themeId);
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
