export interface PlatformServices {
  getBestScore(gameId: string): number;
  saveBestScore(gameId: string, score: number): void;
}

export class LocalPlatformServices implements PlatformServices {
  getBestScore(gameId: string): number {
    return Number(localStorage.getItem(`best-score:${gameId}`) ?? 0);
  }

  saveBestScore(gameId: string, score: number): void {
    const currentBest = this.getBestScore(gameId);
    if (score > currentBest) {
      localStorage.setItem(`best-score:${gameId}`, String(score));
    }
  }
}

