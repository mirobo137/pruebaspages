import { Container, Graphics, Rectangle, Text, TextStyle } from 'pixi.js';
import { MenuButton } from './MenuButton';

export interface DefeatSummary {
  phaseName: string;
  phaseNumber: number;
  progressRatio: number;
  perfects: number;
  bestCombo: number;
  secondsRemaining: number;
  restoredLives: number;
  reviveAvailable: boolean;
}

export interface DefeatOverlayOptions {
  onTransitionComplete: () => void;
  onRevive: () => void;
  onRestart: () => void;
  onExit: () => void;
  onResult: () => void;
}

export interface DefeatLayout {
  panelX: number;
  panelY: number;
  panelWidth: number;
  panelHeight: number;
  twoColumns: boolean;
  buttonWidth: number;
  buttonHeight: number;
}

const titleStyle = new TextStyle({
  fill: '#ff91aa', fontFamily: 'system-ui, sans-serif', fontSize: 34,
  fontWeight: '900', letterSpacing: 4, align: 'center',
  dropShadow: { alpha: 0.75, blur: 12, color: '#5a0019', distance: 0 },
});
const phaseStyle = new TextStyle({
  fill: '#ffffff', fontFamily: 'system-ui, sans-serif', fontSize: 15,
  fontWeight: '900', letterSpacing: 1.4, align: 'center',
});
const infoStyle = new TextStyle({
  fill: '#b9c5e3', fontFamily: 'system-ui, sans-serif', fontSize: 13,
  fontWeight: '700', lineHeight: 22, align: 'center',
});
const statusStyle = new TextStyle({
  fill: '#8ff6dc', fontFamily: 'system-ui, sans-serif', fontSize: 11,
  fontWeight: '800', letterSpacing: 1, align: 'center',
});

const TRANSITION_DURATION = 0.46;

export class DefeatOverlay extends Container {
  private readonly veil = new Graphics();
  private readonly rupture = new Graphics();
  private readonly panel = new Graphics();
  private readonly titleText = new Text({ text: 'RITMO PERDIDO', style: titleStyle });
  private readonly phaseText = new Text({ text: '', style: phaseStyle });
  private readonly infoText = new Text({ text: '', style: infoStyle });
  private readonly statusText = new Text({ text: '', style: statusStyle });
  private readonly reviveButton: MenuButton;
  private readonly restartButton: MenuButton;
  private readonly exitButton: MenuButton;
  private readonly resultButton: MenuButton;
  private viewportWidth = 1;
  private viewportHeight = 1;
  private age = 0;
  private transitioning = false;
  private transitionReported = false;
  private reviveAvailable = false;

  constructor(private readonly options: DefeatOverlayOptions) {
    super();
    this.eventMode = 'static';
    this.visible = false;
    for (const text of [this.titleText, this.phaseText, this.infoText, this.statusText]) {
      text.anchor.set(0.5);
    }
    this.reviveButton = new MenuButton('REVIVIR · ANUNCIO', options.onRevive, 0x19745d, 50);
    this.restartButton = new MenuButton('REINTENTAR', options.onRestart, 0x334e92, 50);
    this.exitButton = new MenuButton('PLAYLIST', options.onExit, 0x242f4b, 50);
    this.resultButton = new MenuButton('VER RESULTADO', options.onResult, 0x27324f, 50);
    this.addChild(
      this.veil,
      this.rupture,
      this.panel,
      this.titleText,
      this.phaseText,
      this.infoText,
      this.statusText,
      this.reviveButton,
      this.restartButton,
      this.exitButton,
      this.resultButton,
    );
  }

  begin(summary: DefeatSummary): void {
    this.phaseText.text = `FASE ${summary.phaseNumber}/3 · ${summary.phaseName.toUpperCase()}`;
    this.infoText.text = [
      `${Math.round(summary.progressRatio * 100)}% COMPLETADO · FALTARON ${Math.ceil(summary.secondsRemaining)}s`,
      `${summary.perfects} PERFECT · MEJOR COMBO x${summary.bestCombo}`,
    ].join('\n');
    this.reviveAvailable = summary.reviveAvailable;
    this.reviveButton.visible = summary.reviveAvailable;
    this.statusText.text = summary.reviveAvailable
      ? `REVIVE DESDE LA FASE CON ${summary.restoredLives} VIDAS`
      : 'SEGUNDA OPORTUNIDAD NO DISPONIBLE';
    this.setPending(false);
    this.age = 0;
    this.transitioning = true;
    this.transitionReported = false;
    this.visible = true;
    this.setDecisionVisible(false);
    this.resize(this.viewportWidth, this.viewportHeight);
  }

