export interface VisualQualityProfile {
  id: 'full' | 'reduced';
  particleMultiplier: number;
  ambientOrbCount: number;
  rayCount: number;
  geometryDetail: number;
}

export const FULL_VISUAL_QUALITY: VisualQualityProfile = {
  id: 'full',
  particleMultiplier: 1,
  ambientOrbCount: 18,
  rayCount: 18,
  geometryDetail: 1,
};

export const REDUCED_VISUAL_QUALITY: VisualQualityProfile = {
  id: 'reduced',
  particleMultiplier: 0.62,
  ambientOrbCount: 10,
  rayCount: 12,
  geometryDetail: 0.68,
};

interface NavigatorWithMemory extends Navigator {
  deviceMemory?: number;
}

export function detectVisualQuality(width: number, height: number): VisualQualityProfile {
  const memory = (navigator as NavigatorWithMemory).deviceMemory;
  const cores = navigator.hardwareConcurrency;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ?? false;
  const resolution = Math.min(window.devicePixelRatio || 1, 2);
  const renderedPixels = width * height * resolution * resolution;
  const constrainedDevice = (memory !== undefined && memory <= 4)
    || (cores !== undefined && cores <= 4)
    || renderedPixels > 4_800_000;

  return reducedMotion || constrainedDevice
    ? REDUCED_VISUAL_QUALITY
    : FULL_VISUAL_QUALITY;
}
