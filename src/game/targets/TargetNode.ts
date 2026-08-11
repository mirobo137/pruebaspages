import { Container, Graphics } from 'pixi.js';
import type { DragVisualTheme, TargetVisualTheme } from '../../customization/ThemeTypes';
import { DEFAULT_VISUAL_THEME } from '../../customization/themes/defaultTheme';
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
    private readonly visualTheme: TargetVisualTheme = DEFAULT_VISUAL_THEME.target,
    private readonly dragVisualTheme: DragVisualTheme = DEFAULT_VISUAL_THEME.drag,
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
    this.stateAccent.rotation = this.visualTheme.timingRingStyle === 'orbiting'
      ? this.ageSeconds * (this.superFlowActive ? 2.4 : this.flowActive ? 1.8 : 1.2)
      : 0;
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
    const primaryTint = superActive
      ? this.visualTheme.superPrimary
      : active
        ? this.visualTheme.flowPrimary
        : this.visualTheme.highlight;
    const accentTint = superActive
      ? this.visualTheme.superAccent
      : active
        ? this.visualTheme.flowAccent
        : primaryTint;
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
    const progressBaseWidth = this.dragVisualTheme.trailStyle === 'comet'
      ? 10
      : this.dragVisualTheme.trailStyle === 'electric'
        ? 6
        : 8;
    const progressHighlightWidth = this.dragVisualTheme.trailStyle === 'comet'
      ? 3
      : this.dragVisualTheme.trailStyle === 'electric'
        ? 1.8
        : 2.5;
    this.drawPathUntil(
      this.progressTrail,
      this.dragProgress,
      this.dragVisualTheme.progressBase,
      0.22,
      progressBaseWidth,
    );
    this.drawPathUntil(
      this.progressTrail,
      this.dragProgress,
      this.dragVisualTheme.progressHighlight,
      0.94,
      progressHighlightWidth,
    );
    this.progressTrail.blendMode = 'add';
  }

  private drawTarget(): void {
    const isDrag = this.kind === 'drag';
    const color = isDrag ? this.visualTheme.dragFill : this.visualTheme.tapFill;
    const outline = isDrag
      ? this.visualTheme.dragOutline
      : this.visualTheme.tapOutline;

    this.drawShadow();

    this.glow.circle(0, 0, GAME_CONFIG.targetRadius + 17).fill({
      color,
      alpha: 0.1,
    });
    this.glow.circle(0, 0, GAME_CONFIG.targetRadius + 9).fill({
      color,
      alpha: 0.12,
    });
    this.glow.blendMode = 'add';

    this.drawTimingRings(outline);

    this.drawMarker(color);
    this.drawStateAccent();

    if (!isDrag || !this.dragPath) return;

    this.drawDragTrail();
    const guidePoints = this.dragVisualTheme.trailStyle === 'comet'
      ? [0.12, 0.3, 0.5, 0.7, 0.88]
      : [0.16, 0.5, 0.84];
    for (const progress of guidePoints) {
      const guide = this.dragPath.pointAt(progress);
      this.trail.circle(guide.x, guide.y, 1.8).fill({
        color: this.dragVisualTheme.guide,
        alpha: 0.5,
      });
    }

    const end = this.dragPath.pointAt(1);
    this.destination.position.set(end.x, end.y);
    this.destination.circle(2, 4, 27).fill({
      color: this.dragVisualTheme.destinationShadow,
      alpha: 0.42,
    });
    this.destination.circle(0, 0, 27).fill({
      color: this.dragVisualTheme.destinationFill,
      alpha: 0.08,
    });
    this.destination.circle(0, 0, 27).stroke({
      color: this.dragVisualTheme.destinationOutline,
      alpha: 0.82,
      width: 1.5,
    });
    this.destination.circle(0, 0, 18).stroke({
      color: this.dragVisualTheme.destinationInner,
      alpha: 0.38,
      width: 1,
    });
    this.destination.circle(0, 0, 5).fill({
      color: this.visualTheme.highlight,
      alpha: 0.76,
    });

    const arrow = this.dragPath.pointAt(0.76);
    const tangent = this.dragPath.tangentAt(0.76);
    const angle = Math.atan2(tangent.y, tangent.x);
    this.trail.moveTo(arrow.x, arrow.y).lineTo(
      arrow.x - Math.cos(angle - 0.55) * 10,
      arrow.y - Math.sin(angle - 0.55) * 10,
    ).stroke({ color: this.visualTheme.highlight, alpha: 0.68, width: 2 });
    this.trail.moveTo(arrow.x, arrow.y).lineTo(
      arrow.x - Math.cos(angle + 0.55) * 10,
      arrow.y - Math.sin(angle + 0.55) * 10,
    ).stroke({ color: this.visualTheme.highlight, alpha: 0.68, width: 2 });
    this.drawCheckpoints();
  }

  private drawShadow(): void {
    if (this.visualTheme.shape === 'faceted') {
      this.tracePolygon(this.shadow, GAME_CONFIG.targetRadius + 3, 6, Math.PI / 6, 2, 5);
      this.shadow.fill({ color: this.visualTheme.shadow, alpha: 0.5 });
      this.tracePolygon(this.shadow, GAME_CONFIG.targetRadius + 1, 6, Math.PI / 6, 0, 1);
      this.shadow.stroke({
        color: this.visualTheme.shadowOutline,
        alpha: 0.5,
        width: 2,
      });
      return;
    }

    this.shadow.circle(2, 5, GAME_CONFIG.targetRadius + 3).fill({
      color: this.visualTheme.shadow,
      alpha: 0.5,
    });
    this.shadow.circle(0, 1, GAME_CONFIG.targetRadius + 1).stroke({
      color: this.visualTheme.shadowOutline,
      alpha: 0.5,
      width: 2,
    });
  }

  private drawTimingRings(outline: number): void {
    if (this.visualTheme.timingRingStyle === 'broken') {
      this.drawArcSegments(
        this.approachRing,
        GAME_CONFIG.targetRadius + 11,
        6,
        outline,
        0.86,
        1.75,
      );
      this.drawArcSegments(
        this.goodTimingRing,
        GAME_CONFIG.targetRadius + 6,
        5,
        this.visualTheme.goodTiming,
        0.95,
        2,
      );
      this.drawArcSegments(
        this.perfectTimingRing,
        GAME_CONFIG.targetRadius + 2,
        4,
        this.visualTheme.perfectTiming,
        1,
        1.6,
      );
    } else if (this.visualTheme.timingRingStyle === 'orbiting') {
      this.approachRing.circle(0, 0, GAME_CONFIG.targetRadius + 11).stroke({
        color: outline,
        alpha: 0.52,
        width: 1.25,
      });
      this.drawArcSegments(
        this.approachRing,
        GAME_CONFIG.targetRadius + 11,
        3,
        outline,
        0.9,
        2.3,
        0.32,
      );
      this.goodTimingRing.circle(0, 0, GAME_CONFIG.targetRadius + 6).stroke({
        color: this.visualTheme.goodTiming,
        alpha: 0.7,
        width: 1.4,
      });
      this.drawArcSegments(
        this.perfectTimingRing,
        GAME_CONFIG.targetRadius + 2,
        3,
        this.visualTheme.perfectTiming,
        1,
        2,
        0.38,
      );
    } else {
      this.approachRing.circle(0, 0, GAME_CONFIG.targetRadius + 11).stroke({
        color: outline,
        alpha: 0.86,
        width: 1.75,
      });
      this.goodTimingRing.circle(0, 0, GAME_CONFIG.targetRadius + 6).stroke({
        color: this.visualTheme.goodTiming,
        alpha: 0.95,
        width: 2,
      });
      this.perfectTimingRing.circle(0, 0, GAME_CONFIG.targetRadius + 2).stroke({
        color: this.visualTheme.perfectTiming,
        alpha: 1,
        width: 1.6,
      });
    }
    this.goodTimingRing.alpha = 0.1;
    this.perfectTimingRing.alpha = 0.07;
  }

  private drawMarker(color: number): void {
    const radius = GAME_CONFIG.targetRadius;
    if (this.visualTheme.shape === 'faceted') {
      this.tracePolygon(this.marker, radius, 6, Math.PI / 6);
      this.marker.fill({ color: this.visualTheme.surface, alpha: 0.98 });
      this.tracePolygon(this.marker, radius - 1.5, 6, Math.PI / 6);
      this.marker.fill({ color, alpha: 0.9 });
      this.tracePolygon(this.marker, radius - 8, 6, Math.PI / 6);
      this.marker.fill({ color: this.visualTheme.innerSurface, alpha: 0.3 });
      this.tracePolygon(this.marker, radius - 8, 6, Math.PI / 6);
      this.marker.stroke({ color: this.visualTheme.highlight, alpha: 0.46, width: 1.25 });
      for (let side = 0; side < 3; side += 1) {
        const angle = side * Math.PI * 2 / 3 - Math.PI / 2;
        this.marker.circle(
          Math.cos(angle) * (radius - 8),
          Math.sin(angle) * (radius - 8),
          2.2,
        ).fill({ color: this.visualTheme.highlight, alpha: 0.54 });
      }
    } else {
      this.marker.circle(0, 0, radius).fill({
        color: this.visualTheme.surface,
        alpha: 0.98,
      });
      this.marker.circle(0, 0, radius - 1.5).fill({ color, alpha: 0.9 });
      this.marker.circle(0, 0, radius - 7).fill({
        color: this.visualTheme.innerSurface,
        alpha: 0.2,
      });
      this.marker.circle(0, 0, radius - 7).stroke({
        color: this.visualTheme.highlight,
        alpha: 0.48,
        width: 1.25,
      });
      if (this.visualTheme.shape === 'segmented') {
        this.drawArcSegments(
          this.marker,
          radius - 4,
          6,
          this.visualTheme.highlight,
          0.72,
          2,
          0.44,
        );
      } else {
        this.marker.arc(0, 0, radius - 4, Math.PI * 1.08, Math.PI * 1.76).stroke({
          color: this.visualTheme.highlight,
          alpha: 0.72,
          width: 2,
        });
        this.marker.circle(-8, -9, 3.5).fill({
          color: this.visualTheme.highlight,
          alpha: 0.42,
        });
      }
    }
    this.marker.circle(0, 0, 4).fill({
      color: this.visualTheme.highlight,
      alpha: 0.9,
    });
  }

  private drawStateAccent(): void {
    const radius = GAME_CONFIG.targetRadius - 3;
    if (this.visualTheme.shape === 'faceted') {
      this.tracePolygon(this.stateAccent, radius, 6, Math.PI / 6);
      this.stateAccent.stroke({
        color: this.visualTheme.highlight,
        alpha: 0.8,
        width: 1.4,
      });
    } else if (this.visualTheme.shape === 'segmented') {
      this.drawArcSegments(
        this.stateAccent,
        radius,
        6,
        this.visualTheme.highlight,
        0.8,
        1.4,
        0.48,
      );
    } else {
      this.stateAccent.circle(0, 0, radius).stroke({
        color: this.visualTheme.highlight,
        alpha: 0.8,
        width: 1.4,
      });
    }
    this.stateAccent.blendMode = 'add';
  }

  private drawDragTrail(): void {
    if (this.dragVisualTheme.trailStyle === 'electric') {
      this.drawPathUntil(this.trail, 1, this.dragVisualTheme.trailBase, 0.8, 9);
      this.drawPathUntil(this.trail, 1, this.dragVisualTheme.trailPrimary, 0.7, 1.5);
      this.drawElectricPath();
    } else if (this.dragVisualTheme.trailStyle === 'comet') {
      this.drawPathUntil(this.trail, 1, this.dragVisualTheme.trailBase, 0.68, 14);
      this.drawPathUntil(this.trail, 1, this.dragVisualTheme.trailPrimary, 0.34, 5);
      this.drawPathUntil(this.trail, 1, this.dragVisualTheme.trailHighlight, 0.72, 1.2);
    } else {
      this.drawPathUntil(this.trail, 1, this.dragVisualTheme.trailBase, 0.86, 11);
      this.drawPathUntil(this.trail, 1, this.dragVisualTheme.trailPrimary, 0.62, 2);
      this.drawPathUntil(this.trail, 1, this.dragVisualTheme.trailHighlight, 0.18, 0.8);
    }
  }

  private drawElectricPath(): void {
    if (!this.dragPath) return;
    const points = this.dragPath.points;
    const step = Math.max(2, Math.floor(points.length / 18));
    this.trail.moveTo(points[0].x, points[0].y);
    for (let index = step; index < points.length; index += step) {
      const point = points[index];
      const previous = points[Math.max(0, index - step)];
      const angle = Math.atan2(point.y - previous.y, point.x - previous.x) + Math.PI / 2;
      const offset = (Math.floor(index / step) % 2 === 0 ? 1 : -1) * 3.5;
      this.trail.lineTo(
        point.x + Math.cos(angle) * offset,
        point.y + Math.sin(angle) * offset,
      );
    }
    const end = points[points.length - 1];
    this.trail.lineTo(end.x, end.y).stroke({
      color: this.dragVisualTheme.trailHighlight,
      alpha: 0.86,
      width: 1.1,
    });
  }

  private drawArcSegments(
    graphics: Graphics,
    radius: number,
    segments: number,
    color: number,
    alpha: number,
    width: number,
    coverage = 0.58,
  ): void {
    const step = Math.PI * 2 / segments;
    for (let segment = 0; segment < segments; segment += 1) {
      const start = segment * step - Math.PI / 2;
      graphics.arc(0, 0, radius, start, start + step * coverage).stroke({
        color,
        alpha,
        width,
      });
    }
  }

  private tracePolygon(
    graphics: Graphics,
    radius: number,
    sides: number,
    rotation: number,
    offsetX = 0,
    offsetY = 0,
  ): void {
    for (let side = 0; side <= sides; side += 1) {
      const angle = rotation + side * Math.PI * 2 / sides;
      const x = offsetX + Math.cos(angle) * radius;
      const y = offsetY + Math.sin(angle) * radius;
      if (side === 0) graphics.moveTo(x, y);
      else graphics.lineTo(x, y);
    }
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
        color: reached
          ? this.dragVisualTheme.checkpointReachedGlow
          : this.dragVisualTheme.checkpointPendingGlow,
        alpha: reached ? 0.12 : 0.055,
      });
      this.checkpoints.circle(point.x, point.y, radius).fill({
        color: reached
          ? this.dragVisualTheme.checkpointReachedFill
          : this.dragVisualTheme.checkpointPendingFill,
        alpha: reached ? 0.75 : 0.92,
      }).stroke({
        color: reached
          ? this.dragVisualTheme.checkpointReachedOutline
          : this.dragVisualTheme.checkpointPendingOutline,
        alpha: reached ? 0.95 : 0.7,
        width: 1.2,
      });
      this.checkpoints.circle(point.x, point.y, reached ? 3.5 : 2.5).fill({
        color: this.visualTheme.highlight,
        alpha: reached ? 0.95 : 0.58,
      });
    });
  }
}