  animate(deltaSeconds: number): void {
    if (!this.visible || !this.transitioning) return;
    this.age += deltaSeconds;
    const ratio = Math.min(1, this.age / TRANSITION_DURATION);
    this.veil.alpha = 0.25 + ratio * 0.67;
    this.rupture.alpha = Math.max(0, 1 - ratio);
    this.rupture.scale.set(0.75 + ratio * 1.5);
    if (ratio < 1) return;
    this.transitioning = false;
    this.setDecisionVisible(true);
    if (!this.transitionReported) {
      this.transitionReported = true;
      this.options.onTransitionComplete();
    }
  }

  hide(): void {
    this.visible = false;
    this.transitioning = false;
  }

  setPending(pending: boolean): void {
    this.reviveButton.setEnabled(this.reviveAvailable && !pending);
    this.restartButton.setEnabled(!pending);
    this.exitButton.setEnabled(!pending);
    this.resultButton.setEnabled(!pending);
    if (pending) this.statusText.text = 'PREPARANDO ANUNCIO...';
  }

  reportReviveFailure(): void {
    this.reviveAvailable = false;
    this.reviveButton.visible = false;
    this.statusText.text = 'NO SE PUDO REVIVIR · ELIGE COMO CONTINUAR';
    this.setPending(false);
    this.resize(this.viewportWidth, this.viewportHeight);
  }

  resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.hitArea = new Rectangle(0, 0, width, height);
    this.veil.clear().rect(0, 0, width, height).fill({ color: 0x03050d, alpha: 0.94 });
    this.rupture.clear().circle(width / 2, height * 0.44, Math.min(width, height) * 0.22)
      .stroke({ color: 0xff496f, alpha: 0.72, width: 4 });
    const layout = calculateDefeatLayout(width, height, this.reviveAvailable);
    this.panel.clear().roundRect(
      layout.panelX, layout.panelY, layout.panelWidth, layout.panelHeight, 22,
    ).fill({ color: 0x0a101f, alpha: 0.985 }).stroke({
      color: 0xff6687, alpha: 0.38, width: 1.2,
    });
    this.titleText.style.fontSize = layout.twoColumns ? 27 : width < 350 ? 27 : 34;
    this.titleText.position.set(width / 2, layout.panelY + 43);
    this.phaseText.position.set(width / 2, layout.panelY + 83);
    this.infoText.position.set(width / 2, layout.panelY + 131);
    this.statusText.position.set(width / 2, layout.panelY + 184);
    const buttons = this.reviveAvailable
      ? [this.reviveButton, this.restartButton, this.exitButton, this.resultButton]
      : [this.restartButton, this.exitButton, this.resultButton];
    buttons.forEach((button, index) => {
      button.resize(layout.buttonWidth);
      if (layout.twoColumns) {
        const columns = 2;
        button.position.set(
          layout.panelX + 16 + (index % columns) * (layout.buttonWidth + 10),
          layout.panelY + layout.panelHeight - 118 + Math.floor(index / columns) * 58,
        );
      } else {
        button.position.set(
          layout.panelX + 16,
          layout.panelY + layout.panelHeight - 16 - buttons.length * 56 + index * 56,
        );
      }
    });
  }

  private setDecisionVisible(visible: boolean): void {
    this.panel.visible = visible;
    this.titleText.visible = visible;
    this.phaseText.visible = visible;
    this.infoText.visible = visible;
    this.statusText.visible = visible;
    this.reviveButton.visible = visible && this.reviveAvailable;
    this.restartButton.visible = visible;
    this.exitButton.visible = visible;
    this.resultButton.visible = visible;
  }
}

export function calculateDefeatLayout(
  width: number,
  height: number,
  reviveAvailable: boolean,
): DefeatLayout {
  const twoColumns = height < 620 && width >= 540;
  const buttonCount = reviveAvailable ? 4 : 3;
  const panelWidth = Math.min(twoColumns ? 560 : 430, Math.max(286, width - 24));
  const buttonsHeight = twoColumns ? 108 : buttonCount * 56;
  const panelHeight = Math.min(height - 16, 222 + buttonsHeight);
  const panelX = (width - panelWidth) / 2;
  const panelY = Math.max(8, (height - panelHeight) / 2);
  return {
    panelX,
    panelY,
    panelWidth,
    panelHeight,
    twoColumns,
    buttonWidth: twoColumns ? (panelWidth - 42) / 2 : panelWidth - 32,
    buttonHeight: 50,
  };
}
