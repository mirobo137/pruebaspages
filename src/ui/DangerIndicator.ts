import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { EffectsVisualTheme } from '../customization/ThemeTypes';
import type { ScoreSnapshot } from '../game/score/ScoreModel';

const warningStyle = new TextStyle({
  fill: '#ff9ab0',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 12,
  fontWeight: '900',
  letterSpacing: 1.8,
  align: 'left',
  dropShadow: { alpha: 0.65, blur: 6, color: '#30000d', distance: 0 },
});

export function isDangerState(score: Pick<ScoreSnapshot, 'lives'>): boolean {
  return score.lives === 1;
}

export class DangerIndicator extends Container {
  private readonly frame = new Graphics();
  private readonly corners = new Graphics();
  private readonly warningText = new Text({ text: 'ULTIMA VIDA', style: warningStyle });
  private viewportWidth = 1;
  private viewportHeight = 1;
  private elapsed = 0;
  private active = false;
  private superFlowActive = false;

  constructor(private readonly theme: EffectsVisualTheme) {
    super();
    this.eventMode = 'none';
    this.frame.blendMode = 'add';
    this.corners.blendMode = 'add';
    this.addChild(this.frame, this.corners, this.warningText);
    this.visible = false;
  }

  setScore(score: ScoreSnapshot): boolean {
    const next = isDangerState(score);
    const entered = next && !this.active;
    this.active = next;
    this.visible = next;
    if (entered) this.elapsed = 0;
    return entered;
  }

  setFlowState(superFlowActive: boolean): void {
    this.superFlowActive = superFlowActive;
  }

  resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.warningText.position.set(20, 92);
    this.warningText.style.fontSize = width < 360 ? 10 : 12;
    this.redraw();
  }

  animate(deltaSeconds: number): void {
    if (!this.active) return;
    this.elapsed += deltaSeconds;
    const wave = (Math.sin(this.elapsed * Math.PI * 1.75) + 1) * 0.5;
    const reduction = this.superFlowActive ? 0.48 : 1;
    this.frame.alpha = (0.1 + wave * 0.16) * reduction;
    this.corners.alpha = (0.32 + wave * 0.38) * reduction;
    this.warningText.alpha = (0.62 + wave * 0.3) * reduction;
  }

  private redraw(): void {
    const inset = 7;
    const length = Math.min(72, Math.max(38, Math.min(this.viewportWidth, this.viewportHeight) * 0.13));
    this.frame.clear().roundRect(
      inset,
      inset,
      Math.max(0, this.viewportWidth - inset * 2),
      Math.max(0, this.viewportHeight - inset * 2),
      18,
    ).stroke({ color: this.theme.miss, alpha: 0.72, width: 2 });
    this.corners.clear();
    for (const [x, y, directionX, directionY] of [
      [inset, inset, 1, 1],
      [this.viewportWidth - inset, inset, -1, 1],
      [inset, this.viewportHeight - inset, 1, -1],
      [this.viewportWidth - inset, this.viewportHeight - inset, -1, -1],
    ] as const) {
      this.corners.moveTo(x, y + directionY * length)
        .lineTo(x, y)
        .lineTo(x + directionX * length, y)
        .stroke({ color: this.theme.miss, alpha: 0.9, width: 3 });
    }
  }
}
