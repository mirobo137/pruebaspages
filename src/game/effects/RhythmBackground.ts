import { Container, Graphics } from 'pixi.js';
import type { BackgroundVisualTheme } from '../../customization/ThemeTypes';
import {
  FULL_VISUAL_QUALITY,
  type VisualQualityProfile,
} from '../../customization/VisualQuality';
import { DEFAULT_VISUAL_THEME } from '../../customization/themes/defaultTheme';

interface AmbientOrb {
  node: Graphics;
  normalizedX: number;
  normalizedY: number;
  phase: number;
  size: number;
}

export class RhythmBackground extends Container {
  private readonly backdrop = new Graphics();
  private readonly nebulaA = new Graphics();
  private readonly nebulaB = new Graphics();
  private readonly flowOverlay = new Graphics();
  private readonly flowRays = new Graphics();
  private readonly flowGeometry = new Graphics();
  private readonly superTunnel = new Graphics();
  private readonly grid = new Graphics();
  private readonly pulseRing = new Graphics();
  private readonly vignette = new Graphics();
  private readonly orbs: AmbientOrb[] = [];
  private viewportWidth = 1;
  private viewportHeight = 1;
  private elapsed = 0;
  private pulseEnergy = 0;
  private flowActive = false;
  private superFlowActive = false;
  private flowIntensity = 0;
  private superFlowIntensity = 0;
  private phaseIndex = 0;

  constructor(
    private readonly visualTheme: BackgroundVisualTheme = DEFAULT_VISUAL_THEME.background,
    private readonly quality: VisualQualityProfile = FULL_VISUAL_QUALITY,
  ) {
    super();
    this.eventMode = 'none';
    this.flowOverlay.blendMode = 'add';
    this.flowRays.blendMode = 'add';
    this.nebulaA.blendMode = 'add';
    this.nebulaB.blendMode = 'add';
    this.flowGeometry.blendMode = 'add';
    this.superTunnel.blendMode = 'add';
    this.addChild(
      this.backdrop,
      this.nebulaA,
      this.nebulaB,
      this.flowOverlay,
      this.grid,
      this.flowRays,
      this.flowGeometry,
      this.superTunnel,
      this.pulseRing,
    );

    for (let index = 0; index < this.quality.ambientOrbCount; index += 1) {
      const node = new Graphics();
      const size = 2 + (index % 4);
      node.circle(0, 0, size).fill({
        color: index % 2 === 0
          ? this.visualTheme.orbPrimary
          : this.visualTheme.orbSecondary,
      });
      node.blendMode = 'add';
      this.orbs.push({
        node,
        normalizedX: ((index * 37) % 100) / 100,
        normalizedY: ((index * 61 + 17) % 100) / 100,
        phase: index * 0.73,
        size,
      });
      this.addChild(node);
    }
    this.addChild(this.vignette);
  }

  resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.backdrop.clear().rect(0, 0, width, height).fill({
      color: this.visualTheme.backdrop,
    });
    this.flowOverlay.clear().rect(0, 0, width, height).fill({
      color: this.visualTheme.flowOverlay,
    });

    const longestSide = Math.max(width, height);
    this.drawNebula(this.nebulaA, longestSide * 0.5, this.visualTheme.nebulaBase);
    this.drawNebula(this.nebulaB, longestSide * 0.44, this.visualTheme.nebulaBase);

    this.flowRays.clear();
    const rayLength = Math.hypot(width, height);
    for (let index = 0; index < this.quality.rayCount; index += 1) {
      const angle = (index / this.quality.rayCount) * Math.PI * 2;
      this.flowRays.moveTo(width / 2, height / 2).lineTo(
        width / 2 + Math.cos(angle) * rayLength,
        height / 2 + Math.sin(angle) * rayLength,
      ).stroke({
        color: index % 2 === 0
          ? this.visualTheme.flowRayPrimary
          : this.visualTheme.flowRaySecondary,
        alpha: 0.12,
        width: index % 2 === 0 ? 3 : 1,
      });
    }
    this.flowRays.pivot.set(width / 2, height / 2);
    this.flowRays.position.set(width / 2, height / 2);

    const shortestSide = Math.min(width, height);
    this.flowGeometry.clear();
    this.drawFlowPattern(width, height, shortestSide);
    this.flowGeometry.position.set(width / 2, height / 2);

    this.superTunnel.clear();
    this.drawSuperFlowPattern(shortestSide);
    this.superTunnel.position.set(width / 2, height / 2);

