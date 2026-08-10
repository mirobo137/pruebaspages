import { Container, Graphics } from 'pixi.js';

interface AmbientOrb {
  node: Graphics;
  normalizedX: number;
  normalizedY: number;
  phase: number;
  size: number;
}

const PHASE_COLORS = [0x83a7ff, 0xb58cff, 0xffbd69];

export class RhythmBackground extends Container {
  private readonly backdrop = new Graphics();
  private readonly flowOverlay = new Graphics();
  private readonly flowRays = new Graphics();
  private readonly grid = new Graphics();
  private readonly pulseRing = new Graphics();
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

  constructor() {
    super();
    this.eventMode = 'none';
    this.flowOverlay.blendMode = 'add';
    this.flowRays.blendMode = 'add';
    this.addChild(this.backdrop, this.flowOverlay, this.grid, this.flowRays, this.pulseRing);

    for (let index = 0; index < 12; index += 1) {
      const node = new Graphics();
      const size = 2 + (index % 4);
      node.circle(0, 0, size).fill({
        color: index % 2 === 0 ? 0x708bff : 0x56d8ff,
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
  }

  resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.backdrop.clear().rect(0, 0, width, height).fill({ color: 0x0b1022 });
    this.flowOverlay.clear().rect(0, 0, width, height).fill({ color: 0x7956d8 });

    this.flowRays.clear();
    const rayLength = Math.hypot(width, height);
    for (let index = 0; index < 18; index += 1) {
      const angle = (index / 18) * Math.PI * 2;
      this.flowRays.moveTo(width / 2, height / 2).lineTo(
        width / 2 + Math.cos(angle) * rayLength,
        height / 2 + Math.sin(angle) * rayLength,
      ).stroke({
        color: index % 2 === 0 ? 0xffd86a : 0xa477ff,
        alpha: 0.12,
        width: index % 2 === 0 ? 3 : 1,
      });
    }
    this.flowRays.pivot.set(width / 2, height / 2);
    this.flowRays.position.set(width / 2, height / 2);

    this.grid.clear();
    const spacing = Math.max(52, Math.min(width, height) / 7);
    for (let x = 0; x <= width; x += spacing) {
      this.grid.moveTo(x, 0).lineTo(x, height).stroke({
        color: 0x6174b8,
        alpha: 0.06,
        width: 1,
      });
    }
    for (let y = 0; y <= height; y += spacing) {
      this.grid.moveTo(0, y).lineTo(width, y).stroke({
        color: 0x6174b8,
        alpha: 0.06,
        width: 1,
      });
    }

    this.pulseRing.clear().circle(0, 0, Math.min(width, height) * 0.28).stroke({
      color: 0x7890ff,
      alpha: 0.12,
      width: 3,
    });
    this.pulseRing.position.set(width / 2, height / 2);
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
    this.phaseIndex = Math.max(0, Math.min(PHASE_COLORS.length - 1, phaseIndex));
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
    const phaseColor = PHASE_COLORS[this.phaseIndex];
    this.pulseRing.tint = this.superFlowIntensity > 0.1
      ? 0x8ffaff
      : this.flowIntensity > 0.1
        ? 0xffda76
        : phaseColor;
    this.grid.alpha = 0.65 + this.pulseEnergy * 0.35 + this.flowIntensity * 0.35;
    this.grid.tint = this.superFlowIntensity > 0.1
      ? 0xff83e6
      : this.flowIntensity > 0.1
        ? 0xc99cff
        : phaseColor;
    this.flowOverlay.alpha = this.flowIntensity
      * (0.055 + this.superFlowIntensity * 0.055 + Math.sin(this.elapsed * 8) * 0.018);
    this.flowOverlay.tint = this.superFlowIntensity > 0.1 ? 0x37d6ff : 0xffffff;
    this.flowRays.alpha = this.flowIntensity * (0.72 + this.superFlowIntensity * 0.28);
    this.flowRays.rotation += deltaSeconds * this.flowIntensity
      * (0.11 + this.superFlowIntensity * 0.18);
    this.flowRays.scale.set(
      1 + Math.sin(this.elapsed * (4 + this.superFlowIntensity * 4))
      * this.flowIntensity * (0.04 + this.superFlowIntensity * 0.035),
    );

    for (const orb of this.orbs) {
      orb.node.position.set(
        orb.normalizedX * this.viewportWidth
          + Math.sin(this.elapsed * (0.4 + this.flowIntensity * 0.55) + orb.phase) * 18,
        orb.normalizedY * this.viewportHeight
          + Math.cos(this.elapsed * (0.35 + this.flowIntensity * 0.55) + orb.phase) * 14,
      );
      const shimmer = 0.3 + Math.sin(this.elapsed * 2 + orb.phase) * 0.16;
      orb.node.alpha = shimmer + this.pulseEnergy * 0.3 + this.flowIntensity * 0.28;
      orb.node.scale.set(
        1 + this.pulseEnergy * 0.6 + orb.size * 0.02 + this.flowIntensity * 0.55,
      );
      orb.node.tint = this.superFlowIntensity > 0.1
        ? (orb.phase % 2 > 1 ? 0xff83e6 : 0x8ffaff)
        : this.flowIntensity > 0.1
          ? 0xffdc83
          : phaseColor;
    }
  }
}
