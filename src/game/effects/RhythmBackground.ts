import { Container, Graphics } from 'pixi.js';

interface AmbientOrb {
  node: Graphics;
  normalizedX: number;
  normalizedY: number;
  phase: number;
  size: number;
}

export class RhythmBackground extends Container {
  private readonly backdrop = new Graphics();
  private readonly grid = new Graphics();
  private readonly pulseRing = new Graphics();
  private readonly orbs: AmbientOrb[] = [];
  private viewportWidth = 1;
  private viewportHeight = 1;
  private elapsed = 0;
  private pulseEnergy = 0;

  constructor() {
    super();
    this.eventMode = 'none';
    this.addChild(this.backdrop, this.grid, this.pulseRing);

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

  updateBackground(deltaSeconds: number): void {
    this.elapsed += deltaSeconds;
    this.pulseEnergy = Math.max(0, this.pulseEnergy - deltaSeconds * 2.6);
    const breathing = 1 + Math.sin(this.elapsed * 1.4) * 0.025;
    this.pulseRing.scale.set(breathing + this.pulseEnergy * 0.2);
    this.pulseRing.alpha = 0.2 + this.pulseEnergy * 0.38;
    this.grid.alpha = 0.65 + this.pulseEnergy * 0.35;

    for (const orb of this.orbs) {
      orb.node.position.set(
        orb.normalizedX * this.viewportWidth
          + Math.sin(this.elapsed * 0.4 + orb.phase) * 18,
        orb.normalizedY * this.viewportHeight
          + Math.cos(this.elapsed * 0.35 + orb.phase) * 14,
      );
      const shimmer = 0.3 + Math.sin(this.elapsed * 2 + orb.phase) * 0.16;
      orb.node.alpha = shimmer + this.pulseEnergy * 0.3;
      orb.node.scale.set(1 + this.pulseEnergy * 0.6 + orb.size * 0.02);
    }
  }
}
