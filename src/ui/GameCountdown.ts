import { Container, Graphics, Text, TextStyle } from 'pixi.js';

type CountdownState = 'hidden' | 'loading' | 'counting' | 'error';

const numberStyle = new TextStyle({
  fill: '#ffffff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 92,
  fontWeight: '900',
  align: 'center',
  dropShadow: {
    alpha: 0.9,
    blur: 18,
    color: '#657cff',
    distance: 0,
  },
});

const labelStyle = new TextStyle({
  fill: '#cbd5f5',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 16,
  fontWeight: '800',
  letterSpacing: 3,
  align: 'center',
});

export class GameCountdown extends Container {
  private readonly veil = new Graphics();
  private readonly number = new Text({ text: '', style: numberStyle });
  private readonly subtitle = new Text({ text: '', style: labelStyle });
  private state: CountdownState = 'hidden';
  private elapsed = 0;
  private displayedStep = '';
  private completionReported = false;
  private viewportWidth = 1;
  private viewportHeight = 1;

  constructor() {
    super();
    this.eventMode = 'none';
    this.number.anchor.set(0.5);
    this.subtitle.anchor.set(0.5);
    this.addChild(this.veil, this.number, this.subtitle);
    this.visible = false;
  }

  showLoading(): void {
    this.state = 'loading';
    this.visible = true;
    this.number.text = '···';
    this.number.style.fontSize = 58;
    this.subtitle.text = 'PREPARANDO AUDIO';
    this.layout();
  }

  start(label = 'PREPÁRATE'): void {
    this.state = 'counting';
    this.visible = true;
    this.elapsed = 0;
    this.displayedStep = '';
    this.completionReported = false;
    this.number.style.fontSize = 92;
    this.subtitle.text = label;
    this.updateStep('3');
    this.layout();
  }

  showError(): void {
    this.state = 'error';
    this.visible = true;
    this.number.text = '!';
    this.number.style.fontSize = 76;
    this.subtitle.text = 'NO SE PUDO INICIAR EL AUDIO';
    this.layout();
  }

  hide(): void {
    this.state = 'hidden';
    this.visible = false;
  }

  updateCountdown(deltaSeconds: number): boolean {
    if (this.state !== 'counting') return false;

    this.elapsed += deltaSeconds;
    const nextStep = this.elapsed < 0.8
      ? '3'
      : this.elapsed < 1.6
        ? '2'
        : this.elapsed < 2.4
          ? '1'
          : '¡YA!';
    this.updateStep(nextStep);

    const targetScale = nextStep === '¡YA!' ? 1.08 : 1;
    const scale = this.number.scale.x
      + (targetScale - this.number.scale.x) * Math.min(1, deltaSeconds * 12);
    this.number.scale.set(scale);
    this.veil.alpha = 0.72 + Math.sin(this.elapsed * 5) * 0.035;

    if (this.elapsed < 2.95 || this.completionReported) return false;
    this.completionReported = true;
    return true;
  }

  resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.veil.clear().rect(0, 0, width, height).fill({
      color: 0x080d1d,
      alpha: 0.78,
    });
    this.layout();
  }

  private updateStep(step: string): void {
    if (step === this.displayedStep) return;

    this.displayedStep = step;
    this.number.text = step;
    this.number.scale.set(step === '¡YA!' ? 0.52 : 0.62);
    this.number.style.fill = step === '¡YA!' ? '#8ffaff' : '#ffffff';
  }

  private layout(): void {
    this.number.position.set(this.viewportWidth / 2, this.viewportHeight * 0.46);
    this.subtitle.position.set(
      this.viewportWidth / 2,
      this.viewportHeight * 0.46 + 82,
    );
  }
}
