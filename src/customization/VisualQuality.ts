import { RENDER_PIXEL_BUDGET } from '../rendering/RenderResolutionPolicy';

export interface VisualQualityProfile {
  id: 'full' | 'reduced' | 'minimal';
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

export const MINIMAL_VISUAL_QUALITY: VisualQualityProfile = {
  id: 'minimal',
  particleMultiplier: 0,
  ambientOrbCount: 0,
  rayCount: 0,
  geometryDetail: 0,
};

interface NavigatorWithMemory extends Navigator {
  deviceMemory?: number;
}

export function detectVisualQuality(
  width: number,
  height: number,
  renderResolution = Math.min(window.devicePixelRatio || 1, 2),
): VisualQualityProfile {
  const memory = (navigator as NavigatorWithMemory).deviceMemory;
  const cores = navigator.hardwareConcurrency;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ?? false;
  const renderedPixels = width * height * renderResolution * renderResolution;
  const constrainedDevice = (memory !== undefined && memory <= 4)
    || (cores !== undefined && cores <= 4)
    || renderedPixels > RENDER_PIXEL_BUDGET;

  return reducedMotion || constrainedDevice
    ? REDUCED_VISUAL_QUALITY
    : FULL_VISUAL_QUALITY;
}
