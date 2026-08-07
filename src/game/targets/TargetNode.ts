import { Graphics } from 'pixi.js';
import { GAME_CONFIG } from '../config';

export type TargetKind = 'tap' | 'danger';

export class TargetNode extends Graphics {
  private ageSeconds = 0;

  constructor(readonly kind: TargetKind) {
    super();
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.drawTarget();
    this.scale.set(0.5);
    this.alpha = 0;
  }

  animate(deltaSeconds: number): void {
    this.ageSeconds += deltaSeconds;
    const appearProgress = Math.min(1, this.ageSeconds / 0.18);
    const pulse = 1 + Math.sin(this.ageSeconds * 8) * 0.035;

    this.alpha = appearProgress;
    this.scale.set((0.5 + appearProgress * 0.5) * pulse);
  }

  isHitAt(x: number, y: number): boolean {
    return Math.hypot(x - this.x, y - this.y) <= GAME_CONFIG.targetHitRadius;
  }

  private drawTarget(): void {
    const isDanger = this.kind === 'danger';
    const color = isDanger ? 0xff5c77 : 0xffd166;
    const outline = isDanger ? 0xff9bad : 0xfff3b0;

    this.circle(0, 0, GAME_CONFIG.targetRadius).fill({ color });
    this.circle(0, 0, GAME_CONFIG.targetRadius + 12).stroke({
      color: outline,
      alpha: 0.35,
      width: 3,
    });

    if (isDanger) {
      this.moveTo(-10, -10).lineTo(10, 10).stroke({
        color: 0xffffff,
        alpha: 0.8,
        width: 4,
      });
      this.moveTo(10, -10).lineTo(-10, 10).stroke({
        color: 0xffffff,
        alpha: 0.8,
        width: 4,
      });
    }
  }
}
