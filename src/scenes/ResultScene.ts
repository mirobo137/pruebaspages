import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Scene } from '../core/scene/Scene';
import type { Difficulty } from '../game/difficulty/Difficulty';
import { getDifficultyLabel } from '../game/difficulty/Difficulty';
import type { ScoreSnapshot } from '../game/score/ScoreModel';
import type { RewardedAdStatus } from '../monetization/RewardTypes';
import { calculateWeightedAccuracy, formatStars } from '../progression/StarRating';
import { MenuButton } from '../ui/MenuButton';
import { calculateResultLayout } from './ResultLayout';

export interface ResultSceneOptions {
  trackTitle: string;
  difficulty: Difficulty;
  snapshot: ScoreSnapshot;
  flowActivations: number;
  superFlowActivations: number;
  phaseReached: number;
  completed: boolean;
  rewardCoins: number;
  earnedStars: number;
  previousStars: number;
  isNewHighScore: boolean;
  rewardedAdsAvailable: boolean;
  onDoubleCoins: () => Promise<RewardedAdStatus | 'already-granted'>;
  onBackToMenu: () => void;
}

const resultTitleStyle = new TextStyle({
  fill: '#ffffff', fontFamily: 'system-ui, sans-serif', fontSize: 30,
  fontWeight: '900', letterSpacing: 1.5, align: 'center',
});
const trackStyle = new TextStyle({
  fill: '#8feeff', fontFamily: 'system-ui, sans-serif', fontSize: 14,
  fontWeight: '800', letterSpacing: 1, align: 'center',
});
const starStyle = new TextStyle({
  fill: '#ffd76a', fontFamily: 'system-ui, sans-serif', fontSize: 42,
  fontWeight: '900', letterSpacing: 5, align: 'center',
});
const resultInfoStyle = new TextStyle({
  fill: '#dfe6ff', fontFamily: 'system-ui, sans-serif', fontSize: 16,
  lineHeight: 25, align: 'center',
});
const smallStyle = new TextStyle({
  fill: '#9dabcd', fontFamily: 'system-ui, sans-serif', fontSize: 12,
  fontWeight: '700', align: 'center',
});
const rewardStatusStyle = new TextStyle({
  fill: '#91f4d3', fontFamily: 'system-ui, sans-serif', fontSize: 10,
  fontWeight: '800', align: 'center',
});

export class ResultScene implements Scene {
  readonly id = 'result';
  readonly root = new Container();
  private readonly background = new Graphics();
  private readonly card = new Graphics();
  private readonly title = new Text({ text: '', style: resultTitleStyle });
  private readonly track = new Text({ text: '', style: trackStyle });
  private readonly stars = new Text({ text: '', style: starStyle });
  private readonly starMessage = new Text({ text: '', style: smallStyle });
  private readonly info = new Text({ text: '', style: resultInfoStyle });
  private readonly rewardStatus = new Text({ text: '', style: rewardStatusStyle });
  private readonly backButton: MenuButton;
  private readonly doubleButton: MenuButton;
  private width: number;
  private height: number;
  private offerVisible: boolean;
  private requestPending = false;
  private bonusGranted = false;

  constructor(width: number, height: number, private readonly options: ResultSceneOptions) {
    this.width = width;
    this.height = height;
    this.offerVisible = options.rewardedAdsAvailable;
    this.backButton = new MenuButton('CONTINUAR', this.handleBack);
    this.doubleButton = new MenuButton(
      `DUPLICAR +${options.rewardCoins}`,
      this.handleDoubleCoins,
      0x19745d,
    );
    for (const text of [
      this.title,
      this.track,
      this.stars,
      this.starMessage,
      this.info,
      this.rewardStatus,
    ]) text.anchor.set(0.5);
    this.root.addChild(
      this.background,
      this.card,
      this.title,
      this.track,
      this.stars,
      this.starMessage,
      this.info,
      this.rewardStatus,
      this.doubleButton,
      this.backButton,
    );
  }

  mount(): void {
    const completed = this.options.completed;
    this.title.text = completed ? 'NIVEL SUPERADO' : 'SIGUE INTENTANDO';
    this.track.text = `${this.options.trackTitle.toUpperCase()} · ${getDifficultyLabel(
      this.options.difficulty,
    ).toUpperCase()}`;
    this.stars.text = formatStars(this.options.earnedStars);
    this.stars.alpha = completed ? 1 : 0.38;
    this.starMessage.text = this.getStarMessage();
    this.rewardStatus.text = this.offerVisible
      ? `ANUNCIO OPCIONAL · RECIBE ${this.options.rewardCoins} MONEDAS EXTRA`
      : '';
    this.refreshInfo();
    this.resize(this.width, this.height);
  }

  update(): void {}

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    const layout = calculateResultLayout(width, height);
    const {
      compact,
      cardWidth,
      cardHeight,
      cardX,
      cardY,
      totalButtonWidth,
      buttonY,
    } = layout;

