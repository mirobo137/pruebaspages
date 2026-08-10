import { Container, Graphics } from 'pixi.js';

interface NeonSpark {
  node: Graphics;
  normalizedX: number;
  normalizedY: number;
  phase: number;
  speed: number;
}

export class NeonTitleBackdrop extends Container {
  private readonly backdrop = new Graphics();
  private readonly auroraCyan = new Graphics();
  private readonly auroraMagenta = new Graphics();
  private readonly perspectiveGrid = new Graphics();
  private readonly horizonGlow = new Graphics();
  private readonly orbitalA = new Graphics();
  private readonly orbitalB = new Graphics();
  private readonly pulseRing = new Graphics();
  private readonly scanLines = new Graphics();
  private readonly vignette = new Graphics();
  private readonly sparks: NeonSpark[] = [];
  private viewportWidth = 1;
  private viewportHeight = 1;
  private elapsed = 0;
  private impactEnergy = 0;

  constructor() {
    super();
    this.eventMode = 'none';
    this.auroraCyan.blendMode = 'add';
    this.auroraMagenta.blendMode = 'add';
    this.horizonGlow.blendMode = 'add';
    this.orbitalA.blendMode = 'add';
    this.orbitalB.blendMode = 'add';
    this.pulseRing.blendMode = 'add';

    this.addChild(
      this.backdrop,
      this.auroraCyan,
      this.auroraMagenta,
      this.perspectiveGrid,
      this.horizonGlow,
      this.orbitalA,
      this.orbitalB,
      this.pulseRing,
    );

    for (let index = 0; index < 26; index += 1) {
      const node = new Graphics();
      const radius = index % 5 === 0 ? 2 : 1;
      node.circle(0, 0, radius).fill({
        color: index % 3 === 0 ? 0xff5bd8 : 0x6ef5ff,
        alpha: 0.9,
      });
      node.blendMode = 'add';
      this.sparks.push({
        node,
        normalizedX: ((index * 47 + 11) % 101) / 100,
        normalizedY: ((index * 67 + 29) % 103) / 102,
        phase: index * 0.77,
        speed: 0.007 + (index % 5) * 0.002,
      });
      this.addChild(node);
    }

    this.addChild(this.scanLines, this.vignette);
  }

  resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    const shortestSide = Math.min(width, height);
    const longestSide = Math.max(width, height);
    const focalY = height * 0.38;
    const horizonY = height * 0.64;

    this.backdrop.clear().rect(0, 0, width, height).fill({ color: 0x050817 });

    this.drawAurora(this.auroraCyan, longestSide * 0.52, 0x16d9ff);
    this.drawAurora(this.auroraMagenta, longestSide * 0.46, 0xff2fcf);

    this.perspectiveGrid.clear();
    for (let index = -9; index <= 9; index += 1) {
      const bottomX = width / 2 + index * width * 0.13;
      this.perspectiveGrid
        .moveTo(width / 2 + index * 3, horizonY)
        .lineTo(bottomX, height)
        .stroke({ color: 0x4b7dca, alpha: 0.14, width: 1 });
    }
    for (let row = 0; row < 10; row += 1) {
      const progress = row / 9;
      const y = horizonY + progress * progress * (height - horizonY);
      this.perspectiveGrid
        .moveTo(0, y)
        .lineTo(width, y)
        .stroke({ color: row % 2 === 0 ? 0x6555ca : 0x247ca8, alpha: 0.12, width: 1 });
    }

    this.horizonGlow.clear();
    for (let layer = 0; layer < 5; layer += 1) {
      this.horizonGlow
        .moveTo(0, horizonY)
        .lineTo(width, horizonY)
        .stroke({
          color: layer % 2 === 0 ? 0x55eaff : 0xff4bd8,
          alpha: 0.12 - layer * 0.018,
          width: 1 + layer * 4,
        });
    }

    this.orbitalA.clear();
    this.orbitalA.arc(0, 0, shortestSide * 0.35, -2.65, 0.42).stroke({
      color: 0x5cf4ff,
      alpha: 0.48,
      width: 1.5,
    });
    this.orbitalA.arc(0, 0, shortestSide * 0.27, 0.7, 2.55).stroke({
      color: 0xff55d6,
      alpha: 0.32,
      width: 1,
    });
    this.orbitalA.position.set(width / 2, focalY);

    this.orbitalB.clear();
    this.drawPolygon(this.orbitalB, shortestSide * 0.29, 6, 0x8f78ff, 0.2);
    this.drawPolygon(this.orbitalB, shortestSide * 0.39, 8, 0x4eeeff, 0.11);
    this.orbitalB.position.set(width / 2, focalY);

