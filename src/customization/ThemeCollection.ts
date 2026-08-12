import { listVisualThemes } from './ThemeCatalog';
import type { VisualTheme } from './ThemeTypes';

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
] as const;

export function listThemeCollection(
  totalRuns: number,
  unlockedThemeIds: readonly string[],
  unlockedCosmeticIds: readonly string[] = [],
): readonly ThemeCollectionItem[] {
  const themes = new Map(listVisualThemes().map((theme) => [theme.id, theme]));
  const safeRuns = Math.max(0, Math.floor(totalRuns));
  return DEFINITIONS.flatMap((definition) => {
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
        ? `${unlockedCosmeticIds.filter((id) => id.startsWith(`${definition.eventCampaignId}:`)).length}/7 COMPONENTES`
        : definition.requiredRuns <= 0
        ? 'DISPONIBLE'
        : `${Math.min(safeRuns, definition.requiredRuns)}/${definition.requiredRuns} PARTIDAS`,
    }];
  });
}

export function getAutomaticallyUnlockedThemeIds(totalRuns: number): string[] {
  const safeRuns = Math.max(0, Math.floor(totalRuns));
  return DEFINITIONS
    .filter((definition) => definition.requiredRuns >= 0 && safeRuns >= definition.requiredRuns)
    .map((definition) => definition.themeId);
}
