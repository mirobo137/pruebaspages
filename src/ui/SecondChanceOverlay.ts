import { Container, Graphics, Rectangle, Text, TextStyle } from 'pixi.js';
import { MenuButton } from './MenuButton';

export interface SecondChanceOverlayOptions {
  onRevive: () => void;
  onFinish: () => void;
}

const titleStyle = new TextStyle({
  fill: '#ffffff', fontFamily: 'system-ui, sans-serif', fontSize: 28,
  fontWeight: '900', letterSpacing: 2, align: 'center',
});
const phaseStyle = new TextStyle({
  fill: '#8ff6dc', fontFamily: 'system-ui, sans-serif', fontSize: 14,
  fontWeight: '900', letterSpacing: 1.2, align: 'center',
});
const infoStyle = new TextStyle({
  fill: '#b4c1df', fontFamily: 'system-ui, sans-serif', fontSize: 12,
  fontWeight: '700', lineHeight: 18, align: 'center',
});

export class SecondChanceOverlay extends Container {
  private readonly veil = new Graphics();
  private readonly panel = new Graphics();
  private readonly title = new Text({ text: 'SEGUNDA OPORTUNIDAD', style: titleStyle });
  private readonly phase = new Text({ text: '', style: phaseStyle });
  private readonly info = new Text({
    text: 'Reinicia esta fase con vida parcial.\nCombo, FLOW y progreso de la fase se reinician.',
    style: infoStyle,
  });
  private readonly status = new Text({ text: '', style: infoStyle });
  private readonly reviveButton: MenuButton;
  private readonly finishButton: MenuButton;

  constructor(options: SecondChanceOverlayOptions) {
    super();
    this.eventMode = 'static';
    this.visible = false;
    for (const text of [this.title, this.phase, this.info, this.status]) text.anchor.set(0.5);
    this.reviveButton = new MenuButton('REVIVIR · ANUNCIO', options.onRevive, 0x19745d, 56);
    this.finishButton = new MenuButton('VER RESULTADO', options.onFinish, 0x27324f, 56);
    this.addChild(
      this.veil,
      this.panel,
      this.title,
      this.phase,
      this.info,
      this.status,
      this.reviveButton,
      this.finishButton,
    );
  }

  show(phaseName: string, restoredLives: number): void {
    this.phase.text = `REINICIAR ${phaseName.toUpperCase()} · ${restoredLives} VIDAS`;
    this.status.text = 'UNA OPORTUNIDAD POR PARTIDA';
    this.setPending(false);
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }

  setPending(pending: boolean): void {
    this.reviveButton.setEnabled(!pending);
    this.finishButton.setEnabled(!pending);
    if (pending) this.status.text = 'PREPARANDO ANUNCIO...';
  }

  resize(width: number, height: number): void {
    this.hitArea = new Rectangle(0, 0, width, height);
    this.veil.clear().rect(0, 0, width, height).fill({ color: 0x040812, alpha: 0.9 });
    const panelWidth = Math.min(400, Math.max(270, width - 30));
    const panelHeight = Math.min(360, height - 24);
    const x = (width - panelWidth) / 2;
    const y = Math.max(12, (height - panelHeight) / 2);
    this.panel.clear().roundRect(x, y, panelWidth, panelHeight, 22)
      .fill({ color: 0x0c1825, alpha: 0.99 })
      .stroke({ color: 0x67f1ca, alpha: 0.38, width: 1.2 });
    this.title.style.fontSize = width < 350 ? 23 : 28;
    this.title.position.set(width / 2, y + 47);
    this.phase.position.set(width / 2, y + 87);
    this.info.position.set(width / 2, y + 133);
    this.status.position.set(width / 2, y + 183);
    const buttonWidth = panelWidth - 34;
    this.reviveButton.resize(buttonWidth);
    this.finishButton.resize(buttonWidth);
    this.reviveButton.position.set(x + 17, y + panelHeight - 132);
    this.finishButton.position.set(x + 17, y + panelHeight - 68);
  }
}
