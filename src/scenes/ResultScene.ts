import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Scene } from '../core/scene/Scene';
import type { Difficulty } from '../game/difficulty/Difficulty';
import { getDifficultyLabel } from '../game/difficulty/Difficulty';
import type { ScoreSnapshot } from '../game/score/ScoreModel';
import { calculateWeightedAccuracy, formatStars } from '../progression/StarRating';
import { MenuButton } from '../ui/MenuButton';

export interface ResultSceneOptions {
  trackTitle: string;
  difficulty: Difficulty;
  snapshot: ScoreSnapshot;
  flowActivations: number;
  superFlowActivations: number;
  phaseReached: number;
  rewardCoins: number;
  earnedStars: number;
  previousStars: number;
  isNewHighScore: boolean;
  onBackToMenu: () => void;
}

const resultTitleStyle = new TextStyle({
  fill: '#ffffff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 30,
  fontWeight: '900',
  letterSpacing: 1.5,
  align: 'center',
});

const trackStyle = new TextStyle({
  fill: '#8feeff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 14,
  fontWeight: '800',
  letterSpacing: 1,
  align: 'center',
});

const starStyle = new TextStyle({
  fill: '#ffd76a',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 42,
  fontWeight: '900',
  letterSpacing: 5,
  align: 'center',
});

const resultInfoStyle = new TextStyle({
  fill: '#dfe6ff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 16,
  lineHeight: 25,
  align: 'center',
});

export class ResultScene implements Scene {
  readonly id = 'result';
  readonly root = new Container();
  private readonly background = new Graphics();
  private readonly card = new Graphics();
  private readonly title = new Text({ text: '', style: resultTitleStyle });
  private readonly track = new Text({ text: '', style: trackStyle });
  private readonly stars = new Text({ text: '', style: starStyle });
  private readonly starMessage = new Text({
    text: '',
    style: new TextStyle({
      fill: '#9dabcd',
      fontFamily: 'system-ui, sans-serif',
      fontSize: 12,
      fontWeight: '700',
      align: 'center',
    }),
  });
  private readonly info = new Text({ text: '', style: resultInfoStyle });
  private readonly backButton: MenuButton;
  private width: number;
  private height: number;
  private readonly options: ResultSceneOptions;

  constructor(width: number, height: number, options: ResultSceneOptions) {
    this.width = width;
    this.height = height;
    this.options = options;
    this.backButton = new MenuButton('VOLVER A CANCIONES', this.handleBack);
    for (const text of [this.title, this.track, this.stars, this.starMessage, this.info]) {
      text.anchor.set(0.5);
    }
    this.root.addChild(
      this.background,
      this.card,
      this.title,
      this.track,
      this.stars,
      this.starMessage,
      this.info,
      this.backButton,
    );
  }

  mount(): void {
    const snapshot = this.options.snapshot;
    const completed = this.options.earnedStars > 0;
    const accuracy = Math.round(calculateWeightedAccuracy(snapshot) * 100);
    this.title.text = completed ? 'NIVEL SUPERADO' : 'SIGUE INTENTANDO';
    this.track.text = `${this.options.trackTitle.toUpperCase()} · ${getDifficultyLabel(
      this.options.difficulty,
    ).toUpperCase()}`;
    this.stars.text = formatStars(this.options.earnedStars);
    this.stars.alpha = completed ? 1 : 0.38;
    this.starMessage.text = this.getStarMessage();
    this.info.text = [
      `${snapshot.score.toLocaleString()} PUNTOS${this.options.isNewHighScore ? '  ·  NUEVO RÉCORD' : ''}`,
      `Precisión ${accuracy}%  ·  Combo máximo x${snapshot.bestCombo}`,
      `Perfect ${snapshot.perfects}  ·  Bien ${snapshot.goods}  ·  Fallos ${snapshot.misses}`,
      `FLOW ${this.options.flowActivations}  ·  SUPER FLOW ${this.options.superFlowActivations}`,
      `Fase ${this.options.phaseReached}/3  ·  +${this.options.rewardCoins} monedas`,
    ].join('\n');
    this.resize(this.width, this.height);
  }

  update(): void {}

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    const cardWidth = Math.min(520, Math.max(280, width - 30));
    const cardHeight = Math.min(470, height - 150);
    const cardX = (width - cardWidth) / 2;
    const cardY = Math.max(50, (height - cardHeight - 90) / 2);

    this.background.clear().rect(0, 0, width, height).fill({ color: 0x070c1c });
    this.background
      .circle(width * 0.15, height * 0.2, Math.max(width, height) * 0.25)
      .fill({ color: 0x1686ad, alpha: 0.045 });
    this.background
      .circle(width * 0.88, height * 0.62, Math.max(width, height) * 0.27)
      .fill({ color: 0xc12b9e, alpha: 0.032 });
    this.card.clear()
      .roundRect(cardX, cardY, cardWidth, cardHeight, 18)
      .fill({ color: 0x0c1429, alpha: 0.94 })
      .stroke({ color: 0x65efff, alpha: 0.32, width: 1 });
    this.card
      .moveTo(cardX + 20, cardY)
      .lineTo(cardX + cardWidth * 0.42, cardY)
      .stroke({ color: 0x62efff, alpha: 0.85, width: 1.5 });
    this.card
      .moveTo(cardX + cardWidth * 0.68, cardY + cardHeight)
      .lineTo(cardX + cardWidth - 20, cardY + cardHeight)
      .stroke({ color: 0xff55d7, alpha: 0.65, width: 1.5 });

    this.title.position.set(width / 2, cardY + 48);
    this.track.position.set(width / 2, cardY + 84);
    this.stars.position.set(width / 2, cardY + 135);
    this.starMessage.position.set(width / 2, cardY + 171);
    this.info.position.set(width / 2, cardY + cardHeight * 0.66);

    const buttonWidth = Math.min(380, Math.max(240, width - 46));
    this.backButton.resize(buttonWidth);
    this.backButton.position.set((width - buttonWidth) / 2, Math.min(height - 78, cardY + cardHeight + 18));
  }

  unmount(): void {}

  private getStarMessage(): string {
    if (this.options.previousStars > this.options.earnedStars) {
      return `RÉCORD CONSERVADO · ${formatStars(this.options.previousStars)}`;
    }
    if (this.options.earnedStars === 3) return 'DOMINIO TOTAL · 3 ESTRELLAS';
    if (this.options.earnedStars === 2) return 'BUEN RITMO · 2 ESTRELLAS';
    if (this.options.earnedStars === 1) return 'CANCIÓN COMPLETADA · 1 ESTRELLA';
    return 'COMPLETA LAS TRES FASES PARA GANAR ESTRELLAS';
  }

  private readonly handleBack = (): void => {
    this.options.onBackToMenu();
  };
}