    this.background.clear().rect(0, 0, width, height).fill({ color: 0x070c1c });
    this.background.circle(width * 0.15, height * 0.2, Math.max(width, height) * 0.25)
      .fill({ color: 0x1686ad, alpha: 0.045 });
    this.background.circle(width * 0.88, height * 0.62, Math.max(width, height) * 0.27)
      .fill({ color: 0xc12b9e, alpha: 0.032 });
    this.card.clear().roundRect(cardX, cardY, cardWidth, cardHeight, 18)
      .fill({ color: 0x0c1429, alpha: 0.94 })
      .stroke({ color: 0x65efff, alpha: 0.32, width: 1 });
    this.card.moveTo(cardX + 20, cardY).lineTo(cardX + cardWidth * 0.42, cardY)
      .stroke({ color: 0x62efff, alpha: 0.85, width: 1.5 });
    this.card.moveTo(cardX + cardWidth * 0.68, cardY + cardHeight)
      .lineTo(cardX + cardWidth - 20, cardY + cardHeight)
      .stroke({ color: 0xff55d7, alpha: 0.65, width: 1.5 });

    this.title.style.fontSize = compact ? 25 : 30;
    this.info.style.fontSize = compact ? 13 : 16;
    this.info.style.lineHeight = compact ? 20 : 25;
    this.title.position.set(width / 2, cardY + (compact ? 37 : 48));
    this.track.position.set(width / 2, cardY + (compact ? 67 : 84));
    this.stars.position.set(width / 2, cardY + (compact ? 108 : 135));
    this.starMessage.position.set(width / 2, cardY + (compact ? 140 : 171));
    this.info.position.set(width / 2, cardY + cardHeight * (compact ? 0.68 : 0.66));

    this.rewardStatus.position.set(width / 2, buttonY - 13);
    if (this.offerVisible) {
      const gap = 10;
      const buttonWidth = (totalButtonWidth - gap) / 2;
      const startX = (width - totalButtonWidth) / 2;
      this.doubleButton.visible = true;
      this.doubleButton.resize(buttonWidth);
      this.doubleButton.position.set(startX, buttonY);
      this.backButton.resize(buttonWidth);
      this.backButton.position.set(startX + buttonWidth + gap, buttonY);
    } else {
      this.doubleButton.visible = false;
      const buttonWidth = Math.min(380, totalButtonWidth);
      this.backButton.resize(buttonWidth);
      this.backButton.position.set((width - buttonWidth) / 2, buttonY);
    }
  }

  unmount(): void {}

  private refreshInfo(): void {
    const snapshot = this.options.snapshot;
    const accuracy = Math.round(calculateWeightedAccuracy(snapshot) * 100);
    this.info.text = [
      `${snapshot.score.toLocaleString()} PUNTOS${this.options.isNewHighScore ? ' · NUEVO RECORD' : ''}`,
      `Precision ${accuracy}% · Combo maximo x${snapshot.bestCombo}`,
      `Perfect ${snapshot.perfects} · Bien ${snapshot.goods} · Fallos ${snapshot.misses}`,
      `FLOW ${this.options.flowActivations} · SUPER FLOW ${this.options.superFlowActivations}`,
      `Fase ${this.options.phaseReached}/3 · +${this.options.rewardCoins}${this.bonusGranted ? ` + ${this.options.rewardCoins} extra` : ''} monedas`,
    ].join('\n');
  }

  private getStarMessage(): string {
    if (this.options.previousStars > this.options.earnedStars) {
      return `RECORD CONSERVADO · ${formatStars(this.options.previousStars)}`;
    }
    if (this.options.earnedStars === 3) return 'DOMINIO TOTAL · 3 ESTRELLAS';
    if (this.options.earnedStars === 2) return 'BUEN RITMO · 2 ESTRELLAS';
    if (this.options.earnedStars === 1) return 'CANCION COMPLETADA · 1 ESTRELLA';
    return 'COMPLETA LAS TRES FASES PARA GANAR ESTRELLAS';
  }

  private readonly handleBack = (): void => {
    if (!this.requestPending) this.options.onBackToMenu();
  };

  private readonly handleDoubleCoins = async (): Promise<void> => {
    if (this.requestPending || this.bonusGranted || !this.offerVisible) return;
    this.requestPending = true;
    this.doubleButton.setEnabled(false);
    this.backButton.setEnabled(false);
    this.rewardStatus.text = 'PREPARANDO ANUNCIO...';
    const result = await this.options.onDoubleCoins();
    this.requestPending = false;
    this.backButton.setEnabled(true);
    if (result === 'rewarded' || result === 'already-granted') {
      this.bonusGranted = true;
      this.doubleButton.setText('MONEDAS DUPLICADAS');
      this.doubleButton.setEnabled(false);
      this.rewardStatus.text = `LISTO · +${this.options.rewardCoins} MONEDAS GUARDADAS`;
      this.refreshInfo();
      return;
    }
    if (result === 'unavailable') {
      this.offerVisible = false;
      this.rewardStatus.text = 'ANUNCIO NO DISPONIBLE · PUEDES CONTINUAR';
      this.resize(this.width, this.height);
      return;
    }
    this.doubleButton.setEnabled(true);
    this.rewardStatus.text = result === 'cancelled'
      ? 'ANUNCIO CANCELADO · TUS MONEDAS NO CAMBIARON'
      : 'NO SE PUDO COMPLETAR · TUS MONEDAS NO CAMBIARON';
  };
}
