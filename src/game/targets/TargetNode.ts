import { Container, Graphics } from 'pixi.js';
import { GAME_CONFIG } from '../config';
import type { NoteKind } from '../notes/NoteKind';

export interface TargetPoint {
  x: number;
  y: number;
}

export class TargetNode extends Container {
  private readonly trail = new Graphics();
  private readonly marker = new Graphics();
  private ageSeconds = 0;
  private readonly dragVector: TargetPoint;

  constructor(
    readonly kind: NoteKind,
    dragEnd: TargetPoint | null = null,
  ) {
    super();
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.dragVector = dragEnd ?? { x: 0, y: 0 };
    this.addChild(this.trail, this.marker);
    this.drawTarget();
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
    if (this.kind !== 'drag') return;

    const safeProgress = Math.max(0, Math.min(1, progress));
    this.marker.position.set(
      this.dragVector.x * safeProgress,
      this.dragVector.y * safeProgress,
    );
  }

  get requiredDragDistance(): number {
    return Math.max(GAME_CONFIG.dragDistance, Math.hypot(
      this.dragVector.x,
      this.dragVector.y,
    ));
  }

  private drawTarget(): void {
    const isDrag = this.kind === 'drag';
    const color = isDrag ? 0x56d8ff : 0xffd166;
    const outline = isDrag ? 0xb3f0ff : 0xfff3b0;

    this.marker.circle(0, 0, GAME_CONFIG.targetRadius).fill({ color });
    this.marker.circle(0, 0, GAME_CONFIG.targetRadius + 12).stroke({
      color: outline,
      alpha: 0.35,
      width: 3,
    });

    if (!isDrag) return;

    const distance = Math.hypot(this.dragVector.x, this.dragVector.y);
    const angle = Math.atan2(this.dragVector.y, this.dragVector.x);
    const arrowX = this.dragVector.x * 0.72;
    const arrowY = this.dragVector.y * 0.72;

    this.trail.moveTo(0, 0).lineTo(this.dragVector.x, this.dragVector.y).stroke({
      color: 0x8ee9ff,
      alpha: 0.55,
      width: 8,
    });
    this.trail.circle(this.dragVector.x, this.dragVector.y, 24).stroke({
      color: 0xd7f8ff,
      alpha: 0.75,
      width: 3,
    });
    this.trail.moveTo(arrowX, arrowY).lineTo(
      arrowX - Math.cos(angle - 0.5) * 18,
      arrowY - Math.sin(angle - 0.5) * 18,
    ).stroke({ color: 0xffffff, alpha: 0.85, width: 4 });
    this.trail.moveTo(arrowX, arrowY).lineTo(
      arrowX - Math.cos(angle + 0.5) * 18,
      arrowY - Math.sin(angle + 0.5) * 18,
    ).stroke({ color: 0xffffff, alpha: 0.85, width: 4 });
    this.trail.alpha = Math.min(1, distance / GAME_CONFIG.dragDistance);
  }
}
