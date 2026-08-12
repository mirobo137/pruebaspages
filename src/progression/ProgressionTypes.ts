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

export interface MenuPreferences {
  selectedTrackId: string | null;
  difficulty: Difficulty;
}

export interface CustomizationProgress {
  unlockedThemeIds: string[];
  equippedThemeId: string;
}

export interface WeeklyEventProgress {
  eventId: string | null;
  weekKey: string | null;
  points: number;
  claimedRewardIds: string[];
  missionProgress: Record<string, number>;
}

export interface RewardedLimitsProgress {
  dayKey: string | null;
  usedRewardIds: string[];
}

export interface ProgressState {
  version: 3;
  coins: number;
  unlockedTrackIds: string[];
  records: Record<string, TrackProgress>;
  totalRuns: number;
  menuPreferences: MenuPreferences;
  customization: CustomizationProgress;
  weeklyEvent: WeeklyEventProgress;
  rewardedLimits: RewardedLimitsProgress;
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
    version: 3,
    coins: 0,
    unlockedTrackIds: [],
    records: {},
    totalRuns: 0,
    menuPreferences: {
      selectedTrackId: null,
      difficulty: 'medium',
    },
    customization: {
      unlockedThemeIds: ['neon-pulse', 'cyber-sakura'],
      equippedThemeId: 'neon-pulse',
    },
    weeklyEvent: {
      eventId: null,
      weekKey: null,
      points: 0,
      claimedRewardIds: [],
      missionProgress: {},
    },
    rewardedLimits: {
      dayKey: null,
      usedRewardIds: [],
    },
  };
}
