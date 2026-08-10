import type { Difficulty } from '../game/difficulty/Difficulty';

export interface PerformanceRecord {
  stars: number;
  highScore: number;
  bestCombo: number;
  bestAccuracy: number;
  bestPerfects: number;
  fewestMisses: number;
  attempts: number;
  completions: number;
  bestFlowActivations: number;
  bestSuperFlowActivations: number;
  lastPlayedAt: number;
}

export type TrackProgress = Partial<Record<Difficulty, PerformanceRecord>>;

export interface ProgressState {
  version: 2;
  coins: number;
  unlockedTrackIds: string[];
  records: Record<string, TrackProgress>;
  totalRuns: number;
}

export interface RecordedRun {
  rewardCoins: number;
  earnedStars: number;
  previousStars: number;
  isNewHighScore: boolean;
  record: PerformanceRecord;
}

export function createEmptyProgressState(): ProgressState {
  return {
    version: 2,
    coins: 0,
    unlockedTrackIds: [],
    records: {},
    totalRuns: 0,
  };
}
