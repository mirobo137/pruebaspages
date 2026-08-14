import type { Difficulty } from '../game/difficulty/Difficulty';
import type { RewardedAdStatus, RewardedPlacement } from '../monetization/RewardTypes';
import type { GameplayMissReason } from '../input/GameplayInputTelemetry';
import type { GameplayInputProfileId } from '../input/GameplayResultContext';

export type TelemetryRewardOutcome = RewardedAdStatus | 'already-granted';

export type TelemetryEvent =
  | { type: 'session_started'; dayKey: string }
  | { type: 'daily_return'; dayKey: string; daysSinceLastVisit: number }
  | { type: 'song_started'; trackId: string; difficulty: Difficulty }
  | {
    type: 'song_finished';
    trackId: string;
    difficulty: Difficulty;
    completed: boolean;
    stars: number;
    score: number;
    inputProfileId: GameplayInputProfileId;
    spatialModelVersion: string;
    accuracy: number;
    bestCombo: number;
    misses: number;
    missReasons: Partial<Record<GameplayMissReason, number>>;
    flowActivations: number;
    superFlowActivations: number;
    pointerDistance: number;
    emptyPresses: number;
    averageTravelDistance: number;
    maximumRequiredSpeed: number;
    averageDragLength: number;
  }
  | { type: 'weekly_event_visible'; eventId: string }
  | { type: 'weekly_event_opened'; eventId: string }
  | { type: 'weekly_event_progressed'; eventId: string; points: number }
  | { type: 'weekly_reward_claimed'; eventId: string; rewardId: string; completed: boolean }
  | { type: 'rewarded_offer_visible'; placement: RewardedPlacement }
  | { type: 'rewarded_offer_interacted'; placement: RewardedPlacement }
  | { type: 'rewarded_offer_outcome'; placement: RewardedPlacement; outcome: TelemetryRewardOutcome };

export interface TelemetryRecord {
  at: number;
  event: TelemetryEvent;
}

export interface TelemetrySink {
  track(record: TelemetryRecord): void;
}

export class NoopTelemetrySink implements TelemetrySink {
  track(): void {}
}
