import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { GameMode } from '../game/modes/GameMode';
import { getGameModeLabel } from '../game/modes/GameMode';
import type { ScoreSnapshot } from '../game/score/ScoreModel';
import type { TimingGrade } from '../game/timing/TimingGrade';

const scoreStyle = new TextStyle({
  fill: '#ffffff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 24,
  fontWeight: '700',
});

const infoStyle = new TextStyle({
  fill: '#a9b5d6',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 16,
  align: 'center',
});

const timingStyle = new TextStyle({
  fill: '#ffffff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 28,
  fontWeight: '800',
  align: 'center',
});

export class GameHud extends Container {
  private readonly modeText = new Text({ text: '', style: infoStyle });
  private readonly scoreText = new Text({ text: 'Puntos: 0', style: scoreStyle });
  private readonly lifeText = new Text({ text: 'Vidas: 5/5', style: infoStyle });
  private readonly lifeBarBackground = new Graphics();
  private readonly lifeBarFill = new Graphics();
  private readonly comboText = new Text({ text: 'Toca para empezar', style: infoStyle });
  private readonly timingText = new Text({ text: '', style: timingStyle });
  private timingAge = 10;

  constructor() {
    super();
    this.addChild(
      this.modeText,
      this.scoreText,
      this.lifeText,
      this.lifeBarBackground,
      this.lifeBarFill,
      this.comboText,
      this.timingText,
    );
  }

  setMode(mode: GameMode): void {
    this.modeText.text = getGameModeLabel(mode);
  }

  update(snapshot: ScoreSnapshot): void {
    this.scoreText.text = 'Puntos: ' + snapshot.score;
    this.lifeText.text = 'Vidas: ' + snapshot.lives + '/' + snapshot.maxLives;
    const lifeRatio = snapshot.maxLives > 0 ? snapshot.lives / snapshot.maxLives : 0;
    this.lifeBarBackground.clear().roundRect(0, 0, 140, 10, 5).fill({
      color: 0x26304f,
    });
    this.lifeBarFill.clear().roundRect(0, 0, 140 * lifeRatio, 10, 5).fill({
      color: lifeRatio > 0.4 ? 0x7df2ba : 0xff7d9b,
    });
    this.comboText.text = snapshot.combo > 0
      ? 'Combo x' + snapshot.combo
      : 'Combo roto';
  }

  showTiming(grade: TimingGrade): void {
    this.timingText.text = grade === 'perfect'
      ? 'PERFECT'
      : grade === 'good'
        ? 'BIEN'
        : 'MISS';
    this.timingText.style.fill = grade === 'perfect'
      ? '#7df2ba'
      : grade === 'good'
        ? '#ffe08a'
        : '#ff7d9b';
    this.timingText.alpha = 1;
    this.timingAge = 0;
  }

  animate(deltaSeconds: number): void {
    this.timingAge += deltaSeconds;
    this.timingText.alpha = Math.max(0, 1 - this.timingAge / 0.8);
  }

  resize(width: number): void {
    this.modeText.position.set(20, 20);
    this.scoreText.position.set(20, 46);
    this.lifeText.anchor.set(1, 0);
    this.lifeText.position.set(width - 20, 22);
    this.lifeBarBackground.position.set(width - 160, 50);
    this.lifeBarFill.position.set(width - 160, 50);
    this.comboText.anchor.set(0.5, 0);
    this.comboText.position.set(width / 2, 66);
    this.timingText.anchor.set(0.5);
    this.timingText.position.set(width / 2, 108);
  }
}
