import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Scene } from '../core/scene/Scene';
import type { VisualTheme } from '../customization/ThemeTypes';
import type {
  DailyRouletteClaimResult,
  DailyRouletteOffer,
} from '../retention/DailyRouletteEngine';
import { MenuButton } from '../ui/MenuButton';

const titleStyle = new TextStyle({
  fill: '#f8fbff', fontFamily: 'system-ui, sans-serif', fontSize: 28,
  fontWeight: '900', letterSpacing: 2, align: 'center',
});
const subtitleStyle = new TextStyle({
  fill: '#aab7d8', fontFamily: 'system-ui, sans-serif', fontSize: 12,
  fontWeight: '700', align: 'center',
});
const rewardStyle = new TextStyle({
  fill: '#ffffff', fontFamily: 'system-ui, sans-serif', fontSize: 18,
  fontWeight: '900', letterSpacing: 1, align: 'center',
});
const statusStyle = new TextStyle({
  fill: '#73f4d0', fontFamily: 'system-ui, sans-serif', fontSize: 12,
  fontWeight: '800', align: 'center',
});

export interface DailyRouletteSceneOptions {
  offer: DailyRouletteOffer;
  coins: number;
  visualTheme: VisualTheme;
  onClaim: () => DailyRouletteClaimResult;
  onBack: () => void;
}

export class DailyRouletteScene implements Scene {
  readonly id = 'daily-roulette';
  readonly root = new Container();

  private readonly background = new Graphics();
  private readonly wheel = new Container();
  private readonly wheelGraphics = new Graphics();
  private readonly wheelPointer = new Graphics();
  private readonly title = new Text({ text: 'RECOMPENSA DIARIA', style: titleStyle });
  private readonly subtitle = new Text({
    text: 'UNA TIRADA GRATIS CADA DIA · EL RESULTADO NO SE REPITE',
    style: subtitleStyle,
  });
  private readonly reward = new Text({ text: '', style: rewardStyle });
  private readonly status = new Text({ text: '', style: statusStyle });
  private readonly coins = new Text({ text: '', style: subtitleStyle });
  private readonly spinButton: MenuButton;
  private readonly backButton: MenuButton;
  private readonly visualTheme: VisualTheme;
  private readonly offer: DailyRouletteOffer;
  private readonly onClaim: DailyRouletteSceneOptions['onClaim'];
  private width: number;
  private height: number;
  private spinning = false;
  private spinElapsed = 0;
  private spinStartRotation = 0;
  private spinTargetRotation = 0;
  private pendingResult: DailyRouletteClaimResult | null = null;

  constructor(width: number, height: number, options: DailyRouletteSceneOptions) {
    this.width = width;
    this.height = height;
    this.visualTheme = options.visualTheme;
    this.offer = options.offer;
    this.onClaim = options.onClaim;
    this.spinButton = new MenuButton('GIRAR RULETA', this.handleSpin, 0x3155a5, 56);
    this.backButton = new MenuButton('VOLVER', options.onBack, 0x17233e, 44);
    this.wheel.addChild(this.wheelGraphics, this.wheelPointer);
    this.root.addChild(
      this.background,
      this.wheel,
      this.title,
      this.subtitle,
      this.reward,
      this.status,
      this.coins,
      this.spinButton,
      this.backButton,
    );
    this.setInitialState(options.coins);
  }

  mount(): void {
    this.resize(this.width, this.height);
  }

  update(deltaSeconds: number): void {
    if (!this.spinning) return;
    this.spinElapsed += deltaSeconds;
    const progress = Math.min(1, this.spinElapsed / 1.35);
    const eased = 1 - Math.pow(1 - progress, 3);
    this.wheel.rotation = this.spinStartRotation
      + (this.spinTargetRotation - this.spinStartRotation) * eased;
    if (progress < 1) return;
    this.spinning = false;
    this.spinButton.setEnabled(false);
    this.revealResult();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    const landscape = width > height && width >= 650;
    const compact = !landscape && height < 650;
    const wheelRadius = Math.min(
      landscape ? height * 0.31 : width * 0.31,
      compact ? 112 : 144,
    );
    this.background.clear().rect(0, 0, width, height).fill({
      color: this.visualTheme.background.backdrop,
    });
    this.background
      .circle(width * 0.12, height * 0.18, Math.max(width, height) * 0.27)
      .fill({ color: this.visualTheme.background.phasePrimary[0], alpha: 0.05 });
    this.background
      .circle(width * 0.9, height * 0.78, Math.max(width, height) * 0.3)
      .fill({ color: this.visualTheme.background.phasePrimary[2], alpha: 0.04 });
    this.drawWheel(wheelRadius);

    this.title.style.fontSize = compact ? 23 : landscape ? 27 : 28;
    this.title.anchor.set(0.5);
    this.subtitle.anchor.set(0.5);
    this.reward.anchor.set(0.5);
    this.status.anchor.set(0.5);
    this.coins.anchor.set(1, 0);
    this.backButton.resize(82);
    this.backButton.position.set(12, 12);
    this.coins.position.set(width - 14, 18);

    if (landscape) {
      const centerX = width * 0.32;
      const centerY = height * 0.54;
      this.wheel.position.set(centerX, centerY);
      this.title.position.set(width * 0.7, height * 0.22);
      this.subtitle.position.set(width * 0.7, height * 0.29);
      this.reward.position.set(width * 0.7, height * 0.45);
      this.status.position.set(width * 0.7, height * 0.53);
      this.spinButton.resize(Math.min(330, width * 0.34));
      this.spinButton.position.set(width * 0.7 - this.spinButton.width / 2, height * 0.64);
      return;
    }

    this.wheel.position.set(width / 2, compact ? height * 0.37 : height * 0.42);
    this.title.position.set(width / 2, compact ? 70 : 82);
    this.subtitle.position.set(width / 2, compact ? 105 : 120);
    this.reward.position.set(width / 2, compact ? height * 0.64 : height * 0.68);
    this.status.position.set(width / 2, compact ? height * 0.7 : height * 0.73);
    this.spinButton.resize(Math.min(330, width - 42));
    this.spinButton.position.set((width - this.spinButton.width) / 2, Math.min(height - 76, height * 0.79));
  }

