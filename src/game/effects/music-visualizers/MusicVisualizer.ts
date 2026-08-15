import type { Container } from 'pixi.js';
import type { AudioFrame } from '../../../audio/MusicSpectrum';
import type { BackgroundVisualTheme } from '../../../customization/ThemeTypes';
import type { VisualQualityProfile } from '../../../customization/VisualQuality';
import { SpectrumBarsMusicVisualizer } from './SpectrumBarsMusicVisualizer';

export interface MusicVisualizerFrame {
  audio: AudioFrame;
  macroIntensity: number;
  phaseColor: number;
  superColor: number;
  superFlowIntensity: number;
}

/** Contrato estable para intercambiar visualizadores sin tocar RhythmBackground. */
export interface MusicVisualizer {
  readonly view: Container;
  resize(width: number, height: number): void;
  setVisualQuality(quality: VisualQualityProfile): void;
  update(frame: MusicVisualizerFrame): void;
}

export function createMusicVisualizer(
  theme: BackgroundVisualTheme,
  quality: VisualQualityProfile,
): MusicVisualizer {
  return new SpectrumBarsMusicVisualizer(
    theme.musicVisualizer.style,
    quality,
  );
}
