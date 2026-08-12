import { resolveVisualTheme } from './ThemeSelection';
import type { VisualTheme } from './ThemeTypes';
import { CYBER_SAKURA_THEME } from './themes/cyberSakuraTheme';
import { DEFAULT_VISUAL_THEME } from './themes/defaultTheme';
import { SOLAR_FLUX_THEME } from './themes/solarFluxTheme';

const THEMES = [
  resolveVisualTheme(DEFAULT_VISUAL_THEME),
  resolveVisualTheme(CYBER_SAKURA_THEME),
  resolveVisualTheme(SOLAR_FLUX_THEME),
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
  private selectedThemeId: string;

  constructor(themeId: string = DEFAULT_THEME_ID) {
    this.selectedThemeId = getVisualTheme(themeId).id;
  }

  get current(): VisualTheme {
    return getVisualTheme(this.selectedThemeId);
  }

  select(themeId: string): VisualTheme {
    this.selectedThemeId = getVisualTheme(themeId).id;
    return this.current;
  }
}