    this.pulseRing.clear().circle(0, 0, shortestSide * 0.2).stroke({
      color: 0xffffff,
      alpha: 0.24,
      width: 2,
    });
    this.pulseRing.position.set(width / 2, focalY);

    this.scanLines.clear();
    for (let y = 0; y < height; y += 7) {
      this.scanLines.rect(0, y, width, 1).fill({ color: 0x8db7ff, alpha: 0.018 });
    }

    const edge = Math.max(24, shortestSide * 0.12);
    this.vignette.clear();
    for (let layer = 0; layer < 4; layer += 1) {
      const depth = edge * (1 - layer * 0.18);
      const alpha = 0.05 + layer * 0.025;
      this.vignette.rect(0, 0, width, depth).fill({ color: 0x01020a, alpha });
      this.vignette.rect(0, height - depth, width, depth).fill({ color: 0x01020a, alpha: alpha + 0.03 });
      this.vignette.rect(0, depth, depth, height - depth * 2).fill({ color: 0x01020a, alpha: alpha * 0.7 });
      this.vignette.rect(width - depth, depth, depth, height - depth * 2).fill({ color: 0x01020a, alpha: alpha * 0.7 });
    }
  }

  activate(): void {
    this.impactEnergy = 1;
  }

  updateBackdrop(deltaSeconds: number): void {
    this.elapsed += deltaSeconds;
    this.impactEnergy = Math.max(0, this.impactEnergy - deltaSeconds * 2.4);

    this.auroraCyan.position.set(
      this.viewportWidth * (0.13 + Math.sin(this.elapsed * 0.19) * 0.035),
      this.viewportHeight * (0.2 + Math.cos(this.elapsed * 0.16) * 0.025),
    );
    this.auroraMagenta.position.set(
      this.viewportWidth * (0.87 + Math.cos(this.elapsed * 0.17) * 0.035),
      this.viewportHeight * (0.54 + Math.sin(this.elapsed * 0.14) * 0.03),
    );
    this.auroraCyan.alpha = 0.68 + Math.sin(this.elapsed * 0.8) * 0.08;
    this.auroraMagenta.alpha = 0.6 + Math.cos(this.elapsed * 0.73) * 0.08;

    this.orbitalA.rotation += deltaSeconds * 0.055;
    this.orbitalB.rotation -= deltaSeconds * 0.035;
    this.orbitalA.alpha = 0.68 + Math.sin(this.elapsed * 1.4) * 0.16;
    this.orbitalB.alpha = 0.72 + Math.cos(this.elapsed * 1.1) * 0.12;
    const ringScale = 1 + Math.sin(this.elapsed * 2.1) * 0.025 + this.impactEnergy * 0.22;
    this.pulseRing.scale.set(ringScale);
    this.pulseRing.alpha = 0.28 + Math.sin(this.elapsed * 2.1) * 0.08 + this.impactEnergy * 0.55;
    this.perspectiveGrid.alpha = 0.72 + Math.sin(this.elapsed * 0.7) * 0.12;
    this.horizonGlow.alpha = 0.72 + Math.sin(this.elapsed * 1.6) * 0.16;

    for (const spark of this.sparks) {
      const normalizedY = (spark.normalizedY - this.elapsed * spark.speed + 1) % 1;
      spark.node.position.set(
        spark.normalizedX * this.viewportWidth + Math.sin(this.elapsed * 0.45 + spark.phase) * 8,
        normalizedY * this.viewportHeight,
      );
      const shimmer = 0.25 + (Math.sin(this.elapsed * 2.4 + spark.phase) + 1) * 0.22;
      spark.node.alpha = shimmer + this.impactEnergy * 0.25;
      const scale = 0.75 + shimmer * 0.65 + this.impactEnergy * 0.6;
      spark.node.scale.set(scale, scale * (1 + this.impactEnergy * 1.4));
    }
  }

  private drawAurora(graphics: Graphics, radius: number, color: number): void {
    graphics.clear();
    for (let layer = 5; layer >= 1; layer -= 1) {
      graphics.circle(0, 0, radius * layer / 5).fill({
        color,
        alpha: 0.009 + (6 - layer) * 0.009,
      });
    }
  }

  private drawPolygon(
    graphics: Graphics,
    radius: number,
    sides: number,
    color: number,
    alpha: number,
  ): void {
    for (let side = 0; side <= sides; side += 1) {
      const angle = side / sides * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (side === 0) graphics.moveTo(x, y);
      else graphics.lineTo(x, y);
    }
    graphics.stroke({ color, alpha, width: 1 });
  }
}
