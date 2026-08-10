import { Container, Graphics, Rectangle, Text, TextStyle } from 'pixi.js';
import type { Scene } from '../core/scene/Scene';
import { NeonTitleBackdrop } from '../ui/NeonTitleBackdrop';

export interface TitleSceneOptions {
  onEnter: () => void;
}

const eyebrowStyle = new TextStyle({
  fill: '#95a8d7',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 12,
  fontWeight: '700',
  letterSpacing: 5,
  align: 'center',
});

const titleStyle = new TextStyle({
  fill: '#f8fbff',
  fontFamily: 'Arial Black, system-ui, sans-serif',
  fontSize: 58,
  fontWeight: '900',
  letterSpacing: 2,
  align: 'center',
});

const subtitleStyle = new TextStyle({
  fill: '#67efff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 15,
  fontWeight: '800',
  letterSpacing: 7,
  align: 'center',
});

const taglineStyle = new TextStyle({
  fill: '#aeb9d7',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
  fontWeight: '600',
  letterSpacing: 1.5,
  align: 'center',
});

const promptStyle = new TextStyle({
  fill: '#ffffff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 14,
  fontWeight: '900',
  letterSpacing: 2.5,
  align: 'center',
});

export class TitleScene implements Scene {
  readonly id = 'title';
  readonly root = new Container();

  private readonly backdrop = new NeonTitleBackdrop();
  private readonly logo = new Container();
  private readonly logoGeometry = new Graphics();
  private readonly titleGhostCyan = new Text({ text: 'SUPERFLOW', style: titleStyle });
  private readonly titleGhostMagenta = new Text({ text: 'SUPERFLOW', style: titleStyle });
  private readonly title = new Text({ text: 'SUPERFLOW', style: titleStyle });
  private readonly eyebrow = new Text({ text: 'ENTER THE BEAT', style: eyebrowStyle });
  private readonly subtitle = new Text({ text: 'RHYTHM RUSH', style: subtitleStyle });
  private readonly tagline = new Text({ text: 'TOCA EL RITMO. ENTRA EN FLOW.', style: taglineStyle });
  private readonly callToAction = new Container();
  private readonly buttonGlow = new Graphics();
  private readonly buttonFrame = new Graphics();
  private readonly prompt = new Text({ text: 'TOCA PARA ENTRAR', style: promptStyle });
  private readonly footer = new Text({
    text: 'MÚSICA  ·  PRECISIÓN  ·  FLOW',
    style: new TextStyle({
      fill: '#59698f',
      fontFamily: 'system-ui, sans-serif',
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 2,
      align: 'center',
    }),
  });
  private readonly onEnter: () => void;
  private width: number;
  private height: number;
  private elapsed = 0;
  private exitElapsed = 0;
  private exiting = false;
  private callbackSent = false;
  private logoBaseY = 0;
  private ctaBaseY = 0;

  constructor(width: number, height: number, options: TitleSceneOptions) {
    this.width = width;
    this.height = height;
    this.onEnter = options.onEnter;

    this.root.eventMode = 'static';
    this.root.cursor = 'pointer';
    this.logo.eventMode = 'none';
    this.callToAction.eventMode = 'none';
    this.titleGhostCyan.tint = 0x2eeeff;
    this.titleGhostCyan.alpha = 0.34;
    this.titleGhostMagenta.tint = 0xff3bd4;
    this.titleGhostMagenta.alpha = 0.3;

    for (const text of [
      this.titleGhostCyan,
      this.titleGhostMagenta,
      this.title,
      this.eyebrow,
      this.subtitle,
      this.tagline,
      this.prompt,
      this.footer,
    ]) {
      text.anchor.set(0.5);
    }

    this.logo.addChild(
      this.logoGeometry,
      this.eyebrow,
      this.titleGhostCyan,
      this.titleGhostMagenta,
      this.title,
      this.subtitle,
      this.tagline,
    );
    this.callToAction.addChild(this.buttonGlow, this.buttonFrame, this.prompt);
    this.root.addChild(this.backdrop, this.logo, this.callToAction, this.footer);
  }

  mount(): void {
    this.root.on('pointertap', this.handleEnter);
    this.resize(this.width, this.height);
  }

