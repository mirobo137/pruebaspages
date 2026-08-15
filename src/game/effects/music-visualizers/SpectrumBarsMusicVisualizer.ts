import { Container, Graphics } from 'pixi.js';
import type { MusicVisualizerStyle } from '../../../customization/ThemeTypes';
import type { VisualQualityProfile } from '../../../customization/VisualQuality';
import type { MusicVisualizer, MusicVisualizerFrame } from './MusicVisualizer';

const MAXIMUM_BAR_COUNT = 24;

/** Implementación M5. Puede reemplazarse desde la fábrica sin acoplarla al fondo. */
export class SpectrumBarsMusicVisualizer implements MusicVisualizer {
  readonly view = new Container();
  private readonly bars = new Container();
  private readonly wave = new Graphics();
  private viewportWidth = 1;
  private viewportHeight = 1;

  constructor(
    private readonly style: MusicVisualizerStyle,
    private quality: VisualQualityProfile,
  ) {
    this.view.eventMode = 'none';
    this.bars.blendMode = 'add';
    this.wave.blendMode = 'add';
    this.view.addChild(this.bars, this.wave);
    for (let index = 0; index < MAXIMUM_BAR_COUNT; index += 1) {
      this.bars.addChild(new Graphics());
    }
    this.applyVisibility();
  }

  resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    const barCount = this.visibleBarCount;
    const barWidth = Math.max(3, width / Math.max(1, barCount) * .58);
    for (let index = 0; index < this.bars.children.length; index += 1) {
      const bar = this.bars.children[index] as Graphics;
      bar.clear().roundRect(-barWidth / 2, -1, barWidth, 1, barWidth / 2).fill(0xffffff);
      bar.position.set((index + .5) / Math.max(1, barCount) * width, height * .94);
      bar.visible = this.barsEnabled && index < barCount;
      bar.scale.y = 1;
    }
    this.applyVisibility();
  }

  setVisualQuality(quality: VisualQualityProfile): void {
    if (quality.id === this.quality.id) return;
    this.quality = quality;
    this.resize(this.viewportWidth, this.viewportHeight);
  }

  update(frame: MusicVisualizerFrame): void {
    if (this.quality.id === 'minimal' || this.style === 'none') return;
    const spectrum = frame.audio.spectrum;
    const musicAmount = .62 + frame.macroIntensity * .48;
    const barCount = this.visibleBarCount;
    this.bars.alpha = spectrum.length > 0
      ? .14 + frame.audio.volume * musicAmount * .46
      : 0;
    for (let index = 0; index < this.bars.children.length; index += 1) {
      const bar = this.bars.children[index] as Graphics;
      bar.visible = this.barsEnabled && index < barCount;
      const spectrumIndex = Math.min(
        spectrum.length - 1,
        Math.floor(index / Math.max(1, barCount) * spectrum.length),
      );
      const value = spectrumIndex >= 0 ? spectrum[spectrumIndex] ?? 0 : 0;
      bar.scale.y = 6 + value * musicAmount * this.viewportHeight * .23;
      bar.tint = frame.superFlowIntensity > .1 ? frame.superColor : frame.phaseColor;
    }

    this.wave.clear();
    if (this.waveEnabled && spectrum.length > 0) {
      for (let index = 0; index < spectrum.length; index += 1) {
        const x = index / Math.max(1, spectrum.length - 1) * this.viewportWidth;
        const y = this.viewportHeight * .76
          - spectrum[index] * musicAmount * this.viewportHeight * .055;
        if (index === 0) this.wave.moveTo(x, y);
        else this.wave.lineTo(x, y);
      }
      this.wave.stroke({ color: frame.phaseColor, alpha: .3, width: 2 });
    }
  }

  private get visibleBarCount(): number {
    return this.quality.id === 'full' ? 24 : 16;
  }

  private get barsEnabled(): boolean {
    return this.style !== 'none' && this.quality.id !== 'minimal';
  }

  private get waveEnabled(): boolean {
    return this.style === 'spectrum-bars-line' && this.quality.id === 'full';
  }

  private applyVisibility(): void {
    this.view.visible = this.style !== 'none' && this.quality.id !== 'minimal';
    this.bars.visible = this.barsEnabled;
    this.wave.visible = this.waveEnabled;
  }
}
