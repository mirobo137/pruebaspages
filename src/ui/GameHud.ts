import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Difficulty } from '../game/difficulty/Difficulty';
import { getDifficultyLabel } from '../game/difficulty/Difficulty';
import type { FlowSnapshot } from '../game/flow/FlowModel';
import type { FlowMode } from '../game/flow/FlowModel';
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

const flowStyle = new TextStyle({
  fill: '#8ea7ff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 15,
  fontWeight: '900',
  letterSpacing: 2,
  align: 'center',
});

const flowBannerStyle = new TextStyle({
  fill: '#fff2a8',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 42,
  fontWeight: '900',
  letterSpacing: 4,
  align: 'center',
  dropShadow: {
    alpha: 0.8,
    blur: 12,
    color: '#6e4cff',
    distance: 0,
  },
});

export class GameHud extends Container {
  private readonly difficultyText = new Text({ text: '', style: infoStyle });
  private readonly phaseText = new Text({ text: '1/3 LECTURA · 1:30', style: infoStyle });
  private readonly scoreText = new Text({ text: 'Puntos: 0', style: scoreStyle });
  private readonly lifeText = new Text({ text: 'Vidas: 5/5', style: infoStyle });
  private readonly lifeBarBackground = new Graphics();
  private readonly lifeBarFill = new Graphics();
  private readonly comboText = new Text({ text: 'Toca para empezar', style: infoStyle });
  private readonly timingText = new Text({ text: '', style: timingStyle });
  private readonly flowLabel = new Text({ text: 'FLOW 0%', style: flowStyle });
  private readonly flowBarBackground = new Graphics();
  private readonly flowBarFill = new Graphics();
  private readonly flowBanner = new Text({ text: '', style: flowBannerStyle });
  private timingAge = 10;
  private flowBannerAge = 10;
  private displayLifeRatio = 1;
  private targetLifeRatio = 1;
  private displayFlowRatio = 0;
  private targetFlowRatio = 0;
  private flowMode: FlowMode = 'charging';
  private flowPulse = 0;
  private flowBarWidth = 240;
  private comboPunch = 0;
  private scorePunch = 0;
  private lifePulse = 0;
  private lastCombo = 0;
  private lastLives = 5;
  private lastScore = 0;

  constructor() {
    super();
    this.eventMode = 'none';
    this.addChild(
      this.difficultyText,
      this.phaseText,
      this.scoreText,
      this.lifeText,
      this.lifeBarBackground,
      this.lifeBarFill,
      this.comboText,
      this.timingText,
      this.flowBarBackground,
      this.flowBarFill,
      this.flowLabel,
      this.flowBanner,
    );
  }

  setDifficulty(difficulty: Difficulty): void {
    this.difficultyText.text = getDifficultyLabel(difficulty);
  }

  updateRunProgress(
    currentTime: number,
    duration: number,
    phaseIndex: number,
    phaseName: string,
  ): void {
    const remaining = Math.max(0, Math.ceil(duration - currentTime));
    const minutes = Math.floor(remaining / 60);
    const seconds = String(remaining % 60).padStart(2, '0');
    this.phaseText.text = (phaseIndex + 1) + '/3 '
      + phaseName + ' · ' + minutes + ':' + seconds;
  }

  update(snapshot: ScoreSnapshot): void {
    this.scoreText.text = 'Puntos: ' + snapshot.score;
    this.lifeText.text = 'Vidas: ' + snapshot.lives + '/' + snapshot.maxLives;
    this.targetLifeRatio = snapshot.maxLives > 0
      ? snapshot.lives / snapshot.maxLives
      : 0;
    if (snapshot.score > this.lastScore) this.scorePunch = 1;
    if (snapshot.combo > this.lastCombo) this.comboPunch = 1;
    if (snapshot.lives !== this.lastLives) this.lifePulse = 1;
    this.lastCombo = snapshot.combo;
    this.lastLives = snapshot.lives;
    this.lastScore = snapshot.score;
    this.lifeBarBackground.clear().roundRect(0, 0, 140, 10, 5).fill({
      color: 0x26304f,
    });
    this.comboText.text = snapshot.combo > 0
      ? 'Combo x' + snapshot.combo
      : snapshot.misses > 0
        ? 'Combo roto'
        : 'Toca para empezar';
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
    this.timingText.scale.set(0.72);
    this.timingAge = 0;
  }

  updateFlow(snapshot: FlowSnapshot): void {
    const previousMode = this.flowMode;
    this.flowMode = snapshot.mode;
    this.targetFlowRatio = snapshot.mode === 'super'
      ? snapshot.remaining / snapshot.duration
      : snapshot.mode === 'flow'
        ? snapshot.superPerfects / snapshot.superPerfectRequirement
        : snapshot.charge / snapshot.maxCharge;
    this.flowLabel.text = snapshot.mode === 'super'
      ? 'SUPER FLOW x' + snapshot.multiplier + '  ' + snapshot.remaining.toFixed(1) + 's'
      : snapshot.mode === 'flow'
        ? 'FLOW x' + snapshot.multiplier + '  ·  SUPER '
          + snapshot.superPerfects + '/' + snapshot.superPerfectRequirement
          + '  ·  ' + snapshot.remaining.toFixed(1) + 's'
        : 'FLOW ' + Math.round(this.targetFlowRatio * 100) + '%';
    this.flowLabel.style.fill = snapshot.mode === 'super'
      ? '#8ffaff'
      : snapshot.mode === 'flow'
        ? '#fff2a8'
        : '#8ea7ff';
    if (snapshot.mode !== previousMode) this.flowPulse = 1;
  }

