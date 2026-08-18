import type { Difficulty } from '../game/difficulty/Difficulty';
import type { CustomThemeSelection } from '../customization/ThemeComponents';
import type { DailyRouletteProgress } from '../retention/DailyRouletteEngine';

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
  unlockedCosmeticIds: string[];
  equippedThemeId: string;
  customTheme: {
    slotId: 'custom-1';
    componentThemeIds: CustomThemeSelection;
  };
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
  claimedOpportunityIds: string[];
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
  dailyRoulette: DailyRouletteProgress;
}

export interface RecordedRun {
  opportunityId: string;
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
      unlockedCosmeticIds: [],
      equippedThemeId: 'neon-pulse',
      customTheme: {
        slotId: 'custom-1',
        componentThemeIds: {
          'target-palette': 'neon-pulse',
          'timing-ring': 'neon-pulse',
          'drag-trail': 'neon-pulse',
          'perfect-impact': 'neon-pulse',
          'music-visualizer': 'neon-pulse',
          'flow-background': 'neon-pulse',
          'super-flow-background': 'neon-pulse',
        },
      },
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
      claimedOpportunityIds: [],
    },
    dailyRoulette: {
      dayKey: null,
      outcomeId: null,
      claimed: false,
    },
  };
}
