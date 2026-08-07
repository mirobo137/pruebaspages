import { Graphics } from 'pixi.js';
import { GAME_CONFIG } from '../config';
import type { NoteKind } from '../notes/NoteKind';

export class TargetNode extends Graphics {
  private ageSeconds = 0;

  constructor(readonly kind: NoteKind) {
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

  setDragProgress(progress: number): void {
    if (this.kind === 'drag') {
      this.rotation = Math.max(0, Math.min(1, progress)) * Math.PI * 2;
    }
  }

  private drawTarget(): void {
    const isDanger = this.kind === 'danger';
    const isDrag = this.kind === 'drag';
    const color = isDanger ? 0xff5c77 : isDrag ? 0x56d8ff : 0xffd166;
    const outline = isDanger ? 0xff9bad : isDrag ? 0xb3f0ff : 0xfff3b0;

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

    if (isDrag) {
      this.circle(0, 0, 12).stroke({ color: 0xffffff, alpha: 0.85, width: 3 });
      this.moveTo(12, 0).lineTo(24, 0).stroke({
        color: 0xffffff,
        alpha: 0.85,
        width: 4,
      });
      this.moveTo(18, -6).lineTo(24, 0).lineTo(18, 6).stroke({
        color: 0xffffff,
        alpha: 0.85,
        width: 4,
      });
    }
  }
}
