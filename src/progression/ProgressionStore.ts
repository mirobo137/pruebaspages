import type { Difficulty } from '../game/difficulty/Difficulty';
import { getSongPrice } from '../content/SongEconomy';
import type { FlowSnapshot } from '../game/flow/FlowModel';
import type { ScoreSnapshot } from '../game/score/ScoreModel';
import { LocalProgressStorage } from '../platform/LocalProgressStorage';
import type {
  PerformanceRecord,
  MenuPreferences,
  ProgressState,
  RecordedRun,
} from './ProgressionTypes';
import { calculateStarRating, calculateWeightedAccuracy } from './StarRating';
import { calculateCoinReward } from './Economy';

export class ProgressionStore {
  private readonly storage = new LocalProgressStorage();
  private state: ProgressState;

  constructor() {
    this.state = this.storage.load();
  }

  get coins(): number {
    return this.state.coins;
  }

  get totalRuns(): number {
    return this.state.totalRuns;
  }

  get menuPreferences(): MenuPreferences {
    return { ...this.state.menuPreferences };
  }

  setMenuPreferences(selectedTrackId: string | null, difficulty: Difficulty): void {
    const current = this.state.menuPreferences;
    if (
      current.selectedTrackId === selectedTrackId
      && current.difficulty === difficulty
    ) return;

    this.state.menuPreferences = { selectedTrackId, difficulty };
    this.save();
  }

  isTrackUnlocked(trackId: string): boolean {
    return getSongPrice(trackId) === 0
      || this.state.unlockedTrackIds.includes(trackId);
  }

  getTrackUnlockCost(trackId: string): number {
    return getSongPrice(trackId);
  }

  tryUnlockTrack(trackId: string): boolean {
    if (this.isTrackUnlocked(trackId)) return true;

    const cost = this.getTrackUnlockCost(trackId);
    if (this.state.coins < cost) return false;

    this.state.coins -= cost;
    this.state.unlockedTrackIds.push(trackId);
    this.save();
    return true;
  }

  getRecord(trackId: string, difficulty: Difficulty): PerformanceRecord | null {
    return this.state.records[trackId]?.[difficulty] ?? null;
  }

  recordRun(
    trackId: string,
    difficulty: Difficulty,
    snapshot: ScoreSnapshot,
    flow: FlowSnapshot,
    completed: boolean,
  ): RecordedRun {
    const rewardCoins = calculateCoinReward(snapshot, difficulty, completed);
    const earnedStars = calculateStarRating(snapshot, completed);
    const accuracy = calculateWeightedAccuracy(snapshot);
    const previous = this.getRecord(trackId, difficulty);
    const previousStars = previous?.stars ?? 0;
    const isNewHighScore = snapshot.score > (previous?.highScore ?? 0);
    const record: PerformanceRecord = {
      stars: Math.max(previousStars, earnedStars),
      highScore: Math.max(previous?.highScore ?? 0, snapshot.score),
      bestCombo: Math.max(previous?.bestCombo ?? 0, snapshot.bestCombo),
      bestAccuracy: Math.max(previous?.bestAccuracy ?? 0, accuracy),
      bestPerfects: Math.max(previous?.bestPerfects ?? 0, snapshot.perfects),
      fewestMisses: previous
        ? Math.min(previous.fewestMisses, snapshot.misses)
        : snapshot.misses,
      attempts: (previous?.attempts ?? 0) + 1,
      completions: (previous?.completions ?? 0) + (earnedStars > 0 ? 1 : 0),
      bestFlowActivations: Math.max(
        previous?.bestFlowActivations ?? 0,
        flow.activations,
      ),
      bestSuperFlowActivations: Math.max(
        previous?.bestSuperFlowActivations ?? 0,
        flow.superActivations,
      ),
      lastPlayedAt: Date.now(),
    };

    this.state.records[trackId] ??= {};
    this.state.records[trackId][difficulty] = record;
    this.state.totalRuns += 1;
    this.state.coins += rewardCoins;
    this.save();

    return {
      rewardCoins,
      earnedStars,
      previousStars,
      isNewHighScore,
      record,
    };
  }

  private save(): void {
    this.storage.save(this.state);
  }
}
