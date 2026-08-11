import { resolveVisualTheme } from './ThemeSelection';
import type { VisualTheme } from './ThemeTypes';
import { DEFAULT_VISUAL_THEME } from './themes/defaultTheme';

const THEMES = [resolveVisualTheme(DEFAULT_VISUAL_THEME)] as const;
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

/** Seleccion en memoria; la persistencia se incorpora en la Fase 4. */
export class ThemeSelection {
  private selectedThemeId: string = DEFAULT_THEME_ID;

  get current(): VisualTheme {
    return getVisualTheme(this.selectedThemeId);
  }

  select(themeId: string): VisualTheme {
    this.selectedThemeId = getVisualTheme(themeId).id;
    return this.current;
  }
}
