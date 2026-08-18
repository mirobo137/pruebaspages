import type { WeeklyEventProgress } from '../progression/ProgressionTypes';

export type EventMissionKind =
  | 'complete_runs'
  | 'perfects'
  | 'best_combo'
  | 'flow_activations'
  | 'super_flow_activations';

export interface EventMissionDefinition {
  id: string;
  label: string;
  kind: EventMissionKind;
  target: number;
  pointStep: number;
  pointsPerStep: number;
}

export interface EventRewardDefinition {
  id: string;
  label: string;
  pointsRequired: number;
  cosmeticSlot:
    | 'target-palette'
    | 'timing-ring'
    | 'drag-trail'
    | 'perfect-impact'
    | 'music-visualizer'
    | 'flow-background'
    | 'super-flow-background'
    | 'complete-theme';
}

export interface WeeklyEventCampaign {
  id: string;
  name: string;
  themeId: string;
  startsAt: string;
  endsAt: string;
  missions: readonly EventMissionDefinition[];
  rewards: readonly EventRewardDefinition[];
}

export interface EventWeekWindow {
  weekKey: string;
  startsAt: number;
  endsAt: number;
}

export interface ActiveWeeklyEvent {
  id: string;
  campaign: WeeklyEventCampaign;
  week: EventWeekWindow;
}

export interface EventRunInput {
  completed: boolean;
  perfects: number;
  bestCombo: number;
  flowActivations: number;
  superFlowActivations: number;
}

export interface WeeklyEventSnapshot {
  activeEvent: ActiveWeeklyEvent | null;
  progress: WeeklyEventProgress;
  changed: boolean;
  completedMissionIds: readonly string[];
  claimableRewardIds: readonly string[];
}

export interface EventClaimResult {
  claimed: boolean;
  reward: EventRewardDefinition | null;
  progress: WeeklyEventProgress;
}
