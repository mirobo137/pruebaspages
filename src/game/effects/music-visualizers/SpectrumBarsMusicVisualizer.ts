import { Container, Graphics } from 'pixi.js';
import type { MusicVisualizerStyle } from '../../../customization/ThemeTypes';
import type { VisualQualityProfile } from '../../../customization/VisualQuality';
import type { MusicVisualizer, MusicVisualizerFrame } from './MusicVisualizer';

const MAXIMUM_BAR_COUNT = 24;
const RING_COUNT = 5;

/** Implementación M5. Puede reemplazarse desde la fábrica sin acoplarla al fondo. */
export class SpectrumBarsMusicVisualizer implements MusicVisualizer {
  readonly view = new Container();
  private readonly bars = new Container();
  private readonly wave = new Graphics();
  private readonly rings = new Container();
  private readonly pulse = new Graphics();
  private viewportWidth = 1;
  private viewportHeight = 1;

  constructor(
    private readonly style: MusicVisualizerStyle,
    private quality: VisualQualityProfile,
  ) {
    this.view.eventMode = 'none';
    this.bars.blendMode = 'add';
    this.wave.blendMode = 'add';
    this.rings.blendMode = 'add';
    this.pulse.blendMode = 'add';
    this.view.addChild(this.bars, this.wave, this.rings, this.pulse);
    for (let index = 0; index < MAXIMUM_BAR_COUNT; index += 1) {
      this.bars.addChild(new Graphics());
    }
    for (let index = 0; index < RING_COUNT; index += 1) {
      this.rings.addChild(new Graphics());
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
    this.rings.position.set(width / 2, height * .73);
    for (let index = 0; index < this.rings.children.length; index += 1) {
      const ring = this.rings.children[index] as Graphics;
      const radius = Math.max(18, Math.min(width, height) * (.08 + index * .027));
      ring.clear().arc(0, 0, radius, -1.2, 1.05).stroke({
        color: 0xffffff,
        alpha: .42,
        width: Math.max(1.4, width / 220),
      });
      ring.visible = this.ringsEnabled;
      ring.scale.set(1);
    }
    this.pulse.position.set(width / 2, height * .73);
    const pulseRadius = Math.max(24, Math.min(width, height) * .14);
    this.pulse.clear().star(0, 0, 7, pulseRadius, pulseRadius * .42)
      .stroke({ color: 0xffffff, alpha: .5, width: Math.max(1.2, width / 240) });
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
      const heightMultiplier = this.style === 'spectrum-columns' ? .28 : .23;
      bar.scale.y = 6 + value * musicAmount * this.viewportHeight * heightMultiplier;
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

    if (this.ringsEnabled) {
      for (let index = 0; index < this.rings.children.length; index += 1) {
        const ring = this.rings.children[index] as Graphics;
        const spectrumIndex = Math.min(
          spectrum.length - 1,
          Math.floor((index + 1) / (this.rings.children.length + 1) * spectrum.length),
        );
        const value = spectrumIndex >= 0 ? spectrum[spectrumIndex] ?? 0 : 0;
        ring.scale.set(1 + value * (.08 + index * .018) + frame.audio.bass * .04);
        ring.alpha = .15 + value * .55 + frame.audio.volume * .2;
        ring.tint = frame.superFlowIntensity > .1
          ? frame.superColor
          : index % 2 === 0 ? frame.phaseColor : frame.superColor;
        ring.rotation += (frame.audio.bass * .08 + frame.audio.mids * .03)
          * (index % 2 === 0 ? 1 : -1);
      }
    }

    if (this.pulseEnabled) {
      const energy = frame.audio.bass * .72 + frame.audio.mids * .28;
      this.pulse.scale.set(1 + energy * (.18 + frame.macroIntensity * .1));
      this.pulse.alpha = .16 + energy * .7 + frame.audio.volume * .18;
      this.pulse.tint = frame.superFlowIntensity > .1 ? frame.superColor : frame.phaseColor;
      this.pulse.rotation += energy * .05;
    }
  }

  private get visibleBarCount(): number {
    if (this.style === 'spectrum-columns') return this.quality.id === 'full' ? 18 : 12;
    return this.quality.id === 'full' ? 24 : 16;
  }

  private get barsEnabled(): boolean {
    return (this.style === 'spectrum-bars-line'
      || this.style === 'spectrum-bars'
      || this.style === 'spectrum-columns')
      && this.quality.id !== 'minimal';
  }

  private get waveEnabled(): boolean {
    return this.style === 'spectrum-bars-line' && this.quality.id === 'full';
  }

  private get ringsEnabled(): boolean {
    return this.style === 'spectrum-rings' && this.quality.id !== 'minimal';
  }

  private get pulseEnabled(): boolean {
    return this.style === 'spectrum-pulse' && this.quality.id !== 'minimal';
  }

  private applyVisibility(): void {
    this.view.visible = this.style !== 'none' && this.quality.id !== 'minimal';
    this.bars.visible = this.barsEnabled;
    this.wave.visible = this.waveEnabled;
    this.rings.visible = this.ringsEnabled;
    this.pulse.visible = this.pulseEnabled;
  }
}
