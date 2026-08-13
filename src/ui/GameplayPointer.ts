import { Container, Graphics } from 'pixi.js';

interface TrailPoint {
  x: number;
  y: number;
  life: number;
}

export class GameplayPointer extends Container {
  private readonly trail = new Graphics();
  private readonly cursorGlow = new Graphics();
  private readonly marker = new Graphics();
  private readonly points: TrailPoint[] = [];
  private enabled = false;
  private inside = false;
  private pulse = 0;

  constructor(primary: number, highlight: number) {
    super();
    this.eventMode = 'none';
    this.addChild(this.trail, this.cursorGlow, this.marker);
    this.cursorGlow.circle(0, 0, 15).fill({ color: primary, alpha: 0.1 });
    this.cursorGlow.circle(0, 0, 10).stroke({ color: primary, alpha: 0.3, width: 1 });
    this.marker.circle(0, 0, 7).stroke({ color: highlight, alpha: 0.9, width: 1.2 });
    this.marker.circle(0, 0, 2).fill({ color: highlight, alpha: 1 });
    this.cursorGlow.blendMode = 'add';
    this.marker.blendMode = 'add';
    this.visible = false;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.points.length = 0;
      this.visible = false;
    } else {
      this.visible = this.inside;
    }
  }

  setInside(inside: boolean): void {
    this.inside = inside;
    this.visible = this.enabled && inside;
    if (!inside) this.points.length = 0;
  }

  moveTo(x: number, y: number): void {
    this.position.set(x, y);
    if (!this.enabled) return;
    const previous = this.points[this.points.length - 1];
    if (!previous || Math.hypot(x - previous.x, y - previous.y) >= 5) {
      this.points.push({ x, y, life: 1 });
      if (this.points.length > 14) this.points.shift();
    }
  }

  press(): void {
    this.pulse = 1;
  }

  animate(deltaSeconds: number): void {
    if (!this.enabled) return;
    this.pulse = Math.max(0, this.pulse - deltaSeconds * 5);
    const scale = 1 + this.pulse * 0.45;
    this.cursorGlow.scale.set(scale);
    this.marker.scale.set(1 - this.pulse * 0.12);

    this.trail.clear();
    for (const point of this.points) point.life -= deltaSeconds * 4.2;
    while (this.points[0]?.life <= 0) this.points.shift();
    if (this.points.length < 2) return;

    // The trail lives in this container, whose origin follows the pointer.
    for (let index = 1; index < this.points.length; index += 1) {
      const previous = this.points[index - 1];
      const point = this.points[index];
      this.trail.moveTo(previous.x - this.x, previous.y - this.y)
        .lineTo(point.x - this.x, point.y - this.y)
        .stroke({ color: 0xffffff, alpha: point.life * 0.22, width: 1.2 });
    }
    this.trail.blendMode = 'add';
  }
}