  unmount(): void {}

  private readonly handleSpin = (): void => {
    if (this.spinning || !this.offer.canClaim) return;
    const result = this.onClaim();
    if (!result.claimed) {
      this.status.text = 'LA RECOMPENSA DE HOY YA FUE RECLAMADA.';
      this.spinButton.setEnabled(false);
      return;
    }
    this.pendingResult = result;
    this.spinning = true;
    this.spinElapsed = 0;
    this.spinStartRotation = this.wheel.rotation;
    this.spinTargetRotation = this.spinStartRotation + Math.PI * 2 * 5 + this.getResultOffset(result);
    this.spinButton.setText('REVELANDO...');
    this.spinButton.setEnabled(false);
    this.status.text = 'LA RECOMPENSA YA ESTA ASEGURADA...';
  };

  private setInitialState(coins: number): void {
    this.coins.text = `${coins.toLocaleString('es-MX')} MONEDAS`;
    if (this.offer.claimed) {
      this.reward.text = this.offer.reward.label;
      this.status.text = 'RECOMPENSA DE HOY YA RECLAMADA';
      this.spinButton.setText('VUELVE MAÑANA');
      this.spinButton.setEnabled(false);
    } else {
      this.reward.text = 'RECOMPENSA OCULTA';
      this.status.text = 'TOCA GIRAR PARA DESCUBRIRLA';
    }
  }

  private revealResult(): void {
    const result = this.pendingResult;
    if (!result) return;
    this.reward.text = result.reward.label;
    this.status.text = result.duplicate
      ? `DUPLICADO · +${result.coinsAwarded.toLocaleString('es-MX')} MONEDAS`
      : result.coinsAwarded > 0
        ? `PREMIO ENTREGADO · +${result.coinsAwarded.toLocaleString('es-MX')} MONEDAS`
        : 'PREMIO DESBLOQUEADO Y GUARDADO';
    this.spinButton.setText('VUELVE MAÑANA');
  }

  private drawWheel(radius: number): void {
    const colors = [
      this.visualTheme.target.tapFill,
      this.visualTheme.target.dragFill,
      this.visualTheme.background.phasePrimary[0],
      this.visualTheme.background.phasePrimary[1],
      this.visualTheme.effects.perfect,
      this.visualTheme.effects.flowPrimary,
      this.visualTheme.effects.superPrimary,
    ];
    this.wheelGraphics.clear()
      .circle(0, 0, radius + 10)
      .fill({ color: this.visualTheme.background.superOverlayTint, alpha: 0.16 })
      .circle(0, 0, radius)
      .fill({ color: this.visualTheme.background.backdrop, alpha: 0.98 })
      .stroke({ color: this.visualTheme.target.highlight, alpha: 0.8, width: 2 });
    for (let index = 0; index < colors.length; index += 1) {
      const angle = -Math.PI / 2 + index * (Math.PI * 2 / colors.length);
      this.wheelGraphics
        .moveTo(0, 0)
        .lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
        .stroke({ color: colors[index], alpha: 0.72, width: 2 });
      this.wheelGraphics
        .circle(
          Math.cos(angle + Math.PI / colors.length) * radius * 0.68,
          Math.sin(angle + Math.PI / colors.length) * radius * 0.68,
          Math.max(6, radius * 0.08),
        )
        .fill({ color: colors[index], alpha: 0.8 });
    }
    this.wheelGraphics.circle(0, 0, Math.max(18, radius * 0.15))
      .fill({ color: this.visualTheme.target.highlight, alpha: 0.9 })
      .circle(0, 0, Math.max(7, radius * 0.06))
      .fill({ color: this.visualTheme.background.backdrop });
    this.wheelPointer.clear()
      .moveTo(-10, -radius - 18)
      .lineTo(10, -radius - 18)
      .lineTo(0, -radius - 2)
      .closePath()
      .fill({ color: this.visualTheme.effects.perfect })
      .stroke({ color: 0xffffff, alpha: 0.72, width: 1 });
  }

  private getResultOffset(result: DailyRouletteClaimResult): number {
    const index = ['coins', 'component', 'theme'].indexOf(result.reward.kind);
    return (index + (result.reward.id.length % 5)) * 0.18;
  }
}
