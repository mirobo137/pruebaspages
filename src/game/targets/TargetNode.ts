import { Container, Graphics } from 'pixi.js';
import { GAME_CONFIG } from '../config';
import type { NoteKind } from '../notes/NoteKind';
import { DragPath, distanceToSegment } from './DragPath';

export interface TargetPoint {
  x: number;
  y: number;
}

export interface DragPointerResult {
  progress: number;
  valid: boolean;
  completed: boolean;
  checkpointsPassed: number;
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
  private readonly checkpoints = new Graphics();
  private readonly destination = new Graphics();
  private readonly marker = new Graphics();
  private readonly stateAccent = new Graphics();
  private ageSeconds = 0;
  private earlyBump = 0;
  private pressed = false;
  private flowActive = false;
  private superFlowActive = false;
  private dragProgress = 0;
  private nextCheckpointIndex = 0;
  private lastDragPointer: TargetPoint | null = null;
  private timingState: 'approach' | 'good' | 'perfect' = 'approach';
  private readonly dragPath: DragPath | null;
  private readonly checkpointProgress = [0.33, 0.66, 1];

  constructor(
    readonly kind: NoteKind,
    dragAnchors: TargetPoint[] | null = null,
    private readonly interaction: TargetInteractionOptions = {
      hitRadius: GAME_CONFIG.targetHitRadius,
      dragPathTolerance: GAME_CONFIG.dragPathTolerance,
    },
  ) {
    super();
    this.eventMode = 'none';
    this.dragPath = kind === 'drag' && dragAnchors?.length
      ? new DragPath([{ x: 0, y: 0 }, ...dragAnchors])
      : null;
    this.addChild(
      this.trail,
      this.progressTrail,
      this.checkpoints,
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
    this.scale.set(1);
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
    const appearScale = 0.82 + appearProgress * 0.18;
    const timingScale = this.timingState === 'perfect'
      ? 1 + Math.sin(this.ageSeconds * 24) * 0.045
      : this.timingState === 'good'
        ? 1 + Math.sin(this.ageSeconds * 16) * 0.018
        : 1;

    this.alpha = appearProgress;
    this.marker.scale.set(appearScale * pulse * earlyScale * pressScale * timingScale);
    this.stateAccent.scale.set(appearScale * pulse * earlyScale * pressScale * timingScale);
    this.shadow.scale.set(appearScale * pressScale);
    this.glow.scale.set(appearScale * pulse);
    this.glow.alpha = (this.superFlowActive ? 0.44 : this.flowActive ? 0.32 : 0.18)
      + Math.sin(this.ageSeconds * (this.superFlowActive ? 13 : this.flowActive ? 9 : 5))
      * 0.06;
    // Timing rings intentionally never inherit cosmetic pulses. Their scale is
    // an authoritative representation of the selected difficulty's clock.
    this.goodTimingRing.scale.set(1);
    this.perfectTimingRing.scale.set(1);
    this.destination.alpha = this.kind === 'drag'
      ? 0.5 + Math.sin(this.ageSeconds * 6) * 0.16
      : 0;
    this.checkpoints.alpha = this.kind === 'drag'
      ? 0.72 + Math.sin(this.ageSeconds * 4.5) * 0.12
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
    if (this.kind === 'drag') {
      this.nextCheckpointIndex = 0;
      this.lastDragPointer = null;
      this.setDragProgress(0);
      this.drawCheckpoints();
    }
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

  beginDrag(globalX: number, globalY: number): void {
    this.lastDragPointer = this.toLocal({ x: globalX, y: globalY });
  }

  updateDragFromPointer(
    globalX: number,
    globalY: number,
    toleranceBonus = 0,
    completionThreshold = 0.985,
  ): DragPointerResult {
    if (this.kind !== 'drag' || !this.dragPath) {
      return {
        progress: 0,
        valid: false,
        completed: false,
        checkpointsPassed: 0,
      };
    }

    const pointer = this.toLocal({ x: globalX, y: globalY });
    const projection = this.dragPath.project(pointer);
    const corridor = this.interaction.dragPathTolerance + toleranceBonus;
    const valid = projection.distance <= corridor
      && projection.progress >= this.dragProgress - 0.16;
    let checkpointsPassed = 0;

    if (valid) {
      const movementStart = this.lastDragPointer ?? { x: 0, y: 0 };
      const checkpointRadius = Math.min(46, Math.max(34, corridor * 0.55));
      while (this.nextCheckpointIndex < this.checkpointProgress.length) {
        const checkpoint = this.dragPath.pointAt(
          this.checkpointProgress[this.nextCheckpointIndex],
        );
        const checkpointDistance = distanceToSegment(
          checkpoint,
          movementStart,
          pointer,
        );
        if (checkpointDistance > checkpointRadius) break;
        this.nextCheckpointIndex += 1;
        checkpointsPassed += 1;
      }

      const nextLimit = this.checkpointProgress[this.nextCheckpointIndex] ?? 1;
      this.setDragProgress(Math.max(
        this.dragProgress,
        Math.min(projection.progress, nextLimit),
      ));
      if (checkpointsPassed > 0) this.drawCheckpoints();
    }
    this.lastDragPointer = pointer;

    return {
      progress: this.dragProgress,
      valid,
      completed: this.nextCheckpointIndex >= this.checkpointProgress.length
        && this.dragProgress >= completionThreshold,
      checkpointsPassed,
    };
  }

  getFeedbackPoint(): TargetPoint {
    const point = this.toGlobal(this.dragPath?.pointAt(this.dragProgress) ?? { x: 0, y: 0 });
    return { x: point.x, y: point.y };
  }

  get requiredDragDistance(): number {
    return Math.max(GAME_CONFIG.dragDistance, this.dragPath?.length ?? 0);
  }

  private setDragProgress(progress: number): void {
    if (this.kind !== 'drag') return;

    this.dragProgress = Math.max(0, Math.min(1, progress));
    if (!this.dragPath) return;
    const markerPoint = this.dragPath.pointAt(this.dragProgress);
    for (const node of [
      this.shadow,
      this.glow,
      this.marker,
      this.stateAccent,
      this.approachRing,
      this.goodTimingRing,
      this.perfectTimingRing,
    ]) {
      node.position.set(markerPoint.x, markerPoint.y);
    }

    this.progressTrail.clear();
    this.drawPathUntil(this.progressTrail, this.dragProgress, 0x68e5ff, 0.22, 8);
    this.drawPathUntil(this.progressTrail, this.dragProgress, 0xc5f7ff, 0.94, 2.5);
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

    if (!isDrag || !this.dragPath) return;

    this.drawPathUntil(this.trail, 1, 0x111a31, 0.86, 11);
    this.drawPathUntil(this.trail, 1, 0x75e5ff, 0.62, 2);
    this.drawPathUntil(this.trail, 1, 0xdafaff, 0.18, 0.8);
    for (const progress of [0.16, 0.5, 0.84]) {
      const guide = this.dragPath.pointAt(progress);
      this.trail.circle(guide.x, guide.y, 1.8).fill({ color: 0xd7f8ff, alpha: 0.5 });
    }

    const end = this.dragPath.pointAt(1);
    this.destination.position.set(end.x, end.y);
    this.destination.circle(2, 4, 27).fill({
      color: 0x02040c,
      alpha: 0.42,
    });
    this.destination.circle(0, 0, 27).fill({
      color: 0x56d8ff,
      alpha: 0.08,
    });
    this.destination.circle(0, 0, 27).stroke({
      color: 0xd7f8ff,
      alpha: 0.82,
      width: 1.5,
    });
    this.destination.circle(0, 0, 18).stroke({
      color: 0x78e8ff,
      alpha: 0.38,
      width: 1,
    });
    this.destination.circle(0, 0, 5).fill({
      color: 0xffffff,
      alpha: 0.76,
    });

    const arrow = this.dragPath.pointAt(0.76);
    const tangent = this.dragPath.tangentAt(0.76);
    const angle = Math.atan2(tangent.y, tangent.x);
    this.trail.moveTo(arrow.x, arrow.y).lineTo(
      arrow.x - Math.cos(angle - 0.55) * 10,
      arrow.y - Math.sin(angle - 0.55) * 10,
    ).stroke({ color: 0xffffff, alpha: 0.68, width: 2 });
    this.trail.moveTo(arrow.x, arrow.y).lineTo(
      arrow.x - Math.cos(angle + 0.55) * 10,
      arrow.y - Math.sin(angle + 0.55) * 10,
    ).stroke({ color: 0xffffff, alpha: 0.68, width: 2 });
    this.drawCheckpoints();
  }

  private drawPathUntil(
    graphics: Graphics,
    progress: number,
    color: number,
    alpha: number,
    width: number,
  ): void {
    if (!this.dragPath || progress <= 0) return;
    const sampleLimit = Math.max(1, Math.floor(
      (this.dragPath.points.length - 1) * Math.min(1, progress),
    ));
    graphics.moveTo(this.dragPath.points[0].x, this.dragPath.points[0].y);
    for (let index = 1; index <= sampleLimit; index += 1) {
      graphics.lineTo(this.dragPath.points[index].x, this.dragPath.points[index].y);
    }
    const end = this.dragPath.pointAt(progress);
    graphics.lineTo(end.x, end.y).stroke({ color, alpha, width });
  }

  private drawCheckpoints(): void {
    if (!this.dragPath) return;
    this.checkpoints.clear();
    this.checkpointProgress.slice(0, -1).forEach((progress, index) => {
      const point = this.dragPath!.pointAt(progress);
      const reached = index < this.nextCheckpointIndex;
      const radius = reached ? 8 : 9;
      this.checkpoints.circle(point.x, point.y, radius + 5).fill({
        color: reached ? 0x70f6bd : 0x54dfff,
        alpha: reached ? 0.12 : 0.055,
      });
      this.checkpoints.circle(point.x, point.y, radius).fill({
        color: reached ? 0x70f6bd : 0x0b1730,
        alpha: reached ? 0.75 : 0.92,
      }).stroke({
        color: reached ? 0xc8ffe8 : 0x9cefff,
        alpha: reached ? 0.95 : 0.7,
        width: 1.2,
      });
      this.checkpoints.circle(point.x, point.y, reached ? 3.5 : 2.5).fill({
        color: 0xffffff,
        alpha: reached ? 0.95 : 0.58,
      });
    });
  }
}
