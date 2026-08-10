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
  private readonly shadow = new Graphics();
  private readonly glow = new Graphics();
  private readonly approachRing = new Graphics();
  private readonly goodTimingRing = new Graphics();
  private readonly perfectTimingRing = new Graphics();
  private readonly trail = new Graphics();
  private readonly progressTrail = new Graphics();
  private readonly destination = new Graphics();
  private readonly marker = new Graphics();
  private readonly stateAccent = new Graphics();
  private ageSeconds = 0;
  private earlyBump = 0;
  private pressed = false;
  private flowActive = false;
  private superFlowActive = false;
  private dragProgress = 0;
  private timingState: 'approach' | 'good' | 'perfect' = 'approach';
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
      this.trail,
      this.progressTrail,
      this.destination,
      this.shadow,
      this.glow,
      this.approachRing,
      this.goodTimingRing,
      this.perfectTimingRing,
      this.marker,
      this.stateAccent,
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
    const timingScale = this.timingState === 'perfect'
      ? 1 + Math.sin(this.ageSeconds * 24) * 0.045
      : this.timingState === 'good'
        ? 1 + Math.sin(this.ageSeconds * 16) * 0.018
        : 1;

    this.alpha = appearProgress;
    this.scale.set((0.72 + appearProgress * 0.28) * pulse);
    this.marker.scale.set(earlyScale * pressScale * timingScale);
    this.stateAccent.scale.set(earlyScale * pressScale * timingScale);
    this.shadow.scale.set(pressScale);
    this.glow.alpha = (this.superFlowActive ? 0.44 : this.flowActive ? 0.32 : 0.18)
      + Math.sin(this.ageSeconds * (this.superFlowActive ? 13 : this.flowActive ? 9 : 5))
      * 0.06;
    this.goodTimingRing.scale.set(1 + Math.sin(this.ageSeconds * 12) * 0.018);
    this.perfectTimingRing.scale.set(1 + Math.sin(this.ageSeconds * 22) * 0.025);
    this.destination.alpha = this.kind === 'drag'
      ? 0.5 + Math.sin(this.ageSeconds * 6) * 0.16
      : 0;
  }

  updateTiming(
    timeUntilHit: number,
    leadTime: number,
    perfectWindow: number,
    goodWindow: number,
  ): void {
    const progress = Math.max(0, Math.min(1, 1 - timeUntilHit / leadTime));
    const approachScale = 1 + (1 - progress) * 1.42;
    const absoluteTime = Math.abs(timeUntilHit);
    const inPerfectWindow = absoluteTime <= perfectWindow;
    const inGoodWindow = absoluteTime <= goodWindow;
    this.approachRing.scale.set(approachScale);
    this.approachRing.alpha = inGoodWindow ? 0.18 : 0.18 + progress * 0.68;
    this.timingState = inPerfectWindow
      ? 'perfect'
      : inGoodWindow
        ? 'good'
        : 'approach';
    this.goodTimingRing.alpha = inPerfectWindow ? 0.34 : inGoodWindow ? 0.92 : 0.1;
    this.perfectTimingRing.alpha = inPerfectWindow ? 1 : inGoodWindow ? 0.24 : 0.07;
  }

  isHitAt(x: number, y: number, radiusBonus = 0): boolean {
    const origin = this.toGlobal({ x: 0, y: 0 });
    return Math.hypot(x - origin.x, y - origin.y)
      <= this.interaction.hitRadius + radiusBonus;
  }

  setPressed(pressed: boolean): void {
    this.pressed = pressed;
  }

  resetInteraction(): void {
    this.pressed = false;
    if (this.kind === 'drag') this.setDragProgress(0);
  }

  setFlowState(active: boolean, superActive = false): void {
    this.flowActive = active;
    this.superFlowActive = superActive;
    const primaryTint = superActive ? 0x8ffaff : active ? 0xffe78c : 0xffffff;
    const accentTint = superActive ? 0xff83e6 : primaryTint;
    this.approachRing.tint = accentTint;
    this.glow.tint = accentTint;
    this.stateAccent.tint = accentTint;
    this.stateAccent.alpha = superActive ? 0.95 : active ? 0.72 : 0.42;
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
    for (const node of [
      this.shadow,
      this.glow,
      this.marker,
      this.stateAccent,
      this.approachRing,
      this.goodTimingRing,
      this.perfectTimingRing,
    ]) {
      node.position.set(markerX, markerY);
    }

    this.progressTrail.clear();
    this.progressTrail.moveTo(0, 0).lineTo(markerX, markerY).stroke({
      color: 0x68e5ff,
      alpha: 0.24,
      width: 7,
    });
    this.progressTrail.moveTo(0, 0).lineTo(markerX, markerY).stroke({
      color: 0xc5f7ff,
      alpha: 0.92,
      width: 2.5,
    });
    this.progressTrail.blendMode = 'add';
  }

  private drawTarget(): void {
    const isDrag = this.kind === 'drag';
    const color = isDrag ? 0x56d8ff : 0xffd166;
    const outline = isDrag ? 0xc6f5ff : 0xfff3b0;

    this.shadow.circle(2, 5, GAME_CONFIG.targetRadius + 3).fill({
      color: 0x02040c,
      alpha: 0.5,
    });
    this.shadow.circle(0, 1, GAME_CONFIG.targetRadius + 1).stroke({
      color: 0x000000,
      alpha: 0.5,
      width: 2,
    });

    this.glow.circle(0, 0, GAME_CONFIG.targetRadius + 17).fill({
      color,
      alpha: 0.1,
    });
    this.glow.circle(0, 0, GAME_CONFIG.targetRadius + 9).fill({
      color,
      alpha: 0.12,
    });
    this.glow.blendMode = 'add';

    this.approachRing.circle(0, 0, GAME_CONFIG.targetRadius + 11).stroke({
      color: outline,
      alpha: 0.86,
      width: 1.75,
    });
    this.goodTimingRing.circle(0, 0, GAME_CONFIG.targetRadius + 6).stroke({
      color: 0xffbd67,
      alpha: 0.95,
      width: 2,
    });
    this.perfectTimingRing.circle(0, 0, GAME_CONFIG.targetRadius + 2).stroke({
      color: 0x74f6c1,
      alpha: 1,
      width: 1.6,
    });
    this.goodTimingRing.alpha = 0.1;
    this.perfectTimingRing.alpha = 0.07;

    this.marker.circle(0, 0, GAME_CONFIG.targetRadius).fill({
      color: 0x11182b,
      alpha: 0.98,
    });
    this.marker.circle(0, 0, GAME_CONFIG.targetRadius - 1.5).fill({
      color,
      alpha: 0.9,
    });
    this.marker.circle(0, 0, GAME_CONFIG.targetRadius - 7).fill({
      color: 0x0a1020,
      alpha: 0.2,
    });
    this.marker.circle(0, 0, GAME_CONFIG.targetRadius - 7).stroke({
      color: 0xffffff,
      alpha: 0.48,
      width: 1.25,
    });
    this.marker.arc(
      0,
      0,
      GAME_CONFIG.targetRadius - 4,
      Math.PI * 1.08,
      Math.PI * 1.76,
    ).stroke({
      color: 0xffffff,
      alpha: 0.72,
      width: 2,
    });
    this.marker.circle(-8, -9, 3.5).fill({ color: 0xffffff, alpha: 0.42 });
    this.marker.circle(0, 0, 4).fill({ color: 0xffffff, alpha: 0.9 });
    this.stateAccent.circle(0, 0, GAME_CONFIG.targetRadius - 3).stroke({
      color: 0xffffff,
      alpha: 0.8,
      width: 1.4,
    });
    this.stateAccent.blendMode = 'add';

    if (!isDrag) return;

    const angle = Math.atan2(this.dragVector.y, this.dragVector.x);
    const arrowX = this.dragVector.x * 0.66;
    const arrowY = this.dragVector.y * 0.66;

    this.trail.moveTo(0, 0).lineTo(this.dragVector.x, this.dragVector.y).stroke({
      color: 0x24344e,
      alpha: 0.62,
      width: 7,
    });
    this.trail.moveTo(0, 0).lineTo(this.dragVector.x, this.dragVector.y).stroke({
      color: 0x8ee9ff,
      alpha: 0.68,
      width: 1.75,
    });
    for (let step = 1; step < 5; step += 1) {
      this.trail.circle(
        this.dragVector.x * step / 5,
        this.dragVector.y * step / 5,
        1.8,
      ).fill({ color: 0xd7f8ff, alpha: 0.52 });
    }
    this.destination.circle(this.dragVector.x + 2, this.dragVector.y + 4, 25).fill({
      color: 0x02040c,
      alpha: 0.42,
    });
    this.destination.circle(this.dragVector.x, this.dragVector.y, 25).fill({
      color: 0x56d8ff,
      alpha: 0.08,
    });
    this.destination.circle(this.dragVector.x, this.dragVector.y, 25).stroke({
      color: 0xd7f8ff,
      alpha: 0.82,
      width: 1.75,
    });
    this.destination.circle(this.dragVector.x, this.dragVector.y, 17).stroke({
      color: 0x78e8ff,
      alpha: 0.32,
      width: 1,
    });
    this.destination.circle(this.dragVector.x, this.dragVector.y, 5).fill({
      color: 0xffffff,
      alpha: 0.76,
    });
    this.trail.moveTo(arrowX, arrowY).lineTo(
      arrowX - Math.cos(angle - 0.55) * 10,
      arrowY - Math.sin(angle - 0.55) * 10,
    ).stroke({ color: 0xffffff, alpha: 0.68, width: 2 });
    this.trail.moveTo(arrowX, arrowY).lineTo(
      arrowX - Math.cos(angle + 0.55) * 10,
      arrowY - Math.sin(angle + 0.55) * 10,
    ).stroke({ color: 0xffffff, alpha: 0.68, width: 2 });
  }
}
