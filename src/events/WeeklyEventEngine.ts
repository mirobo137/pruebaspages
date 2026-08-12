import type { WeeklyEventProgress } from '../progression/ProgressionTypes';
import { getUtcWeekWindow } from './EventClock';
import { evaluateEventRun, summarizeMissionProgress } from './EventMissionEvaluator';
import type {
  ActiveWeeklyEvent,
  EventClaimResult,
  EventRunInput,
  WeeklyEventCampaign,
  WeeklyEventSnapshot,
} from './EventTypes';

export function resolveActiveWeeklyEvent(
  catalog: readonly WeeklyEventCampaign[],
  date: Date,
): ActiveWeeklyEvent | null {
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) return null;
  const campaign = catalog.find((candidate) => (
    timestamp >= Date.parse(candidate.startsAt)
    && timestamp < Date.parse(candidate.endsAt)
  ));
  if (!campaign) return null;
  const week = getUtcWeekWindow(date);
  return {
    id: `${campaign.id}:${week.weekKey}`,
    campaign,
    week,
  };
}

export function evaluateWeeklyEventRun(
  catalog: readonly WeeklyEventCampaign[],
  stored: WeeklyEventProgress,
  input: EventRunInput,
  date: Date,
): WeeklyEventSnapshot {
  const activeEvent = resolveActiveWeeklyEvent(catalog, date);
  if (!activeEvent) {
    return {
      activeEvent: null,
      progress: cloneProgress(stored),
      changed: false,
      completedMissionIds: [],
      claimableRewardIds: [],
    };
  }

  const current = stored.eventId === activeEvent.id
    ? cloneProgress(stored)
    : createEventProgress(activeEvent);
  const evaluation = evaluateEventRun(activeEvent.campaign, current, input);
  const progress: WeeklyEventProgress = {
    ...current,
    points: evaluation.points,
    missionProgress: evaluation.missionProgress,
  };
  return {
    activeEvent,
    progress,
    changed: !progressEquals(stored, progress),
    completedMissionIds: evaluation.completedMissionIds,
    claimableRewardIds: getClaimableRewardIds(activeEvent, progress),
  };
}

export function getWeeklyEventSnapshot(
  catalog: readonly WeeklyEventCampaign[],
  stored: WeeklyEventProgress,
  date: Date,
): WeeklyEventSnapshot {
  const activeEvent = resolveActiveWeeklyEvent(catalog, date);
  if (!activeEvent) {
    return {
      activeEvent: null,
      progress: cloneProgress(stored),
      changed: false,
      completedMissionIds: [],
      claimableRewardIds: [],
    };
  }
  const progress = stored.eventId === activeEvent.id
    ? cloneProgress(stored)
    : createEventProgress(activeEvent);
  const summary = summarizeMissionProgress(activeEvent.campaign, progress.missionProgress);
  progress.points = summary.points;
  progress.missionProgress = summary.missionProgress;
  return {
    activeEvent,
    progress,
    changed: !progressEquals(stored, progress),
    completedMissionIds: summary.completedMissionIds,
    claimableRewardIds: getClaimableRewardIds(activeEvent, progress),
  };
}

export function claimWeeklyEventReward(
  catalog: readonly WeeklyEventCampaign[],
  stored: WeeklyEventProgress,
  rewardId: string,
  date: Date,
): EventClaimResult {
  const snapshot = getWeeklyEventSnapshot(catalog, stored, date);
  const active = snapshot.activeEvent;
  if (!active) return { claimed: false, reward: null, progress: snapshot.progress };
  const nextReward = active.campaign.rewards.find(
    (reward) => !snapshot.progress.claimedRewardIds.includes(reward.id),
  );
  if (
    !nextReward
    || nextReward.id !== rewardId
    || snapshot.progress.points < nextReward.pointsRequired
  ) {
    return { claimed: false, reward: null, progress: snapshot.progress };
  }
  const progress = cloneProgress(snapshot.progress);
  progress.claimedRewardIds.push(nextReward.id);
  return { claimed: true, reward: nextReward, progress };
}

function getClaimableRewardIds(
  event: ActiveWeeklyEvent,
  progress: WeeklyEventProgress,
): string[] {
  const firstUnclaimed = event.campaign.rewards.find(
    (reward) => !progress.claimedRewardIds.includes(reward.id),
  );
  return firstUnclaimed && progress.points >= firstUnclaimed.pointsRequired
    ? [firstUnclaimed.id]
    : [];
}

function createEventProgress(event: ActiveWeeklyEvent): WeeklyEventProgress {
  return {
    eventId: event.id,
    weekKey: event.week.weekKey,
    points: 0,
    claimedRewardIds: [],
    missionProgress: {},
  };
}

function cloneProgress(progress: WeeklyEventProgress): WeeklyEventProgress {
  return {
    ...progress,
    claimedRewardIds: [...progress.claimedRewardIds],
    missionProgress: { ...progress.missionProgress },
  };
}

function progressEquals(left: WeeklyEventProgress, right: WeeklyEventProgress): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
