export interface ScoreSnapshot {
  score: number;
  combo: number;
  bestCombo: number;
}

export class ScoreModel {
  private score = 0;
  private combo = 0;
  private bestCombo = 0;

  hit(baseScore: number, comboBonus: number): void {
    this.score += baseScore + this.combo * comboBonus;
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
  }

  miss(): void {
    this.combo = 0;
  }

  snapshot(): ScoreSnapshot {
    return {
      score: this.score,
      combo: this.combo,
      bestCombo: this.bestCombo,
    };
  }
}

