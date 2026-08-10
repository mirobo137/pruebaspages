import { Container, Graphics } from 'pixi.js';
import { GAME_CONFIG } from '../config';
import type { NoteKind } from '../notes/NoteKind';

export interface TargetPoint {
  x: number;
  y: number;
}

export interface DragPointerResult {
  progress: number;
  valid: boolean;
  completed: boolean;
}

export interface TargetInteractionOptions {
  hitRadius: number;
  dragPathTolerance: number;
}

export class TargetNode extends Container {
  private readonly glow = new Graphics();
  private readonly approachRing = new Graphics();
  private readonly trail = new Graphics();
  private readonly progressTrail = new Graphics();
  private readonly destination = new Graphics();
  private readonly marker = new Graphics();
  private ageSeconds = 0;
  private earlyBump = 0;
  private pressed = false;
  private flowActive = false;
  private superFlowActive = false;
  private dragProgress = 0;
  private readonly dragVector: TargetPoint;

  constructor(
    readonly kind: NoteKind,
    dragEnd: TargetPoint | null = null,
    private readonly interaction: TargetInteractionOptions = {
      hitRadius: GAME_CONFIG.targetHitRadius,
      dragPathTolerance: GAME_CONFIG.dragPathTolerance,
    },
  ) {
    super();
    this.eventMode = 'none';
    this.dragVector = dragEnd ?? { x: 0, y: 0 };
    this.addChild(
      this.glow,
      this.approachRing,
      this.trail,
      this.progressTrail,
      this.destination,
      this.marker,
    );
    this.drawTarget();
    this.alpha = 0;
    this.scale.set(0.72);
  }

  animate(deltaSeconds: number): void {
    this.ageSeconds += deltaSeconds;
    this.earlyBump = Math.max(0, this.earlyBump - deltaSeconds * 5.5);
    const appearProgress = Math.min(1, this.ageSeconds / 0.14);
    const pulseSpeed = this.superFlowActive ? 19 : this.flowActive ? 14 : 9;
    const pulseStrength = this.superFlowActive ? 0.065 : this.flowActive ? 0.045 : 0.025;
    const pulse = 1 + Math.sin(this.ageSeconds * pulseSpeed) * pulseStrength;
    const pressScale = this.pressed ? 0.92 : 1;
    const earlyScale = 1 + this.earlyBump * 0.14;

    this.alpha = appearProgress;
    this.scale.set((0.72 + appearProgress * 0.28) * pulse);
    this.marker.scale.set(earlyScale * pressScale);
    this.glow.alpha = (this.superFlowActive ? 0.44 : this.flowActive ? 0.32 : 0.18)
      + Math.sin(this.ageSeconds * (this.superFlowActive ? 13 : this.flowActive ? 9 : 5))
      * 0.06;
    this.destination.alpha = this.kind === 'drag'
      ? 0.55 + Math.sin(this.ageSeconds * 7) * 0.2
      : 0;
  }

  updateTiming(timeUntilHit: number, leadTime: number, perfectWindow: number): void {
    const progress = Math.max(0, Math.min(1, 1 - timeUntilHit / leadTime));
    const approachScale = 1 + (1 - progress) * 1.35;
    this.approachRing.scale.set(approachScale);
    this.approachRing.alpha = 0.2 + progress * 0.72;

    if (Math.abs(timeUntilHit) <= perfectWindow) {
      this.approachRing.alpha = 1;
      this.marker.scale.set(
        (1 + Math.sin(this.ageSeconds * 22) * 0.055)
        * (this.pressed ? 0.92 : 1),
      );
    }
  }

  isHitAt(x: number, y: number, radiusBonus = 0): boolean {
    const origin = this.toGlobal({ x: 0, y: 0 });
    return Math.hypot(x - origin.x, y - origin.y)
      <= this.interaction.hitRadius + radiusBonus;
  }

  setPressed(pressed: boolean): void {
    this.pressed = pressed;
  }

  setFlowState(active: boolean, superActive = false): void {
    this.flowActive = active;
    this.superFlowActive = superActive;
    const primaryTint = superActive ? 0x8ffaff : active ? 0xffe78c : 0xffffff;
    const accentTint = superActive ? 0xff83e6 : primaryTint;
    this.marker.tint = primaryTint;
    this.approachRing.tint = accentTint;
    this.glow.tint = accentTint;
    this.progressTrail.tint = primaryTint;
    this.destination.tint = accentTint;
  }

  nudgeEarly(): void {
    this.earlyBump = 1;
  }

