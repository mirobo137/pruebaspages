import type { WeeklyEventProgress } from '../progression/ProgressionTypes';
import type {
  EventMissionDefinition,
  EventRunInput,
  WeeklyEventCampaign,
} from './EventTypes';

export interface MissionEvaluationResult {
  missionProgress: Record<string, number>;
  points: number;
  completedMissionIds: string[];
}

export function evaluateEventRun(
  campaign: WeeklyEventCampaign,
  current: WeeklyEventProgress,
  input: EventRunInput,
): MissionEvaluationResult {
  const missionProgress = { ...current.missionProgress };
  for (const mission of campaign.missions) {
    const previous = sanitizeProgress(missionProgress[mission.id]);
    const contribution = getContribution(mission, input);
    missionProgress[mission.id] = Math.min(
      mission.target,
      mission.kind === 'best_combo'
        ? Math.max(previous, contribution)
        : previous + contribution,
    );
  }
  return summarizeMissionProgress(campaign, missionProgress);
}

export function summarizeMissionProgress(
  campaign: WeeklyEventCampaign,
  progress: Record<string, number>,
): MissionEvaluationResult {
  const missionProgress: Record<string, number> = {};
  const completedMissionIds: string[] = [];
  let points = 0;
  for (const mission of campaign.missions) {
    const value = Math.min(mission.target, sanitizeProgress(progress[mission.id]));
    missionProgress[mission.id] = value;
    points += Math.floor(value / mission.pointStep) * mission.pointsPerStep;
    if (value >= mission.target) completedMissionIds.push(mission.id);
  }
  return { missionProgress, points, completedMissionIds };
}

function getContribution(
  mission: EventMissionDefinition,
  input: EventRunInput,
): number {
  switch (mission.kind) {
    case 'complete_runs':
      return input.completed ? 1 : 0;
    case 'perfects':
      return sanitizeProgress(input.perfects);
    case 'best_combo':
      return sanitizeProgress(input.bestCombo);
    case 'flow_activations':
      return sanitizeProgress(input.flowActivations);
    case 'super_flow_activations':
      return sanitizeProgress(input.superFlowActivations);
  }
}

function sanitizeProgress(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}
