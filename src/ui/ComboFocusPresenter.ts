import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { EffectsVisualTheme } from '../customization/ThemeTypes';
import type { FlowSnapshot } from '../game/flow/FlowModel';
import type { ScoreSnapshot } from '../game/score/ScoreModel';
import type { TimingGrade } from '../game/timing/TimingGrade';

export interface FocusPoint {
  x: number;
  y: number;
}

export interface ComboFocusLayoutInput {
  impact: FocusPoint;
  avoid: readonly FocusPoint[];
  viewportWidth: number;
  viewportHeight: number;
}

const comboStyle = new TextStyle({
  fill: '#ffffff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 28,
  fontWeight: '900',
  align: 'center',
  dropShadow: { alpha: 0.72, blur: 7, color: '#050817', distance: 2 },
});

const progressStyle = new TextStyle({
  fill: '#9fb0de',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 11,
  fontWeight: '800',
  letterSpacing: 1.4,
  align: 'center',
});

const milestoneStyle = new TextStyle({
  fill: '#ffffff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
  fontWeight: '900',
  letterSpacing: 2,
  align: 'center',
});

export class ComboFocusPresenter extends Container {
  private readonly glow = new Graphics();
  private readonly progress = new Graphics();
  private readonly comboText = new Text({ text: '', style: comboStyle });
  private readonly progressText = new Text({ text: '', style: progressStyle });
  private readonly milestoneText = new Text({ text: '', style: milestoneStyle });
  private viewportWidth = 1;
  private viewportHeight = 1;
  private age = 10;
  private duration = 0.95;
  private punch = 0;
  private milestone = false;

  constructor(private readonly theme: EffectsVisualTheme) {
    super();
    this.eventMode = 'none';
    this.comboText.anchor.set(0.5);
    this.progressText.anchor.set(0.5);
    this.milestoneText.anchor.set(0.5);
    this.progressText.position.set(0, 24);
    this.milestoneText.position.set(0, -27);
    this.glow.blendMode = 'add';
    this.progress.blendMode = 'add';
    this.addChild(
      this.glow,
      this.progress,
      this.comboText,
      this.progressText,
      this.milestoneText,
    );
    this.visible = false;
  }

  resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  showResult(
    impact: FocusPoint,
    grade: TimingGrade,
    score: ScoreSnapshot,
    flow: FlowSnapshot,
    avoid: readonly FocusPoint[],
  ): void {
    const position = chooseComboFocusPosition({
      impact,
      avoid,
      viewportWidth: this.viewportWidth,
      viewportHeight: this.viewportHeight,
    });
    this.position.set(position.x, position.y);
    this.age = 0;
    this.punch = 1;
    this.visible = true;
    this.milestone = grade !== 'miss' && isComboMilestone(score.combo);
    this.duration = this.milestone ? 1.35 : grade === 'miss' ? 0.72 : 0.95;

    const color = grade === 'miss'
      ? this.theme.miss
      : flow.superActive
        ? this.theme.superPrimary
        : flow.active
          ? this.theme.flowPrimary
          : grade === 'perfect'
            ? this.theme.perfect
            : this.theme.good;
    this.comboText.text = grade === 'miss' ? 'COMBO ROTO' : `x${score.combo}`;
    this.comboText.style.fill = color;
    this.comboText.style.fontSize = grade === 'miss' ? 20 : this.milestone ? 35 : 28;
    this.progressText.text = getFocusProgressLabel(flow);
    this.progressText.style.fill = flow.superActive
      ? this.theme.superSecondary
      : flow.active
        ? this.theme.flowSecondary
        : this.theme.highlight;
    this.milestoneText.text = this.milestone ? `${score.combo} CHAIN` : '';
    this.milestoneText.style.fill = color;
    this.drawProgress(flow, color);
  }

