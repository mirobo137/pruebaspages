import type { GameMode } from '../game/modes/GameMode';

interface ProgressState {
  coins: number;
  unlockedTrackIds: string[];
}

const STORAGE_KEY = 'rhythm-circles:progression';

export class ProgressionStore {
  private state: ProgressState;

  constructor() {
    this.state = this.load();
  }

  get coins(): number {
    return this.state.coins;
  }

  isTrackUnlocked(trackId: string, catalogIndex: number): boolean {
    return catalogIndex === 0 || this.state.unlockedTrackIds.includes(trackId);
  }

  getTrackUnlockCost(catalogIndex: number): number {
    return catalogIndex === 0 ? 0 : catalogIndex * 100;
  }

  tryUnlockTrack(trackId: string, catalogIndex: number): boolean {
    if (this.isTrackUnlocked(trackId, catalogIndex)) return true;

    const cost = this.getTrackUnlockCost(catalogIndex);
    if (this.state.coins < cost) return false;

    this.state.coins -= cost;
    this.state.unlockedTrackIds.push(trackId);
    this.save();
    return true;
  }

  awardForRun(score: number, mode: GameMode): number {
    const baseReward = mode === 'survival' ? 5 : 10;
    const reward = Math.max(baseReward, Math.floor(score / 250));
    this.state.coins += reward;
    this.save();
    return reward;
  }

  private load(): ProgressState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored) as ProgressState;
    } catch {
      // Private browsing or malformed data should not prevent playing.
    }

    return { coins: 0, unlockedTrackIds: [] };
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Progression remains available for the current session.
    }
  }
}
