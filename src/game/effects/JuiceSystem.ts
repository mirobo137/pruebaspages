import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { EffectsVisualTheme } from '../../customization/ThemeTypes';
import {
  FULL_VISUAL_QUALITY,
  type VisualQualityProfile,
} from '../../customization/VisualQuality';
import { DEFAULT_VISUAL_THEME } from '../../customization/themes/defaultTheme';
import type { TimingGrade } from '../timing/TimingGrade';
import type { AudioFrame } from '../../audio/MusicSpectrum';
import { SILENT_AUDIO_FRAME } from '../../audio/MusicSpectrum';

interface ParticleEffect {
  node: Graphics;
  velocityX: number;
  velocityY: number;
  life: number;
  duration: number;
  gravity: number;
  rotationSpeed: number;
}

interface RingEffect {
  node: Graphics;
  life: number;
  duration: number;
  rotationSpeed: number;
}

type ParticleShape = 'dot' | 'diamond' | 'streak';

interface TextEffect {
  node: Text;
  life: number;
  duration: number;
}

const MAX_PARTICLES = 140;
const MAX_RINGS = 28;
const MAX_TEXTS = 12;

const floatingTextStyle = new TextStyle({
  fill: '#ffffff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 24,
  fontWeight: '900',
  align: 'center',
  dropShadow: {
    alpha: 0.55,
    blur: 5,
    color: '#000000',
    distance: 2,
  },
});

const announcementStyle = new TextStyle({
  fill: '#fff2a8',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 34,
  fontWeight: '900',
  letterSpacing: 3,
  align: 'center',
  dropShadow: {
    alpha: 0.8,
    blur: 10,
    color: '#6e4cff',
    distance: 0,
  },
});

export class JuiceSystem extends Container {
  private readonly musicGlow = new Graphics();
  private readonly flash = new Graphics();
  private readonly superFrame = new Graphics();
  private readonly particles: ParticleEffect[] = [];
  private readonly rings: RingEffect[] = [];
  private readonly texts: TextEffect[] = [];
  private viewportWidth = 1;
  private viewportHeight = 1;
  private flashColor: number;
  private flashStrength = 0;
  private shakeStrength = 0;
  private shakeX = 0;
  private shakeY = 0;
  private flowActive = false;
  private superFlowActive = false;
  private elapsed = 0;
  private musicFrame: AudioFrame = { ...SILENT_AUDIO_FRAME };
  private musicMacroIntensity = .35;
  private musicParticleElapsed = 0;
  private musicParticleSequence = 0;

  constructor(
    private readonly visualTheme: EffectsVisualTheme = DEFAULT_VISUAL_THEME.effects,
    private quality: VisualQualityProfile = FULL_VISUAL_QUALITY,
  ) {
    super();
    this.flashColor = visualTheme.highlight;
    this.eventMode = 'none';
    this.musicGlow.blendMode = 'add';
    this.flash.blendMode = 'add';
    this.superFrame.blendMode = 'add';
    this.addChild(this.musicGlow, this.flash, this.superFrame);
    this.setVisualQuality(quality);
  }

  setVisualQuality(quality: VisualQualityProfile): void {
    this.quality = quality;
    const enabled = quality.id !== 'minimal';
    this.flash.visible = enabled;
    this.superFrame.visible = enabled;
    this.musicGlow.visible = enabled;
    if (!enabled) {
      while (this.particles.length > 0) this.particles.pop()?.node.destroy();
      while (this.rings.length > 0) this.rings.pop()?.node.destroy();
    }
  }

  resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.redrawFlash();
    this.redrawSuperFrame();
    this.redrawMusicGlow();
  }

  setMusicFrame(frame: AudioFrame, macroIntensity: number): void {
    this.musicFrame = frame;
    this.musicMacroIntensity = Math.max(0, Math.min(1, macroIntensity));
  }

  emitTouch(x: number, y: number): void {
    const color = this.superFlowActive
      ? this.visualTheme.touchSuper
      : this.flowActive
        ? this.visualTheme.touchFlow
        : this.visualTheme.touch;
    this.createRing(x, y, color, 22, 0.22, 2);
  }

  emitDragSpark(x: number, y: number): void {
    const sparkCount = Math.max(1, Math.round(2 * this.quality.particleMultiplier));
    for (let index = 0; index < sparkCount; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      this.createParticle(
        x,
        y,
        this.superFlowActive
          ? (index % 2 === 0
              ? this.visualTheme.dragSuperPrimary
              : this.visualTheme.dragSuperSecondary)
          : this.flowActive
            ? this.visualTheme.dragFlow
            : this.visualTheme.drag,
        Math.cos(angle) * (18 + Math.random() * 28),
        Math.sin(angle) * (18 + Math.random() * 28),
        2 + Math.random() * 2,
        0.24,
        0,
      );
    }
  }

  emitImpact(x: number, y: number, grade: TimingGrade): void {
    const color = this.superFlowActive && grade !== 'miss'
      ? this.visualTheme.impactSuper
      : this.flowActive && grade !== 'miss'
        ? this.visualTheme.impactFlow
      : grade === 'perfect'
      ? this.visualTheme.perfect
      : grade === 'good'
        ? this.visualTheme.good
        : this.visualTheme.miss;
    const baseParticleCount = grade === 'perfect' ? 18 : grade === 'good' ? 12 : 8;
    const particleCount = Math.round(
      baseParticleCount
      * (this.superFlowActive ? 2.05 : this.flowActive ? 1.65 : 1)
      * this.quality.particleMultiplier,
    );
    const speedMultiplier = (grade === 'perfect' ? 1.25 : 1)
      * (this.superFlowActive ? 1.5 : this.flowActive ? 1.3 : 1);

    for (let index = 0; index < particleCount; index += 1) {
      const angle = (index / particleCount) * Math.PI * 2 + Math.random() * 0.28;
      const speed = (65 + Math.random() * 125) * speedMultiplier;
      this.createParticle(
        x,
        y,
        color,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        2 + Math.random() * 4,
        0.42 + Math.random() * 0.2,
        grade === 'miss' ? 100 : 45,
        this.superFlowActive && index % 3 === 0
          ? 'streak'
          : grade === 'perfect' && index % 4 === 0
            ? 'diamond'
            : 'dot',
        (Math.random() - 0.5) * 7,
      );
    }

    this.createRing(x, y, color, 32, grade === 'perfect' ? 0.5 : 0.38, 4);
    if (grade === 'perfect') {
      this.createRing(x, y, this.visualTheme.highlight, 20, 0.34, 2);
    }
    if (this.flowActive && grade !== 'miss') {
      this.createRing(
        x,
        y,
        this.superFlowActive
          ? this.visualTheme.superSecondary
          : this.visualTheme.impactFlowAccent,
        45,
        0.55,
        3,
      );
    }
    this.createFloatingText(x, y - 42, grade, color);

    this.flashColor = color;
    this.flashStrength = Math.max(
      this.flashStrength,
      this.superFlowActive
        ? 0.2
        : this.flowActive
          ? 0.15
          : grade === 'perfect'
            ? 0.11
            : grade === 'good'
              ? 0.06
              : 0.09,
    );
    this.shakeStrength = Math.max(
      this.shakeStrength,
      this.superFlowActive
        ? 8
        : this.flowActive
          ? 6.5
          : grade === 'perfect'
            ? 4.5
            : grade === 'miss'
              ? 5.5
              : 2.5,
    );
    this.redrawFlash();
  }

  emitComboMilestone(x: number, y: number, combo: number): void {
    const color = this.superFlowActive
      ? this.visualTheme.superPrimary
      : this.flowActive
        ? this.visualTheme.flowPrimary
        : this.visualTheme.highlight;
    const particleCount = Math.max(
      10,
      Math.round((combo >= 50 ? 24 : combo >= 25 ? 18 : 14)
        * this.quality.particleMultiplier),
    );
    for (let index = 0; index < particleCount; index += 1) {
      const angle = index * Math.PI * 2 / particleCount;
      const speed = 95 + (index % 4) * 18;
      this.createParticle(
        x,
        y,
        index % 2 === 0 ? color : this.visualTheme.highlight,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        index % 3 === 0 ? 4 : 2.5,
        0.58,
        20,
        index % 3 === 0 ? 'streak' : 'dot',
      );
    }
    this.createRing(x, y, color, 48, 0.72, 3.5);
    this.createRing(x, y, this.visualTheme.highlight, 72, 0.82, 1.5);
    this.flashColor = color;
    this.flashStrength = Math.max(this.flashStrength, combo >= 50 ? 0.18 : 0.11);
    this.shakeStrength = Math.max(this.shakeStrength, combo >= 50 ? 7 : 4.5);
    this.redrawFlash();
  }

  setFlowState(active: boolean, superActive = false): void {
    this.flowActive = active;
    this.superFlowActive = superActive;
  }

  emitFlowActivation(): void {
    const x = this.viewportWidth / 2;
    const y = this.viewportHeight * 0.48;
    const particleCount = Math.max(18, Math.round(34 * this.quality.particleMultiplier));

    for (let index = 0; index < particleCount; index += 1) {
      const angle = (index / particleCount) * Math.PI * 2;
      const speed = 125 + Math.random() * 180;
      this.createParticle(
        x,
        y,
        index % 2 === 0
          ? this.visualTheme.flowPrimary
          : this.visualTheme.flowSecondary,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        3 + Math.random() * 4,
        0.65 + Math.random() * 0.25,
        15,
        index % 4 === 0 ? 'diamond' : 'dot',
        (index % 2 === 0 ? 1 : -1) * (2 + Math.random() * 3),
      );
    }

    this.createRing(x, y, this.visualTheme.flowPrimary, 60, 0.75, 7);
    this.createRing(x, y, this.visualTheme.flowSecondary, 95, 0.9, 4);
    this.createArcRing(
      x,
      y,
      this.visualTheme.flowHighlight,
      128,
      0.95,
      2.5,
      1.8,
    );
    this.createAnnouncement(x, y - 52, 'MODO FLOW', this.visualTheme.flowText, 1.15);
    this.flashColor = this.visualTheme.flowPrimary;
    this.flashStrength = 0.24;
    this.shakeStrength = 11;
    this.redrawFlash();
  }

  emitFlowBreak(): void {
    this.createAnnouncement(
      this.viewportWidth / 2,
      this.viewportHeight * 0.48,
      'FLOW ROTO',
      this.visualTheme.flowBreak,
      0.85,
    );
    this.flashColor = this.visualTheme.flowBreakFlash;
    this.flashStrength = Math.max(this.flashStrength, 0.16);
    this.shakeStrength = Math.max(this.shakeStrength, 8);
    this.redrawFlash();
  }

  emitSuperFlowActivation(): void {
    const x = this.viewportWidth / 2;
    const y = this.viewportHeight * 0.48;
    const particleCount = Math.max(28, Math.round(52 * this.quality.particleMultiplier));

    for (let index = 0; index < particleCount; index += 1) {
      const angle = (index / particleCount) * Math.PI * 2;
      const speed = 170 + Math.random() * 260;
      this.createParticle(
        x,
        y,
        index % 2 === 0
          ? this.visualTheme.superPrimary
          : this.visualTheme.superSecondary,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        3 + Math.random() * 5,
        0.75 + Math.random() * 0.3,
        8,
        index % 3 === 0 ? 'streak' : index % 3 === 1 ? 'diamond' : 'dot',
        (index % 2 === 0 ? 1 : -1) * (4 + Math.random() * 5),
      );
    }

    this.createRing(x, y, this.visualTheme.highlight, 48, 0.65, 8);
    this.createRing(x, y, this.visualTheme.superPrimary, 82, 0.9, 6);
    this.createRing(x, y, this.visualTheme.superSecondary, 122, 1.1, 4);
    this.createArcRing(x, y, this.visualTheme.superPrimary, 154, 1.15, 3, 2.7);
    this.createArcRing(x, y, this.visualTheme.superSecondary, 188, 1.3, 2, -2.1);
    this.createAnnouncement(
      x,
      y - 60,
      'SUPER FLOW x4',
      this.visualTheme.superPrimary,
      1.45,
    );
    this.flashColor = this.visualTheme.superFlash;
    this.flashStrength = 0.34;
    this.shakeStrength = 14;
    this.redrawFlash();
  }

  emitSuperFlowDemotion(): void {
    this.createAnnouncement(
      this.viewportWidth / 2,
      this.viewportHeight * 0.44,
      'FLOW x2',
      this.visualTheme.demotionText,
      0.8,
    );
    this.flashColor = this.visualTheme.demotionFlash;
    this.flashStrength = Math.max(this.flashStrength, 0.14);
    this.shakeStrength = Math.max(this.shakeStrength, 5);
    this.redrawFlash();
  }

  emitPhaseTransition(phaseNumber: number, phaseName: string): void {
    const x = this.viewportWidth / 2;
    const y = this.viewportHeight * 0.42;
    const colors = this.visualTheme.phaseColors;
    const color = colors[Math.max(0, Math.min(colors.length - 1, phaseNumber - 1))];

    const particleCount = Math.max(10, Math.round(18 * this.quality.particleMultiplier));
    for (let index = 0; index < particleCount; index += 1) {
      const angle = (index / particleCount) * Math.PI * 2;
      const speed = 75 + Math.random() * 90;
      this.createParticle(
        x,
        y,
        color,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        2 + Math.random() * 3,
        0.55 + Math.random() * 0.2,
        12,
      );
    }

    this.createRing(x, y, color, 70, 0.75, 5);
    this.createAnnouncement(
      x,
      y - 36,
      'FASE ' + phaseNumber + ' · ' + phaseName,
      color,
      0.8,
    );
    this.flashColor = color;
    this.flashStrength = Math.max(this.flashStrength, phaseNumber === 3 ? 0.2 : 0.12);
    // Phase changes are informational, not impacts. Moving the playfield here
    // can be perceived as a missed touch even while input is protected.
    this.redrawFlash();
  }

  updateEffects(deltaSeconds: number): void {
    this.elapsed += deltaSeconds;
    const musicAmount = this.quality.id === 'minimal'
      ? 0
      : .62 + this.musicMacroIntensity * .48;
    this.musicGlow.alpha = this.musicFrame.volume * musicAmount
      * (this.quality.id === 'full' ? .19 : .115);
    this.musicParticleElapsed += deltaSeconds;
    const particleInterval = this.quality.id === 'full' ? .16 : .34;
    if (
      this.quality.id !== 'minimal'
      && this.musicFrame.highs * musicAmount >= .18
      && this.musicParticleElapsed >= particleInterval
    ) {
      this.musicParticleElapsed = 0;
      const fromLeft = this.musicParticleSequence++ % 2 === 0;
      const x = fromLeft ? this.viewportWidth * .07 : this.viewportWidth * .93;
      const y = this.viewportHeight * (.18 + (this.musicParticleSequence * .173) % .64);
      this.createParticle(
        x,
        y,
        this.visualTheme.highlight,
        fromLeft ? 18 : -18,
        -22,
        1.5,
        .5,
        8,
        'dot',
      );
    }
    this.flashStrength = Math.max(0, this.flashStrength - deltaSeconds * 0.55);
    this.flash.alpha = this.flashStrength;
    this.superFrame.alpha = this.superFlowActive
      ? 0.5 + Math.sin(this.elapsed * 10) * 0.16
      : this.flowActive
        ? 0.1 + Math.sin(this.elapsed * 4) * 0.035
        : Math.max(0, this.superFrame.alpha - deltaSeconds * 4);
    this.superFrame.tint = this.superFlowActive
      ? this.visualTheme.frameSuper
      : this.visualTheme.frameFlow;
    this.shakeStrength = Math.max(0, this.shakeStrength - deltaSeconds * 24);
    this.shakeX = (Math.random() * 2 - 1) * this.shakeStrength;
    this.shakeY = (Math.random() * 2 - 1) * this.shakeStrength;

    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      particle.life += deltaSeconds;
      particle.velocityY += particle.gravity * deltaSeconds;
      particle.node.x += particle.velocityX * deltaSeconds;
      particle.node.y += particle.velocityY * deltaSeconds;
      const remaining = Math.max(0, 1 - particle.life / particle.duration);
      particle.node.alpha = remaining;
      particle.node.scale.set(0.65 + remaining * 0.55);
      particle.node.rotation += particle.rotationSpeed * deltaSeconds;

      if (particle.life >= particle.duration) {
        particle.node.destroy();
        this.particles.splice(index, 1);
      }
    }

    for (let index = this.rings.length - 1; index >= 0; index -= 1) {
      const ring = this.rings[index];
      ring.life += deltaSeconds;
      const progress = Math.min(1, ring.life / ring.duration);
      ring.node.alpha = (1 - progress) * 0.9;
      ring.node.scale.set(0.75 + progress * 1.65);
      ring.node.rotation += ring.rotationSpeed * deltaSeconds;

      if (ring.life >= ring.duration) {
        ring.node.destroy();
        this.rings.splice(index, 1);
      }
    }

    for (let index = this.texts.length - 1; index >= 0; index -= 1) {
      const text = this.texts[index];
      text.life += deltaSeconds;
      const progress = Math.min(1, text.life / text.duration);
      text.node.y -= deltaSeconds * 34;
      text.node.alpha = 1 - progress;
      text.node.scale.set(0.85 + Math.sin(progress * Math.PI) * 0.22);

      if (text.life >= text.duration) {
        text.node.destroy();
        this.texts.splice(index, 1);
      }
    }
  }

  getShakeOffset(): { x: number; y: number } {
    return { x: this.shakeX, y: this.shakeY };
  }

  private createParticle(
    x: number,
    y: number,
    color: number,
    velocityX: number,
    velocityY: number,
    radius: number,
    duration: number,
    gravity: number,
    shape: ParticleShape = 'dot',
    rotationSpeed = 0,
  ): void {
    if (this.quality.id === 'minimal') return;
    while (this.particles.length >= MAX_PARTICLES) {
      const oldest = this.particles.shift();
      oldest?.node.destroy();
    }
    const node = new Graphics();
    shape = this.resolveParticleShape(shape);
    if (shape === 'streak') {
      node.roundRect(-radius * 3, -radius * 0.45, radius * 6, radius * 0.9, radius).fill({
        color,
      });
      node.rotation = Math.atan2(velocityY, velocityX);
    } else if (shape === 'diamond') {
      node.rect(-radius, -radius, radius * 2, radius * 2).fill({ color });
      node.rotation = Math.PI / 4;
    } else {
      node.circle(0, 0, radius).fill({ color });
    }
    node.position.set(x, y);
    node.blendMode = 'add';
    this.addChild(node);
    this.particles.push({
      node,
      velocityX,
      velocityY,
      life: 0,
      duration,
      gravity,
      rotationSpeed,
    });
  }

  private resolveParticleShape(shape: ParticleShape): ParticleShape {
    if (shape !== 'dot') return shape;
    if (this.visualTheme.particleStyle === 'spark') return 'streak';
    if (this.visualTheme.particleStyle === 'diamond') return 'diamond';
    return shape;
  }

  private createRing(
    x: number,
    y: number,
    color: number,
    radius: number,
    duration: number,
    width: number,
  ): void {
    if (this.quality.id === 'minimal') return;
    while (this.rings.length >= MAX_RINGS) {
      const oldest = this.rings.shift();
      oldest?.node.destroy();
    }
    const node = new Graphics();
    node.circle(0, 0, radius).stroke({ color, alpha: 0.9, width });
    node.position.set(x, y);
    node.blendMode = 'add';
    this.addChild(node);
    this.rings.push({ node, life: 0, duration, rotationSpeed: 0 });
  }

  private createArcRing(
    x: number,
    y: number,
    color: number,
    radius: number,
    duration: number,
    width: number,
    rotationSpeed: number,
  ): void {
    if (this.quality.id === 'minimal') return;
    while (this.rings.length >= MAX_RINGS) {
      const oldest = this.rings.shift();
      oldest?.node.destroy();
    }
    const node = new Graphics();
    for (let segment = 0; segment < 4; segment += 1) {
      const start = segment * Math.PI * 0.5 + 0.1;
      node.arc(0, 0, radius, start, start + Math.PI * 0.29).stroke({
        color,
        alpha: 0.9 - segment * 0.1,
        width,
      });
    }
    node.position.set(x, y);
    node.blendMode = 'add';
    this.addChild(node);
    this.rings.push({ node, life: 0, duration, rotationSpeed });
  }

  private createFloatingText(
    x: number,
    y: number,
    grade: TimingGrade,
    color: number,
  ): void {
    this.trimTexts();
    const label = grade === 'perfect' ? 'PERFECT' : grade === 'good' ? 'BIEN' : 'MISS';
    const node = new Text({ text: label, style: floatingTextStyle });
    node.style.fill = color;
    node.anchor.set(0.5);
    node.position.set(x, y);
    this.addChild(node);
    this.texts.push({ node, life: 0, duration: 0.7 });
  }

  private createAnnouncement(
    x: number,
    y: number,
    label: string,
    color: number,
    duration: number,
  ): void {
    this.trimTexts();
    const node = new Text({ text: label, style: announcementStyle });
    node.style.fill = color;
    node.anchor.set(0.5);
    node.position.set(x, y);
    node.scale.set(0.72);
    this.addChild(node);
    this.texts.push({ node, life: 0, duration });
  }

  private trimTexts(): void {
    while (this.texts.length >= MAX_TEXTS) {
      const oldest = this.texts.shift();
      oldest?.node.destroy();
    }
  }

  private redrawFlash(): void {
    this.flash.clear().rect(0, 0, this.viewportWidth, this.viewportHeight).fill({
      color: this.flashColor,
    });
    this.flash.alpha = this.flashStrength;
  }

  private redrawMusicGlow(): void {
    this.musicGlow.clear().rect(0, 0, this.viewportWidth, this.viewportHeight).fill({
      color: this.visualTheme.highlight,
    });
    this.musicGlow.alpha = 0;
  }

  private redrawSuperFrame(): void {
    const inset = 8;
    const corner = Math.min(54, Math.max(28, Math.min(this.viewportWidth, this.viewportHeight) * 0.09));
    this.superFrame.clear();
    this.superFrame.roundRect(
      inset,
      inset,
      Math.max(0, this.viewportWidth - inset * 2),
      Math.max(0, this.viewportHeight - inset * 2),
      20,
    ).stroke({ color: this.visualTheme.highlight, alpha: 0.52, width: 1.5 });
    this.superFrame.roundRect(
      inset + 5,
      inset + 5,
      Math.max(0, this.viewportWidth - (inset + 5) * 2),
      Math.max(0, this.viewportHeight - (inset + 5) * 2),
      15,
    ).stroke({ color: this.visualTheme.highlight, alpha: 0.2, width: 0.8 });
    const right = this.viewportWidth - inset;
    const bottom = this.viewportHeight - inset;
    for (const [x, y, directionX, directionY] of [
      [inset, inset, 1, 1],
      [right, inset, -1, 1],
      [right, bottom, -1, -1],
      [inset, bottom, 1, -1],
    ] as const) {
      this.superFrame.moveTo(x, y + directionY * corner).lineTo(x, y).lineTo(
        x + directionX * corner,
        y,
      ).stroke({ color: this.visualTheme.highlight, alpha: 0.92, width: 3 });
    }
    this.superFrame.alpha = this.superFlowActive ? 0.62 : this.flowActive ? 0.1 : 0;
  }
}
