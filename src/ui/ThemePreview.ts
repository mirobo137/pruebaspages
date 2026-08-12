import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { VisualTheme } from '../customization/ThemeTypes';
import type { VisualQualityProfile } from '../customization/VisualQuality';
import { JuiceSystem } from '../game/effects/JuiceSystem';
import { RhythmBackground } from '../game/effects/RhythmBackground';
import { TargetNode } from '../game/targets/TargetNode';

const modeStyle = new TextStyle({
  fill: '#ffffff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 11,
  fontWeight: '900',
  letterSpacing: 1.5,
});

const hintStyle = new TextStyle({
  fill: '#a9b7d8',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 9,
  fontWeight: '700',
  letterSpacing: 0.8,
});

export class ThemePreview extends Container {
  private readonly frame = new Graphics();
  private readonly viewport = new Container();
  private readonly viewportMask = new Graphics();
  private readonly modeLabel = new Text({ text: '', style: modeStyle });
  private readonly hintLabel = new Text({
    text: 'OBJETIVO  /  DRAG  /  FLOW  /  SUPER FLOW',
    style: hintStyle,
  });
  private background: RhythmBackground | null = null;
  private juice: JuiceSystem | null = null;
  private tapTarget: TargetNode | null = null;
  private dragTarget: TargetNode | null = null;
  private theme: VisualTheme | null = null;
  private previewWidth = 320;
  private previewHeight = 240;
  private elapsed = 0;
  private modeIndex = -1;
  private impactIndex = -1;

  constructor(private readonly quality: VisualQualityProfile) {
    super();
    this.eventMode = 'none';
    this.viewport.eventMode = 'none';
    this.viewport.mask = this.viewportMask;
    this.modeLabel.eventMode = 'none';
    this.hintLabel.eventMode = 'none';
    this.addChild(
      this.frame,
      this.viewport,
      this.viewportMask,
      this.modeLabel,
      this.hintLabel,
    );
  }

  setTheme(theme: VisualTheme): void {
    if (this.theme === theme) return;
    this.theme = theme;
    this.elapsed = 0;
    this.modeIndex = -1;
    this.impactIndex = -1;
    for (const child of this.viewport.removeChildren()) {
      child.destroy({ children: true });
    }

    this.background = new RhythmBackground(theme.background, this.quality);
    this.tapTarget = new TargetNode(
      'tap',
      null,
      undefined,
      theme.target,
      theme.drag,
    );
    this.dragTarget = new TargetNode(
      'drag',
      [
        { x: 52, y: -42 },
        { x: 108, y: -24 },
        { x: 154, y: -58 },
      ],
      undefined,
      theme.target,
      theme.drag,
    );
    this.juice = new JuiceSystem(theme.effects, this.quality);
    this.viewport.addChild(
      this.background,
      this.tapTarget,
      this.dragTarget,
      this.juice,
    );
    this.resize(this.previewWidth, this.previewHeight);
    this.applyMode(0);
  }

  updatePreview(deltaSeconds: number): void {
    if (!this.background || !this.juice || !this.tapTarget || !this.dragTarget) return;
    this.elapsed += deltaSeconds;
    const mode = Math.floor(this.elapsed / 3.4) % 3;
    if (mode !== this.modeIndex) this.applyMode(mode);

    const leadTime = 1.25;
    const timingCycle = (this.elapsed % leadTime) / leadTime;
    const timeUntilHit = leadTime * (1 - timingCycle);
    this.tapTarget.updateTiming(timeUntilHit, leadTime, 0.11, 0.25);
    this.dragTarget.updateTiming(timeUntilHit, leadTime, 0.11, 0.25);
    this.tapTarget.animate(deltaSeconds);
    this.dragTarget.animate(deltaSeconds);
    this.background.updateBackground(deltaSeconds);
    this.juice.updateEffects(deltaSeconds);

    const nextImpact = Math.floor(this.elapsed / leadTime);
    if (nextImpact !== this.impactIndex && timingCycle < 0.12) {
      this.impactIndex = nextImpact;
      this.juice.emitImpact(this.tapTarget.x, this.tapTarget.y, 'perfect');
      this.background.pulse(0.75);
    }
  }

  resize(width: number, height: number): void {
    this.previewWidth = Math.max(1, width);
    this.previewHeight = Math.max(1, height);
    const theme = this.theme;
    const borderColor = theme?.target.highlight ?? 0x6defff;
    this.frame.clear()
      .roundRect(0, 0, this.previewWidth, this.previewHeight, 18)
      .fill({ color: theme?.background.backdrop ?? 0x071020, alpha: 0.96 })
      .stroke({ color: borderColor, alpha: 0.46, width: 1.2 });
    this.frame
      .moveTo(24, 0)
      .lineTo(this.previewWidth * 0.5, 0)
      .stroke({ color: borderColor, alpha: 0.9, width: 1.6 });
    this.viewportMask.clear()
      .roundRect(
        2,
        2,
        Math.max(0, this.previewWidth - 4),
        Math.max(0, this.previewHeight - 4),
        16,
      )
      .fill({ color: 0xffffff });
    this.background?.resize(this.previewWidth, this.previewHeight);
    this.juice?.resize(this.previewWidth, this.previewHeight);

    const compactScale = this.previewHeight < 220
      ? 0.76
      : this.previewHeight < 260
        ? 0.88
        : 1;
    if (this.tapTarget) {
      this.tapTarget.position.set(this.previewWidth * 0.25, this.previewHeight * 0.48);
      this.tapTarget.scale.set(compactScale);
    }
    if (this.dragTarget) {
      this.dragTarget.position.set(this.previewWidth * 0.38, this.previewHeight * 0.79);
      this.dragTarget.scale.set(compactScale);
    }
    this.modeLabel.position.set(16, 13);
    this.hintLabel.anchor.set(1, 0);
    this.hintLabel.position.set(this.previewWidth - 14, 15);
  }

  private applyMode(mode: number): void {
    if (!this.background || !this.juice || !this.tapTarget || !this.dragTarget) return;
    this.modeIndex = mode;
    const flowActive = mode >= 1;
    const superActive = mode === 2;
    this.background.setFlowState(flowActive, superActive);
    this.juice.setFlowState(flowActive, superActive);
    this.tapTarget.setFlowState(flowActive, superActive);
    this.dragTarget.setFlowState(flowActive, superActive);
    this.modeLabel.text = superActive
      ? 'SUPER FLOW'
      : flowActive
        ? 'FLOW'
        : 'VISTA NORMAL';
    if (superActive) this.juice.emitSuperFlowActivation();
    else if (flowActive) this.juice.emitFlowActivation();
  }
}