  animate(deltaSeconds: number): void {
    if (!this.visible) return;
    this.age += deltaSeconds;
    this.punch = Math.max(0, this.punch - deltaSeconds * 6.5);
    const fadeStart = this.duration * (this.milestone ? 0.58 : 0.48);
    this.alpha = this.age <= fadeStart
      ? 1
      : Math.max(0, 1 - (this.age - fadeStart) / (this.duration - fadeStart));
    const baseScale = this.milestone ? 1.08 : 1;
    this.scale.set(baseScale + this.punch * (this.milestone ? 0.34 : 0.2));
    this.y -= deltaSeconds * (this.milestone ? 9 : 5);
    this.glow.rotation += deltaSeconds * (this.milestone ? 1.8 : 0.8);
    if (this.age >= this.duration) this.hide();
  }

  hide(): void {
    this.visible = false;
    this.alpha = 0;
    this.age = 10;
  }

  private drawProgress(flow: FlowSnapshot, color: number): void {
    this.glow.clear();
    this.progress.clear();
    const ratio = flow.superActive
      ? 1
      : flow.active
        ? flow.superPerfects / Math.max(1, flow.superPerfectRequirement)
        : flow.charge / Math.max(1, flow.maxCharge);
    this.glow.circle(0, 0, this.milestone ? 43 : 36).fill({ color, alpha: 0.055 });
    this.glow.circle(0, 0, this.milestone ? 40 : 33).stroke({
      color,
      alpha: this.milestone ? 0.48 : 0.2,
      width: this.milestone ? 2 : 1,
    });
    const segments = flow.active && !flow.superActive
      ? flow.superPerfectRequirement
      : 8;
    const completed = flow.superActive
      ? segments
      : flow.active
        ? flow.superPerfects
        : Math.round(ratio * segments);
    for (let index = 0; index < segments; index += 1) {
      const angle = -Math.PI / 2 + index * Math.PI * 2 / segments;
      const radius = this.milestone ? 47 : 40;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      this.progress.circle(x, y, index < completed ? 2.5 : 1.5).fill({
        color,
        alpha: index < completed ? 0.92 : 0.18,
      });
    }
  }
}

export function chooseComboFocusPosition(input: ComboFocusLayoutInput): FocusPoint {
  const offsets = [
    { x: 0, y: -82 },
    { x: 88, y: -24 },
    { x: -88, y: -24 },
    { x: 78, y: 68 },
    { x: -78, y: 68 },
  ];
  const candidates = offsets.map((offset) => ({
    x: clamp(input.impact.x + offset.x, 78, Math.max(78, input.viewportWidth - 78)),
    y: clamp(input.impact.y + offset.y, 158, Math.max(158, input.viewportHeight - 74)),
  }));
  return candidates.reduce((best, candidate) => (
    scoreCandidate(candidate, input.avoid, input.impact)
      > scoreCandidate(best, input.avoid, input.impact)
      ? candidate
      : best
  ));
}

export function getFocusProgressLabel(flow: FlowSnapshot): string {
  if (flow.superActive) return 'SUPER FLOW';
  if (flow.active) {
    return `SUPER ${flow.superPerfects}/${flow.superPerfectRequirement}`;
  }
  const ratio = flow.charge / Math.max(1, flow.maxCharge);
  return ratio >= 0.75 ? `FLOW ${Math.round(ratio * 100)}%` : '';
}

export function isComboMilestone(combo: number): boolean {
  return combo === 10 || combo === 25 || (combo >= 50 && combo % 50 === 0);
}

function scoreCandidate(
  candidate: FocusPoint,
  avoid: readonly FocusPoint[],
  impact: FocusPoint,
): number {
  const nearestNote = avoid.length === 0
    ? 220
    : Math.min(...avoid.map((point) => Math.hypot(
      candidate.x - point.x,
      candidate.y - point.y,
    )));
  const impactDistance = Math.hypot(candidate.x - impact.x, candidate.y - impact.y);
  return Math.min(220, nearestNote) - impactDistance * 0.12;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
