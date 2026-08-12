import { getVisualTheme, listVisualThemes } from './ThemeCatalog';
import { resolveVisualTheme } from './ThemeSelection';
import type { DeepPartial, VisualTheme } from './ThemeTypes';

export const CUSTOM_THEME_ID = 'custom-1';

export const THEME_COMPONENT_SLOTS = [
  'target-palette',
  'timing-ring',
  'drag-trail',
  'perfect-impact',
  'flow-background',
  'super-flow-background',
] as const;

export type ThemeComponentSlot = typeof THEME_COMPONENT_SLOTS[number];
export type CustomThemeSelection = Record<ThemeComponentSlot, string>;

export interface ThemeComponentOption {
  themeId: string;
  themeName: string;
  slot: ThemeComponentSlot;
}

export const THEME_COMPONENT_LABELS: Record<ThemeComponentSlot, string> = {
  'target-palette': 'OBJETIVOS',
  'timing-ring': 'ARO',
  'drag-trail': 'ESTELA',
  'perfect-impact': 'PERFECT',
  'flow-background': 'FLOW',
  'super-flow-background': 'SUPER FLOW',
};

export function createDefaultCustomThemeSelection(): CustomThemeSelection {
  return Object.fromEntries(
    THEME_COMPONENT_SLOTS.map((slot) => [slot, 'neon-pulse']),
  ) as CustomThemeSelection;
}

export function listAvailableThemeComponents(
  unlockedThemeIds: readonly string[],
  unlockedCosmeticIds: readonly string[],
): Record<ThemeComponentSlot, ThemeComponentOption[]> {
  const unlockedThemes = new Set(unlockedThemeIds);
  const cosmetics = new Set(unlockedCosmeticIds);
  return Object.fromEntries(THEME_COMPONENT_SLOTS.map((slot) => [
    slot,
    listVisualThemes().filter((theme) => (
      unlockedThemes.has(theme.id)
      || cosmetics.has(cosmeticIdFor(theme.id, slot))
      || (theme.id === 'neon-ascent' && cosmetics.has(`neon-ascent-2026:${slot}`))
    )).map((theme) => ({ themeId: theme.id, themeName: theme.name, slot })),
  ])) as Record<ThemeComponentSlot, ThemeComponentOption[]>;
}

export function sanitizeCustomThemeSelection(
  selection: Partial<Record<ThemeComponentSlot, string>> | null | undefined,
  unlockedThemeIds: readonly string[],
  unlockedCosmeticIds: readonly string[],
): CustomThemeSelection {
  const available = listAvailableThemeComponents(unlockedThemeIds, unlockedCosmeticIds);
  const fallback = createDefaultCustomThemeSelection();
  return Object.fromEntries(THEME_COMPONENT_SLOTS.map((slot) => {
    const requested = selection?.[slot];
    const valid = available[slot].some((option) => option.themeId === requested);
    return [slot, valid ? requested : available[slot][0]?.themeId ?? fallback[slot]];
  })) as CustomThemeSelection;
}

export function composeCustomTheme(selection: CustomThemeSelection): VisualTheme {
  const targetPalette = getVisualTheme(selection['target-palette']);
  const timingRing = getVisualTheme(selection['timing-ring']);
  const dragTrail = getVisualTheme(selection['drag-trail']);
  const perfectImpact = getVisualTheme(selection['perfect-impact']);
  const flowBackground = getVisualTheme(selection['flow-background']);
  const superBackground = getVisualTheme(selection['super-flow-background']);
  const partial: DeepPartial<VisualTheme> = {
    id: CUSTOM_THEME_ID,
    name: 'Mi Skin',
    description: 'Tu mezcla personal de objetivos, estela, impactos y estados de Flow.',
    target: {
      ...targetPalette.target,
      timingRingStyle: timingRing.target.timingRingStyle,
      goodTiming: timingRing.target.goodTiming,
      perfectTiming: timingRing.target.perfectTiming,
    },
    drag: { ...dragTrail.drag },
    background: {
      ...targetPalette.background,
      flowPattern: flowBackground.background.flowPattern,
      flowOverlay: flowBackground.background.flowOverlay,
      flowOverlayTint: flowBackground.background.flowOverlayTint,
      flowRayPrimary: flowBackground.background.flowRayPrimary,
      flowRaySecondary: flowBackground.background.flowRaySecondary,
      flowGeometry: flowBackground.background.flowGeometry,
      flowPulse: flowBackground.background.flowPulse,
      flowGrid: flowBackground.background.flowGrid,
      flowOrb: flowBackground.background.flowOrb,
      superFlowPattern: superBackground.background.superFlowPattern,
      superPrimary: superBackground.background.superPrimary,
      superSecondary: superBackground.background.superSecondary,
      superOverlayTint: superBackground.background.superOverlayTint,
    },
    effects: {
      ...targetPalette.effects,
      particleStyle: perfectImpact.effects.particleStyle,
      perfect: perfectImpact.effects.perfect,
      good: perfectImpact.effects.good,
      impactFlow: perfectImpact.effects.impactFlow,
      impactFlowAccent: perfectImpact.effects.impactFlowAccent,
      impactSuper: perfectImpact.effects.impactSuper,
      flowPrimary: flowBackground.effects.flowPrimary,
      flowSecondary: flowBackground.effects.flowSecondary,
      flowHighlight: flowBackground.effects.flowHighlight,
      flowText: flowBackground.effects.flowText,
      frameFlow: flowBackground.effects.frameFlow,
      superPrimary: superBackground.effects.superPrimary,
      superSecondary: superBackground.effects.superSecondary,
      superFlash: superBackground.effects.superFlash,
      frameSuper: superBackground.effects.frameSuper,
    },
  };
  return resolveVisualTheme(partial);
}

export function cosmeticIdFor(themeId: string, slot: ThemeComponentSlot): string {
  return `${themeId}:${slot}`;
}
