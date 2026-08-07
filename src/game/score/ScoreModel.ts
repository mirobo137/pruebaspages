import type { TimingGrade } from '../timing/TimingGrade';
import { GAME_CONFIG } from '../config';

export interface ScoreSnapshot {
  score: number;
  combo: number;
  bestCombo: number;
  lives: number;
  maxLives: number;
  perfects: number;
  goods: number;
  misses: number;
}

export class ScoreModel {
  private score = 0;
  private combo = 0;
  private bestCombo = 0;
  private lives: number;
  private perfects = 0;
  private goods = 0;
  private misses = 0;

  constructor(private readonly maxLives: number) {
    this.lives = maxLives;
  }

  register(grade: TimingGrade): void {
    if (grade === 'miss') {
      this.misses += 1;
      this.combo = 0;
      this.lives = Math.max(0, this.lives - 1);
      return;
    }

    const baseScore = grade === 'perfect'
      ? GAME_CONFIG.perfectScore
      : GAME_CONFIG.goodScore;
    this.score += baseScore + this.combo * GAME_CONFIG.comboBonus;
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);

    if (grade === 'perfect') {
      this.perfects += 1;
      this.lives = Math.min(this.maxLives, this.lives + 1);
    } else {
      this.goods += 1;
    }
  }

  isGameOver(): boolean {
    return this.lives <= 0;
  }

  snapshot(): ScoreSnapshot {
    return {
      score: this.score,
      combo: this.combo,
      bestCombo: this.bestCombo,
      lives: this.lives,
      maxLives: this.maxLives,
      perfects: this.perfects,
      goods: this.goods,
      misses: this.misses,
    };
  }
}
