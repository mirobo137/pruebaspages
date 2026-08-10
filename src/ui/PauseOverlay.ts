import { Container, Graphics, Rectangle, Text, TextStyle } from 'pixi.js';
import { MenuButton } from './MenuButton';

export interface PauseOverlayOptions {
  onContinue: () => void;
  onRestart: () => void;
  onExit: () => void;
}

const titleStyle = new TextStyle({
  fill: '#ffffff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 32,
  fontWeight: '900',
  letterSpacing: 3,
  align: 'center',
});

const subtitleStyle = new TextStyle({
  fill: '#aebbdc',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 15,
  align: 'center',
});

export class PauseOverlay extends Container {
  private readonly veil = new Graphics();
  private readonly panel = new Graphics();
  private readonly title = new Text({ text: 'PAUSA', style: titleStyle });
  private readonly subtitle = new Text({
    text: 'La música y el tiempo están detenidos',
    style: subtitleStyle,
  });
  private readonly continueButton: MenuButton;
  private readonly restartButton: MenuButton;
  private readonly exitButton: MenuButton;

  constructor(options: PauseOverlayOptions) {
    super();
    this.eventMode = 'static';
    this.visible = false;
    this.title.anchor.set(0.5);
    this.subtitle.anchor.set(0.5);
    this.continueButton = new MenuButton('CONTINUAR', options.onContinue, 0x3958b8, 52);
    this.restartButton = new MenuButton('REINICIAR', options.onRestart, 0x263557, 52);
    this.exitButton = new MenuButton('VOLVER AL MENÚ', options.onExit, 0x202943, 52);
    this.addChild(
      this.veil,
      this.panel,
      this.title,
      this.subtitle,
      this.continueButton,
      this.restartButton,
      this.exitButton,
    );
  }

  show(): void {
    this.visible = true;
  }

  setMessage(message: string): void {
    this.subtitle.text = message;
  }

  hide(): void {
    this.visible = false;
  }

  resize(width: number, height: number): void {
    this.hitArea = new Rectangle(0, 0, width, height);
    this.veil.clear().rect(0, 0, width, height).fill({
      color: 0x050812,
      alpha: 0.82,
    });

    const panelWidth = Math.min(380, Math.max(250, width - 32));
    const buttonWidth = panelWidth - 36;
    const panelHeight = 300;
    const panelX = (width - panelWidth) / 2;
    const panelY = Math.max(8, (height - panelHeight) / 2);
    this.panel.clear().roundRect(panelX, panelY, panelWidth, panelHeight, 24).fill({
      color: 0x10172d,
      alpha: 0.98,
    });
    this.panel.roundRect(panelX, panelY, panelWidth, panelHeight, 24).stroke({
      color: 0x7f96e8,
      alpha: 0.28,
      width: 2,
    });

    this.title.position.set(width / 2, panelY + 40);
    this.subtitle.position.set(width / 2, panelY + 70);
    this.continueButton.resize(buttonWidth);
    this.restartButton.resize(buttonWidth);
    this.exitButton.resize(buttonWidth);
    this.continueButton.position.set(panelX + 18, panelY + 92);
    this.restartButton.position.set(panelX + 18, panelY + 151);
    this.exitButton.position.set(panelX + 18, panelY + 210);
  }
}
