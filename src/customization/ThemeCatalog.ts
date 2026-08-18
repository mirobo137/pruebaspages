import { resolveVisualTheme } from './ThemeSelection';
import type { VisualTheme } from './ThemeTypes';
import { CYBER_SAKURA_THEME } from './themes/cyberSakuraTheme';
import { DEFAULT_VISUAL_THEME } from './themes/defaultTheme';
import { SOLAR_FLUX_THEME } from './themes/solarFluxTheme';
import { NEON_ASCENT_THEME } from './themes/neonAscentTheme';
import {
  AURORA_PULSE_THEME,
  LIME_VELOCITY_THEME,
  MAGENTA_CIRCUIT_THEME,
  MIDNIGHT_NEBULA_THEME,
} from './themes/modularThemes';
import { listRewardedVisualThemes } from './RewardedThemeCatalog';

const THEMES = [
  resolveVisualTheme(DEFAULT_VISUAL_THEME),
  resolveVisualTheme(CYBER_SAKURA_THEME),
  resolveVisualTheme(SOLAR_FLUX_THEME),
  resolveVisualTheme(NEON_ASCENT_THEME),
  resolveVisualTheme(AURORA_PULSE_THEME),
  resolveVisualTheme(MAGENTA_CIRCUIT_THEME),
  resolveVisualTheme(MIDNIGHT_NEBULA_THEME),
  resolveVisualTheme(LIME_VELOCITY_THEME),
  ...listRewardedVisualThemes(),
] as const;
const THEMES_BY_ID = new Map<string, VisualTheme>(
  THEMES.map((theme) => [theme.id, theme]),
);

export const DEFAULT_THEME_ID = DEFAULT_VISUAL_THEME.id;

export function listVisualThemes(): readonly VisualTheme[] {
  return THEMES;
}

export function getVisualTheme(themeId: string | null | undefined): VisualTheme {
  return (themeId ? THEMES_BY_ID.get(themeId) : null) ?? THEMES[0];
}

export class ThemeSelection {
  private selectedTheme: VisualTheme;

  constructor(themeId: string = DEFAULT_THEME_ID) {
    this.selectedTheme = getVisualTheme(themeId);
  }

  get current(): VisualTheme {
    return this.selectedTheme;
  }

  select(themeId: string): VisualTheme {
    this.selectedTheme = getVisualTheme(themeId);
    return this.current;
  }

  selectResolved(theme: VisualTheme): VisualTheme {
    this.selectedTheme = theme;
    return this.current;
  }
}
