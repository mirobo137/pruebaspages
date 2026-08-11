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
const THEME_STORAGE_KEY = 'superflow:visual-theme:v1';
type ThemeStorage = Pick<Storage, 'getItem' | 'setItem'>;

function getBrowserStorage(): ThemeStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function listVisualThemes(): readonly VisualTheme[] {
  return THEMES;
}

export function getVisualTheme(themeId: string | null | undefined): VisualTheme {
  return (themeId ? THEMES_BY_ID.get(themeId) : null) ?? THEMES[0];
}

export class ThemeSelection {
  private selectedThemeId: string;

  constructor(private readonly storage: ThemeStorage | null = getBrowserStorage()) {
    this.selectedThemeId = this.loadSelection();
  }

  get current(): VisualTheme {
    return getVisualTheme(this.selectedThemeId);
  }

  select(themeId: string, persist = true): VisualTheme {
    this.selectedThemeId = getVisualTheme(themeId).id;
    if (persist) this.saveSelection();
    return this.current;
  }

  private loadSelection(): string {
    try {
      const stored = this.storage?.getItem(THEME_STORAGE_KEY);
      if (!stored) return DEFAULT_THEME_ID;
      const candidate = JSON.parse(stored) as { version?: unknown; themeId?: unknown };
      if (candidate.version !== 1 || typeof candidate.themeId !== 'string') {
        return DEFAULT_THEME_ID;
      }
      return getVisualTheme(candidate.themeId).id;
    } catch {
      return DEFAULT_THEME_ID;
    }
  }

  private saveSelection(): void {
    try {
      this.storage?.setItem(THEME_STORAGE_KEY, JSON.stringify({
        version: 1,
        themeId: this.selectedThemeId,
      }));
    } catch {
      // El modo privado o una cuota llena no deben bloquear el juego.
    }
  }
}