  showFlowActivation(): void {
    this.flowBanner.text = 'FLOW x2';
    this.flowBanner.style.fill = '#fff2a8';
    this.flowBanner.alpha = 1;
    this.flowBanner.scale.set(0.45);
    this.flowBannerAge = 0;
  }

  showFlowBreak(): void {
    this.flowBanner.text = 'FLOW ROTO';
    this.flowBanner.style.fill = '#ff7d9b';
    this.flowBanner.alpha = 1;
    this.flowBanner.scale.set(0.78);
    this.flowBannerAge = 0;
  }

  showSuperFlowActivation(): void {
    this.flowBanner.text = 'SUPER FLOW x4';
    this.flowBanner.style.fill = '#8ffaff';
    this.flowBanner.alpha = 1;
    this.flowBanner.scale.set(0.32);
    this.flowBannerAge = 0;
  }

  showSuperFlowDemotion(): void {
    this.flowBanner.text = 'FLOW x2';
    this.flowBanner.style.fill = '#fff2a8';
    this.flowBanner.alpha = 1;
    this.flowBanner.scale.set(0.7);
    this.flowBannerAge = 0;
  }

  animate(deltaSeconds: number): void {
    this.timingAge += deltaSeconds;
    this.flowBannerAge += deltaSeconds;
    this.timingText.alpha = Math.max(0, 1 - this.timingAge / 0.8);
    const timingScale = this.timingText.scale.x
      + (1 - this.timingText.scale.x) * Math.min(1, deltaSeconds * 16);
    this.timingText.scale.set(timingScale);
    this.displayLifeRatio += (
      this.targetLifeRatio - this.displayLifeRatio
    ) * Math.min(1, deltaSeconds * 12);
    this.displayFlowRatio += (
      this.targetFlowRatio - this.displayFlowRatio
    ) * Math.min(1, deltaSeconds * 10);
    this.comboPunch = Math.max(0, this.comboPunch - deltaSeconds * 5.5);
    this.scorePunch = Math.max(0, this.scorePunch - deltaSeconds * 7);
    this.lifePulse = Math.max(0, this.lifePulse - deltaSeconds * 4);
    this.flowPulse = Math.max(0, this.flowPulse - deltaSeconds * 2.5);
    this.comboText.scale.set(1 + this.comboPunch * 0.22);
    this.scoreText.scale.set(1 + this.scorePunch * 0.08);
    this.lifeText.scale.set(1 + this.lifePulse * 0.08);
    this.lifeBarFill.clear().roundRect(
      0,
      0,
      140 * Math.max(0, this.displayLifeRatio),
      10,
      5,
    ).fill({
      color: this.displayLifeRatio > 0.4 ? 0x7df2ba : 0xff7d9b,
    });
    this.lifeBarFill.alpha = 0.85 + this.lifePulse * 0.15;

    const bannerProgress = Math.min(1, this.flowBannerAge / 1.05);
    this.flowBanner.alpha = Math.max(0, 1 - Math.max(0, bannerProgress - 0.42) / 0.58);
    const bannerScale = this.flowBanner.scale.x
      + (1 + Math.sin(bannerProgress * Math.PI) * 0.12 - this.flowBanner.scale.x)
      * Math.min(1, deltaSeconds * 14);
    this.flowBanner.scale.set(bannerScale);
    this.flowLabel.scale.set(1 + this.flowPulse * 0.16);
    this.flowBarBackground.clear().roundRect(0, 0, this.flowBarWidth, 11, 6).fill({
      color: this.flowMode === 'super'
        ? 0x263b52
        : this.flowMode === 'flow'
          ? 0x4b3f50
          : 0x26304f,
      alpha: 0.92,
    });
    this.flowBarFill.clear().roundRect(
      0,
      0,
      this.flowBarWidth * Math.max(0, this.displayFlowRatio),
      11,
      6,
    ).fill({
      color: this.flowMode === 'super'
        ? 0x8ffaff
        : this.flowMode === 'flow'
          ? 0xffdd72
          : 0x718cff,
    });
    this.flowBarFill.alpha = this.flowMode !== 'charging'
      ? 0.82 + Math.sin(this.flowBannerAge * 15) * 0.18
      : 0.9;
  }

  resize(width: number, height: number): void {
    this.difficultyText.position.set(20, 20);
    this.phaseText.anchor.set(0.5, 0);
    this.phaseText.position.set(width / 2, 20);
    this.scoreText.position.set(20, 46);
    this.lifeText.anchor.set(1, 0);
    this.lifeText.position.set(width - 20, 22);
    this.lifeBarBackground.position.set(width - 160, 50);
    this.lifeBarFill.position.set(width - 160, 50);
    this.comboText.anchor.set(0.5, 0);
    this.comboText.position.set(width / 2, 66);
    this.timingText.anchor.set(0.5);
    this.timingText.position.set(width / 2, 108);
    this.flowBarWidth = Math.min(300, Math.max(180, width - 80));
    this.flowLabel.anchor.set(0.5, 1);
    this.flowLabel.position.set(width / 2, height - 30);
    this.flowLabel.style.fontSize = width < 380 ? 11 : 15;
    this.flowBarBackground.position.set((width - this.flowBarWidth) / 2, height - 24);
    this.flowBarFill.position.set((width - this.flowBarWidth) / 2, height - 24);
    this.flowBanner.anchor.set(0.5);
    this.flowBanner.position.set(width / 2, height * 0.3);
    this.flowBanner.style.fontSize = width < 380 ? 31 : 42;
  }
}
