export type TargetShape = 'orbital' | 'faceted' | 'segmented';
export type TimingRingStyle = 'concentric' | 'broken' | 'orbiting';
export type DragTrailStyle = 'luminous' | 'electric' | 'comet';
export type FlowBackgroundPattern = 'polygon' | 'waves' | 'vortex';
export type SuperFlowBackgroundPattern = 'tunnel' | 'hyperspace' | 'prism';
export type ThemeParticleStyle = 'mixed' | 'spark' | 'diamond';

export interface TargetVisualTheme {
  shape: TargetShape;
  timingRingStyle: TimingRingStyle;
  tapFill: number;
  tapOutline: number;
  dragFill: number;
  dragOutline: number;
  shadow: number;
  shadowOutline: number;
  surface: number;
  innerSurface: number;
  highlight: number;
  goodTiming: number;
  perfectTiming: number;
  flowPrimary: number;
  flowAccent: number;
  superPrimary: number;
  superAccent: number;
}

export interface DragVisualTheme {
  trailStyle: DragTrailStyle;
  trailBase: number;
  trailPrimary: number;
  trailHighlight: number;
  guide: number;
  progressBase: number;
  progressHighlight: number;
  destinationShadow: number;
  destinationFill: number;
  destinationOutline: number;
  destinationInner: number;
  checkpointPendingGlow: number;
  checkpointPendingFill: number;
  checkpointPendingOutline: number;
  checkpointReachedGlow: number;
  checkpointReachedFill: number;
  checkpointReachedOutline: number;
}

export interface BackgroundVisualTheme {
  flowPattern: FlowBackgroundPattern;
  superFlowPattern: SuperFlowBackgroundPattern;
  backdrop: number;
  nebulaBase: number;
  vignette: number;
  phasePrimary: readonly [number, number, number];
  phaseSecondary: readonly [number, number, number];
  orbPrimary: number;
  orbSecondary: number;
  grid: number;
  pulse: number;
  flowOverlay: number;
  flowOverlayTint: number;
  flowRayPrimary: number;
  flowRaySecondary: number;
  flowGeometry: readonly [number, number, number];
  flowPulse: number;
  flowGrid: number;
  flowOrb: number;
  superPrimary: number;
  superSecondary: number;
  superOverlayTint: number;
}

export interface EffectsVisualTheme {
  particleStyle: ThemeParticleStyle;
  highlight: number;
  touch: number;
  touchFlow: number;
  touchSuper: number;
  drag: number;
  dragFlow: number;
  dragSuperPrimary: number;
  dragSuperSecondary: number;
  perfect: number;
  good: number;
  miss: number;
  impactFlow: number;
  impactFlowAccent: number;
  impactSuper: number;
  flowPrimary: number;
  flowSecondary: number;
  flowHighlight: number;
  flowText: number;
  flowBreak: number;
  flowBreakFlash: number;
  superPrimary: number;
  superSecondary: number;
  superFlash: number;
  demotionText: number;
  demotionFlash: number;
  phaseColors: readonly [number, number, number];
  frameFlow: number;
  frameSuper: number;
}

export interface VisualTheme {
  id: string;
  name: string;
  description: string;
  target: TargetVisualTheme;
  drag: DragVisualTheme;
  background: BackgroundVisualTheme;
  effects: EffectsVisualTheme;
}

export type DeepPartial<T> = T extends readonly (infer Item)[]
  ? readonly DeepPartial<Item>[]
  : T extends object
    ? { readonly [Key in keyof T]?: DeepPartial<T[Key]> }
    : T;