    this.grid.clear();
    const spacing = Math.max(52, Math.min(width, height) / 7);
    for (let x = 0; x <= width; x += spacing) {
      this.grid.moveTo(x, 0).lineTo(x, height).stroke({
        color: this.visualTheme.grid,
        alpha: 0.06,
        width: 1,
      });
    }
    for (let y = 0; y <= height; y += spacing) {
      this.grid.moveTo(0, y).lineTo(width, y).stroke({
        color: this.visualTheme.grid,
        alpha: 0.06,
        width: 1,
      });
    }

    this.pulseRing.clear().circle(0, 0, Math.min(width, height) * 0.28).stroke({
      color: this.visualTheme.pulse,
      alpha: 0.12,
      width: 3,
    });
    this.pulseRing.position.set(width / 2, height / 2);

    const edgeDepth = Math.max(18, Math.min(width, height) * 0.08);
    this.vignette.clear();
    for (let layer = 0; layer < 4; layer += 1) {
      const depth = edgeDepth * (1 - layer * 0.2);
      const alpha = 0.055 + layer * 0.01;
      this.vignette.rect(0, 0, width, depth).fill({
        color: this.visualTheme.vignette,
        alpha,
      });
      this.vignette.rect(0, height - depth, width, depth).fill({
        color: this.visualTheme.vignette,
        alpha: alpha + 0.01,
      });
      this.vignette.rect(0, depth, depth, height - depth * 2).fill({
        color: this.visualTheme.vignette,
        alpha: alpha * 0.72,
      });
      this.vignette.rect(width - depth, depth, depth, height - depth * 2).fill({
        color: this.visualTheme.vignette,
        alpha: alpha * 0.72,
      });
    }
  }

  pulse(strength = 1): void {
    this.pulseEnergy = Math.max(this.pulseEnergy, strength);
  }

  setFlowState(active: boolean, superActive = false): void {
    if (active && !this.flowActive) this.pulse(1.5);
    if (superActive && !this.superFlowActive) this.pulse(2);
    this.flowActive = active;
    this.superFlowActive = superActive;
  }

  setPhase(phaseIndex: number, animate = true): void {
    this.phaseIndex = Math.max(
      0,
      Math.min(this.visualTheme.phasePrimary.length - 1, phaseIndex),
    );
    if (animate) this.pulse(1.25);
  }

  updateBackground(deltaSeconds: number): void {
    this.elapsed += deltaSeconds;
    const flowTarget = this.flowActive ? 1 : 0;
    const superFlowTarget = this.superFlowActive ? 1 : 0;
    this.flowIntensity += (flowTarget - this.flowIntensity)
      * Math.min(1, deltaSeconds * (this.flowActive ? 5 : 2.5));
    this.superFlowIntensity += (superFlowTarget - this.superFlowIntensity)
      * Math.min(1, deltaSeconds * (this.superFlowActive ? 7 : 3.5));
    this.pulseEnergy = Math.max(0, this.pulseEnergy - deltaSeconds * 2.6);
    const breathing = 1 + Math.sin(this.elapsed * (1.4 + this.flowIntensity * 3)) * 0.025;
    this.pulseRing.scale.set(
      breathing + this.pulseEnergy * 0.2 + this.flowIntensity * 0.08
      + this.superFlowIntensity * 0.12,
    );
    this.pulseRing.alpha = 0.2 + this.pulseEnergy * 0.38
      + this.flowIntensity * 0.35 + this.superFlowIntensity * 0.24;
    const phaseColor = this.visualTheme.phasePrimary[this.phaseIndex];
    this.pulseRing.tint = this.superFlowIntensity > 0.1
      ? this.visualTheme.superPrimary
      : this.flowIntensity > 0.1
        ? this.visualTheme.flowPulse
        : phaseColor;
    this.grid.alpha = 0.65 + this.pulseEnergy * 0.35 + this.flowIntensity * 0.35;
    this.grid.tint = this.superFlowIntensity > 0.1
      ? this.visualTheme.superSecondary
      : this.flowIntensity > 0.1
        ? this.visualTheme.flowGrid
        : phaseColor;
    this.flowOverlay.alpha = this.flowIntensity
      * (0.055 + this.superFlowIntensity * 0.055 + Math.sin(this.elapsed * 8) * 0.018);
    this.flowOverlay.tint = this.superFlowIntensity > 0.1
      ? this.visualTheme.superOverlayTint
      : this.visualTheme.flowOverlayTint;
    this.flowRays.alpha = this.flowIntensity * (0.72 + this.superFlowIntensity * 0.28);
    this.flowRays.rotation += deltaSeconds * this.flowIntensity
      * (0.11 + this.superFlowIntensity * 0.18);
    this.flowRays.scale.set(
      1 + Math.sin(this.elapsed * (4 + this.superFlowIntensity * 4))
      * this.flowIntensity * (0.04 + this.superFlowIntensity * 0.035),
    );
    this.nebulaA.position.set(
      this.viewportWidth * (0.18 + Math.sin(this.elapsed * 0.19) * 0.055),
      this.viewportHeight * (0.22 + Math.cos(this.elapsed * 0.16) * 0.045),
    );
    this.nebulaB.position.set(
      this.viewportWidth * (0.82 + Math.cos(this.elapsed * 0.15) * 0.05),
      this.viewportHeight * (0.74 + Math.sin(this.elapsed * 0.18) * 0.05),
    );
    this.nebulaA.alpha = 0.48 + this.flowIntensity * 0.24
      + this.superFlowIntensity * 0.2;
    this.nebulaB.alpha = 0.42 + this.flowIntensity * 0.22
      + this.superFlowIntensity * 0.25;
    this.nebulaA.tint = this.superFlowIntensity > 0.1
      ? this.visualTheme.superPrimary
      : phaseColor;
    this.nebulaB.tint = this.superFlowIntensity > 0.1
      ? this.visualTheme.superSecondary
      : this.visualTheme.phaseSecondary[this.phaseIndex];
    this.flowGeometry.alpha = this.flowIntensity
      * (0.38 + this.superFlowIntensity * 0.24);
    this.flowGeometry.rotation += deltaSeconds
      * (0.035 + this.flowIntensity * 0.08 + this.superFlowIntensity * 0.13);
    this.flowGeometry.scale.set(
      1 + Math.sin(this.elapsed * 2.2) * (0.015 + this.flowIntensity * 0.025),
    );
    this.superTunnel.alpha = this.superFlowIntensity
      * (0.52 + Math.sin(this.elapsed * 9) * 0.13);
    this.superTunnel.rotation -= deltaSeconds * this.superFlowIntensity * 0.24;
    this.superTunnel.scale.set(
      0.96 + Math.sin(this.elapsed * 5.5) * this.superFlowIntensity * 0.055,
    );

    for (const orb of this.orbs) {
      orb.node.position.set(
        orb.normalizedX * this.viewportWidth
          + Math.sin(this.elapsed * (0.4 + this.flowIntensity * 0.55) + orb.phase) * 18,
        orb.normalizedY * this.viewportHeight
          + Math.cos(this.elapsed * (0.35 + this.flowIntensity * 0.55) + orb.phase) * 14,
      );
      const orbX = orb.node.x - this.viewportWidth / 2;
      const orbY = orb.node.y - this.viewportHeight / 2;
      const shimmer = 0.3 + Math.sin(this.elapsed * 2 + orb.phase) * 0.16;
      orb.node.alpha = shimmer + this.pulseEnergy * 0.3 + this.flowIntensity * 0.28;
      const orbScale = 1 + this.pulseEnergy * 0.6 + orb.size * 0.02
        + this.flowIntensity * 0.55;
      orb.node.rotation = Math.atan2(orbY, orbX);
      orb.node.scale.set(
        orbScale * (1 + this.superFlowIntensity * 1.8),
        orbScale * (1 - this.superFlowIntensity * 0.28),
      );
      orb.node.tint = this.superFlowIntensity > 0.1
        ? (orb.phase % 2 > 1
            ? this.visualTheme.superSecondary
            : this.visualTheme.superPrimary)
        : this.flowIntensity > 0.1
          ? this.visualTheme.flowOrb
          : phaseColor;
    }
  }

  private drawNebula(graphics: Graphics, radius: number, color: number): void {
    graphics.clear();
    for (let layer = 3; layer >= 1; layer -= 1) {
      graphics.circle(0, 0, radius * layer / 3).fill({
        color,
        alpha: 0.014 + (4 - layer) * 0.012,
      });
    }
  }

  private drawFlowPattern(width: number, height: number, shortestSide: number): void {
    if (this.visualTheme.flowPattern === 'waves') {
      const samples = Math.max(18, Math.round(34 * this.quality.geometryDetail));
      for (let wave = 0; wave < 5; wave += 1) {
        for (let sample = 0; sample <= samples; sample += 1) {
          const progress = sample / samples;
          const x = (progress - 0.5) * width * 1.1;
          const y = (wave - 2) * height * 0.1
            + Math.sin(progress * Math.PI * 4 + wave * 0.8) * shortestSide * 0.055;
          if (sample === 0) this.flowGeometry.moveTo(x, y);
          else this.flowGeometry.lineTo(x, y);
        }
        this.flowGeometry.stroke({
          color: this.visualTheme.flowGeometry[wave % 3],
          alpha: 0.18 + wave * 0.045,
          width: wave === 2 ? 1.8 : 1.1,
        });
      }
      return;
    }

    if (this.visualTheme.flowPattern === 'vortex') {
      const arms = this.quality.id === 'reduced' ? 4 : 6;
      const samples = Math.max(20, Math.round(42 * this.quality.geometryDetail));
      for (let arm = 0; arm < arms; arm += 1) {
        for (let sample = 0; sample <= samples; sample += 1) {
          const progress = sample / samples;
          const radius = shortestSide * (0.08 + progress * 0.43);
          const angle = arm * Math.PI * 2 / arms + progress * Math.PI * 2.2;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          if (sample === 0) this.flowGeometry.moveTo(x, y);
          else this.flowGeometry.lineTo(x, y);
        }
        this.flowGeometry.stroke({
          color: this.visualTheme.flowGeometry[arm % 3],
          alpha: 0.3,
          width: arm % 2 === 0 ? 1.6 : 1,
        });
      }
      return;
    }

    this.drawPolygonRing(
      this.flowGeometry,
      shortestSide * 0.19,
      6,
      this.visualTheme.flowGeometry[0],
      0.42,
      1.4,
    );
    this.drawPolygonRing(
      this.flowGeometry,
      shortestSide * 0.31,
      8,
      this.visualTheme.flowGeometry[1],
      0.3,
      1.2,
    );
    this.drawPolygonRing(
      this.flowGeometry,
      shortestSide * 0.44,
      12,
      this.visualTheme.flowGeometry[2],
      0.2,
      1,
    );
  }

  private drawSuperFlowPattern(shortestSide: number): void {
    if (this.visualTheme.superFlowPattern === 'hyperspace') {
      const streaks = this.quality.id === 'reduced' ? 18 : 28;
      for (let streak = 0; streak < streaks; streak += 1) {
        const angle = streak / streaks * Math.PI * 2;
        const inner = shortestSide * (0.08 + (streak % 3) * 0.018);
        const outer = shortestSide * (0.38 + (streak % 5) * 0.024);
        this.superTunnel.moveTo(
          Math.cos(angle) * inner,
          Math.sin(angle) * inner,
        ).lineTo(
          Math.cos(angle) * outer,
          Math.sin(angle) * outer,
        ).stroke({
          color: streak % 2 === 0
            ? this.visualTheme.superPrimary
            : this.visualTheme.superSecondary,
          alpha: 0.18 + (streak % 4) * 0.045,
          width: streak % 3 === 0 ? 2.2 : 1,
        });
      }
      return;
    }

    if (this.visualTheme.superFlowPattern === 'prism') {
      const ringCount = this.quality.id === 'reduced' ? 4 : 6;
      for (let ring = 1; ring <= ringCount; ring += 1) {
        this.drawPolygonRing(
          this.superTunnel,
          shortestSide * (0.08 + ring * 0.065),
          ring % 2 === 0 ? 6 : 3,
          ring % 2 === 0
            ? this.visualTheme.superSecondary
            : this.visualTheme.superPrimary,
          0.38 - ring * 0.035,
          ring === 1 ? 2.2 : 1.2,
        );
      }
      return;
    }

    const ringCount = this.quality.id === 'reduced' ? 4 : 5;
    for (let ring = 1; ring <= ringCount; ring += 1) {
      this.superTunnel.circle(0, 0, shortestSide * (0.1 + ring * 0.085)).stroke({
        color: ring % 2 === 0
          ? this.visualTheme.superSecondary
          : this.visualTheme.superPrimary,
        alpha: 0.34 - ring * 0.035,
        width: ring === 1 ? 2 : 1.2,
      });
    }
  }

  private drawPolygonRing(
    graphics: Graphics,
    radius: number,
    sides: number,
    color: number,
    alpha: number,
    width: number,
  ): void {
    for (let side = 0; side <= sides; side += 1) {
      const angle = side / sides * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (side === 0) graphics.moveTo(x, y);
      else graphics.lineTo(x, y);
    }
    graphics.stroke({ color, alpha, width });
  }
}
