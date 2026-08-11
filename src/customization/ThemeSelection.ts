import type {
  DeepPartial,
  DragTrailStyle,
  FlowBackgroundPattern,
  SuperFlowBackgroundPattern,
  TargetShape,
  ThemeParticleStyle,
  TimingRingStyle,
  VisualTheme,
} from './ThemeTypes';
import { DEFAULT_VISUAL_THEME } from './themes/defaultTheme';

const TARGET_SHAPES = new Set<TargetShape>(['orbital', 'faceted', 'segmented']);
const TIMING_RING_STYLES = new Set<TimingRingStyle>([
  'concentric',
  'broken',
  'orbiting',
]);
const DRAG_TRAIL_STYLES = new Set<DragTrailStyle>(['luminous', 'electric', 'comet']);
const FLOW_PATTERNS = new Set<FlowBackgroundPattern>(['polygon', 'waves', 'vortex']);
const SUPER_FLOW_PATTERNS = new Set<SuperFlowBackgroundPattern>([
  'tunnel',
  'hyperspace',
  'prism',
]);
const PARTICLE_STYLES = new Set<ThemeParticleStyle>(['mixed', 'spark', 'diamond']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeWithFallback(fallback: unknown, candidate: unknown): unknown {
  if (typeof fallback === 'number') {
    return typeof candidate === 'number'
      && Number.isInteger(candidate)
      && candidate >= 0
      && candidate <= 0xffffff
      ? candidate
      : fallback;
  }
  if (typeof fallback === 'string') {
    return typeof candidate === 'string' && candidate.trim().length > 0
      ? candidate
      : fallback;
  }
  if (Array.isArray(fallback)) {
    if (!Array.isArray(candidate)) return [...fallback];
    return fallback.map((value, index) => mergeWithFallback(value, candidate[index]));
  }
  if (isRecord(fallback)) {
    const source = isRecord(candidate) ? candidate : {};
    return Object.fromEntries(
      Object.entries(fallback).map(([key, value]) => [
        key,
        mergeWithFallback(value, source[key]),
      ]),
    );
  }
  return fallback;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

/**
 * Completa temas parciales y descarta valores incompatibles. Esto permite que
 * futuros JSON o eventos fallen hacia la identidad original sin romper Pixi.
 */
export function resolveVisualTheme(
  candidate: DeepPartial<VisualTheme> | unknown,
): VisualTheme {
  const merged = mergeWithFallback(DEFAULT_VISUAL_THEME, candidate) as VisualTheme;
  if (!TARGET_SHAPES.has(merged.target.shape)) {
    merged.target.shape = DEFAULT_VISUAL_THEME.target.shape;
  }
  if (!TIMING_RING_STYLES.has(merged.target.timingRingStyle)) {
    merged.target.timingRingStyle = DEFAULT_VISUAL_THEME.target.timingRingStyle;
  }
  if (!DRAG_TRAIL_STYLES.has(merged.drag.trailStyle)) {
    merged.drag.trailStyle = DEFAULT_VISUAL_THEME.drag.trailStyle;
  }
  if (!FLOW_PATTERNS.has(merged.background.flowPattern)) {
    merged.background.flowPattern = DEFAULT_VISUAL_THEME.background.flowPattern;
  }
  if (!SUPER_FLOW_PATTERNS.has(merged.background.superFlowPattern)) {
    merged.background.superFlowPattern = DEFAULT_VISUAL_THEME.background.superFlowPattern;
  }
  if (!PARTICLE_STYLES.has(merged.effects.particleStyle)) {
    merged.effects.particleStyle = DEFAULT_VISUAL_THEME.effects.particleStyle;
  }
  return deepFreeze(merged);
}