  update(deltaSeconds: number): void {
    this.elapsed += deltaSeconds;
    this.backdrop.updateBackdrop(deltaSeconds);

    const entrance = Math.min(1, this.elapsed / 0.75);
    const easedEntrance = 1 - Math.pow(1 - entrance, 3);
    const floatY = Math.sin(this.elapsed * 1.15) * 3;
    this.logo.position.y = this.logoBaseY + floatY + (1 - easedEntrance) * 24;
    this.logo.alpha = easedEntrance;
    this.logo.scale.set(0.94 + easedEntrance * 0.06);

    const promptPulse = 0.78 + (Math.sin(this.elapsed * 3.1) + 1) * 0.11;
    this.callToAction.position.y = this.ctaBaseY + Math.sin(this.elapsed * 1.7) * 2;
    this.callToAction.alpha = Math.max(0, Math.min(1, (this.elapsed - 0.3) / 0.55)) * promptPulse;
    this.buttonGlow.scale.set(1 + Math.sin(this.elapsed * 2.4) * 0.025);

    if (!this.exiting) return;

    this.exitElapsed += deltaSeconds;
    const progress = Math.min(1, this.exitElapsed / 0.34);
    this.logo.alpha = 1 - progress;
    this.logo.scale.set(1 + progress * 0.13);
    this.callToAction.alpha = 1 - progress;
    this.footer.alpha = 1 - progress;

    if (progress >= 1 && !this.callbackSent) {
      this.callbackSent = true;
      this.onEnter();
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.root.hitArea = new Rectangle(0, 0, width, height);
    this.backdrop.resize(width, height);

    const compact = width < 390;
    const landscape = width > height;
    const titleFontSize = landscape
      ? Math.min(64, Math.max(42, height * 0.12))
      : Math.min(62, Math.max(compact ? 42 : 48, width * 0.145));
    this.title.style.fontSize = titleFontSize;
    this.titleGhostCyan.style.fontSize = titleFontSize;
    this.titleGhostMagenta.style.fontSize = titleFontSize;
    this.subtitle.style.fontSize = compact ? 12 : 15;
    this.tagline.style.fontSize = compact ? 11 : 13;

    this.logoBaseY = landscape ? height * 0.4 : height * 0.39;
    this.logo.position.set(width / 2, this.logoBaseY);
    this.eyebrow.position.set(0, -titleFontSize * 1.02);
    this.title.position.set(0, -titleFontSize * 0.08);
    this.titleGhostCyan.position.set(-2, -titleFontSize * 0.08 + 2);
    this.titleGhostMagenta.position.set(3, -titleFontSize * 0.08 - 1);
    this.subtitle.position.set(0, titleFontSize * 0.73);
    this.tagline.position.set(0, titleFontSize * 1.3);

    const logoRadius = Math.min(width, height) * (landscape ? 0.25 : 0.32);
    this.logoGeometry.clear();
    this.logoGeometry
      .arc(0, 0, logoRadius, -2.8, -0.55)
      .stroke({ color: 0x54edff, alpha: 0.34, width: 1.3 });
    this.logoGeometry
      .arc(0, 0, logoRadius, 0.25, 2.15)
      .stroke({ color: 0xff4dd5, alpha: 0.28, width: 1.1 });
    this.logoGeometry
      .moveTo(-logoRadius * 0.58, titleFontSize * 0.53)
      .lineTo(-logoRadius * 0.15, titleFontSize * 0.53)
      .stroke({ color: 0x62ecff, alpha: 0.7, width: 1 });
    this.logoGeometry
      .moveTo(logoRadius * 0.15, titleFontSize * 0.53)
      .lineTo(logoRadius * 0.58, titleFontSize * 0.53)
      .stroke({ color: 0xff5bd8, alpha: 0.65, width: 1 });

    const buttonWidth = Math.min(320, Math.max(230, width - 64));
    const buttonHeight = 58;
    this.ctaBaseY = landscape ? height * 0.78 : Math.min(height - 126, height * 0.73);
    this.callToAction.position.set(width / 2, this.ctaBaseY);
    this.buttonGlow.clear();
    this.buttonGlow
      .roundRect(-buttonWidth / 2 - 5, -buttonHeight / 2 - 5, buttonWidth + 10, buttonHeight + 10, 18)
      .fill({ color: 0x2ccfe8, alpha: 0.045 })
      .stroke({ color: 0x3cefff, alpha: 0.12, width: 7 });
    this.buttonFrame.clear();
    this.buttonFrame
      .roundRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15)
      .fill({ color: 0x101733, alpha: 0.82 })
      .stroke({ color: 0x65efff, alpha: 0.82, width: 1.2 });
    this.buttonFrame
      .moveTo(-buttonWidth / 2 + 18, buttonHeight / 2)
      .lineTo(buttonWidth * 0.05, buttonHeight / 2)
      .stroke({ color: 0xff54d7, alpha: 0.85, width: 2 });
    this.buttonFrame
      .moveTo(buttonWidth * 0.2, -buttonHeight / 2)
      .lineTo(buttonWidth / 2 - 18, -buttonHeight / 2)
      .stroke({ color: 0x66f4ff, alpha: 0.82, width: 2 });

    this.footer.position.set(width / 2, height - Math.max(25, height * 0.045));
  }

  unmount(): void {
    this.root.off('pointertap', this.handleEnter);
  }

  private readonly handleEnter = (): void => {
    if (this.exiting) return;
    this.exiting = true;
    this.exitElapsed = 0;
    this.backdrop.activate();
    if ('vibrate' in navigator) navigator.vibrate(8);
  };
}
