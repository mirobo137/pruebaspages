import { listVisualThemes } from './ThemeCatalog';
import type { VisualTheme } from './ThemeTypes';
import {
  composeCustomTheme,
  type CustomThemeSelection,
} from './ThemeComponents';
import { listRewardedThemeDefinitions } from './RewardedThemeCatalog';

export interface ThemeCollectionItem {
  theme: VisualTheme;
  origin: string;
  unlockDescription: string;
  requiredRuns: number;
  unlocked: boolean;
  progressLabel: string;
}

interface ThemeCollectionDefinition {
  themeId: string;
  origin: string;
  unlockDescription: string;
  requiredRuns: number;
  eventCampaignId?: string;
  rewardedRotation?: boolean;
}

const DEFINITIONS: readonly ThemeCollectionDefinition[] = [
  {
    themeId: 'neon-pulse',
    origin: 'Tema inicial',
    unlockDescription: 'Incluido desde el primer inicio.',
    requiredRuns: 0,
  },
  {
    themeId: 'cyber-sakura',
    origin: 'Coleccion fundadora',
    unlockDescription: 'Incluido en la coleccion inicial.',
    requiredRuns: 0,
  },
  {
    themeId: 'solar-flux',
    origin: 'Logro de ritmo',
    unlockDescription: 'Juega 3 partidas para desbloquearlo.',
    requiredRuns: 3,
  },
  {
    themeId: 'neon-ascent',
    origin: 'Evento semanal Neon Ascent',
    unlockDescription: 'Completa y reclama los 7 escalones del evento semanal.',
    requiredRuns: -1,
    eventCampaignId: 'neon-ascent-2026',
  },
  ...listRewardedThemeDefinitions().map(({ theme }) => ({
    themeId: theme.id,
    origin: 'Rotacion diaria',
    unlockDescription: 'Disponible cuando aparece como la skin del dia.',
    requiredRuns: -1,
    rewardedRotation: true,
  })),
] as const;

export function listThemeCollection(
  totalRuns: number,
  unlockedThemeIds: readonly string[],
  unlockedCosmeticIds: readonly string[] = [],
  customThemeSelection?: CustomThemeSelection,
  dailyOfferThemeId?: string,
): readonly ThemeCollectionItem[] {
  const themes = new Map(listVisualThemes().map((theme) => [theme.id, theme]));
  const safeRuns = Math.max(0, Math.floor(totalRuns));
  const items = DEFINITIONS.flatMap((definition) => {
    const theme = themes.get(definition.themeId);
    if (!theme) return [];
    const unlocked = unlockedThemeIds.includes(definition.themeId);
    return [{
      theme,
      origin: definition.origin,
      unlockDescription: definition.unlockDescription,
      requiredRuns: definition.requiredRuns,
      unlocked,
      progressLabel: definition.eventCampaignId
        ? `${countEventComponents(definition.themeId, definition.eventCampaignId, unlockedCosmeticIds)}/7 COMPONENTES`
        : definition.rewardedRotation
          ? definition.themeId === dailyOfferThemeId
            ? 'OFERTA DE HOY'
            : 'VUELVE OTRO DIA'
        : definition.requiredRuns <= 0
        ? 'DISPONIBLE'
        : `${Math.min(safeRuns, definition.requiredRuns)}/${definition.requiredRuns} PARTIDAS`,
    }];
  });
  if (customThemeSelection) {
    items.push({
      theme: composeCustomTheme(customThemeSelection),
      origin: 'Tu taller visual',
      unlockDescription: 'Edita y combina los componentes que has desbloqueado.',
      requiredRuns: 0,
      unlocked: true,
      progressLabel: '1 SLOT PERSONAL',
    });
  }
  return items;
}

function countEventComponents(
  themeId: string,
  legacyCampaignId: string,
  cosmeticIds: readonly string[],
): number {
  const slots = new Set(cosmeticIds.flatMap((id) => {
    const prefixes = [`${themeId}:`, `${legacyCampaignId}:`];
    const prefix = prefixes.find((candidate) => id.startsWith(candidate));
    return prefix ? [id.slice(prefix.length)] : [];
  }));
  return slots.size;
}

export function getAutomaticallyUnlockedThemeIds(totalRuns: number): string[] {
  const safeRuns = Math.max(0, Math.floor(totalRuns));
  return DEFINITIONS
    .filter((definition) => definition.requiredRuns >= 0 && safeRuns >= definition.requiredRuns)
    .map((definition) => definition.themeId);
}