  updateDragFromPointer(
    globalX: number,
    globalY: number,
    toleranceBonus = 0,
    completionThreshold = 0.985,
  ): DragPointerResult {
    if (this.kind !== 'drag') {
      return { progress: 0, valid: false, completed: false };
    }

    const pointer = this.toLocal({ x: globalX, y: globalY });
    const lengthSquared = this.dragVector.x ** 2 + this.dragVector.y ** 2;
    if (lengthSquared <= 0) {
      return { progress: 0, valid: false, completed: false };
    }

    const rawProgress = (
      pointer.x * this.dragVector.x
      + pointer.y * this.dragVector.y
    ) / lengthSquared;
    const nearestX = this.dragVector.x * rawProgress;
    const nearestY = this.dragVector.y * rawProgress;
    const lateralDistance = Math.hypot(
      pointer.x - nearestX,
      pointer.y - nearestY,
    );
    const valid = lateralDistance <= this.interaction.dragPathTolerance + toleranceBonus
      && rawProgress >= -0.18;

    if (valid) {
      this.setDragProgress(Math.max(this.dragProgress, rawProgress));
    }

    return {
      progress: this.dragProgress,
      valid,
      completed: this.dragProgress >= completionThreshold,
    };
  }

  getFeedbackPoint(): TargetPoint {
    const point = this.toGlobal({
      x: this.dragVector.x * this.dragProgress,
      y: this.dragVector.y * this.dragProgress,
    });
    return { x: point.x, y: point.y };
  }

  get requiredDragDistance(): number {
    return Math.max(
      GAME_CONFIG.dragDistance,
      Math.hypot(this.dragVector.x, this.dragVector.y),
    );
  }

  private setDragProgress(progress: number): void {
    if (this.kind !== 'drag') return;

    this.dragProgress = Math.max(0, Math.min(1, progress));
    const markerX = this.dragVector.x * this.dragProgress;
    const markerY = this.dragVector.y * this.dragProgress;
    this.marker.position.set(markerX, markerY);
    this.approachRing.position.set(markerX, markerY);

    this.progressTrail.clear();
    this.progressTrail.moveTo(0, 0).lineTo(markerX, markerY).stroke({
      color: 0xc5f7ff,
      alpha: 0.95,
      width: 10,
    });
    this.progressTrail.blendMode = 'add';
  }

  private drawTarget(): void {
    const isDrag = this.kind === 'drag';
    const color = isDrag ? 0x56d8ff : 0xffd166;
    const outline = isDrag ? 0xc6f5ff : 0xfff3b0;

    this.glow.circle(0, 0, GAME_CONFIG.targetRadius + 18).fill({
      color,
      alpha: 0.2,
    });
    this.glow.blendMode = 'add';

    this.approachRing.circle(0, 0, GAME_CONFIG.targetRadius + 10).stroke({
      color: outline,
      alpha: 0.95,
      width: 3,
    });

    this.marker.circle(0, 0, GAME_CONFIG.targetRadius).fill({ color });
    this.marker.circle(0, 0, GAME_CONFIG.targetRadius - 7).stroke({
      color: 0xffffff,
      alpha: 0.74,
      width: 3,
    });
    this.marker.circle(0, 0, 5).fill({ color: 0xffffff, alpha: 0.9 });

    if (!isDrag) return;

    const angle = Math.atan2(this.dragVector.y, this.dragVector.x);
    const arrowX = this.dragVector.x * 0.66;
    const arrowY = this.dragVector.y * 0.66;

    this.trail.moveTo(0, 0).lineTo(this.dragVector.x, this.dragVector.y).stroke({
      color: 0x5f799b,
      alpha: 0.72,
      width: 13,
    });
    this.trail.moveTo(0, 0).lineTo(this.dragVector.x, this.dragVector.y).stroke({
      color: 0x8ee9ff,
      alpha: 0.38,
      width: 5,
    });
    this.destination.circle(this.dragVector.x, this.dragVector.y, 27).fill({
      color: 0x56d8ff,
      alpha: 0.12,
    });
    this.destination.circle(this.dragVector.x, this.dragVector.y, 27).stroke({
      color: 0xd7f8ff,
      alpha: 0.9,
      width: 4,
    });
    this.destination.circle(this.dragVector.x, this.dragVector.y, 9).stroke({
      color: 0xffffff,
      alpha: 0.9,
      width: 2,
    });
    this.trail.moveTo(arrowX, arrowY).lineTo(
      arrowX - Math.cos(angle - 0.5) * 18,
      arrowY - Math.sin(angle - 0.5) * 18,
    ).stroke({ color: 0xffffff, alpha: 0.8, width: 4 });
    this.trail.moveTo(arrowX, arrowY).lineTo(
      arrowX - Math.cos(angle + 0.5) * 18,
      arrowY - Math.sin(angle + 0.5) * 18,
    ).stroke({ color: 0xffffff, alpha: 0.8, width: 4 });
  }
}
