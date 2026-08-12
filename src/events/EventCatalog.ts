import type {
  EventMissionDefinition,
  EventMissionKind,
  EventRewardDefinition,
  WeeklyEventCampaign,
} from './EventTypes';

export const WEEKLY_EVENTS_PATH = './assets/events/weekly-events.json';

const MISSION_KINDS = new Set<EventMissionKind>([
  'complete_runs',
  'perfects',
  'best_combo',
  'flow_activations',
  'super_flow_activations',
]);

const COSMETIC_SLOTS = new Set<EventRewardDefinition['cosmeticSlot']>([
  'target-palette',
  'timing-ring',
  'drag-trail',
  'perfect-impact',
  'flow-background',
  'super-flow-background',
  'complete-theme',
]);

export async function loadWeeklyEventCatalog(): Promise<WeeklyEventCampaign[]> {
  try {
    const url = new URL(WEEKLY_EVENTS_PATH, document.baseURI);
    const response = await fetch(url);
    if (!response.ok) return [];
    return parseWeeklyEventCatalog(await response.json());
  } catch (error) {
    console.warn('Los eventos semanales no están disponibles.', error);
    return [];
  }
}

export function parseWeeklyEventCatalog(value: unknown): WeeklyEventCampaign[] {
  if (!Array.isArray(value)) return [];
  const campaigns: WeeklyEventCampaign[] = [];
  const usedIds = new Set<string>();
  for (const candidate of value.slice(0, 30)) {
    const campaign = parseCampaign(candidate);
    if (!campaign || usedIds.has(campaign.id)) continue;
    usedIds.add(campaign.id);
    campaigns.push(campaign);
  }
  return campaigns;
}

function parseCampaign(value: unknown): WeeklyEventCampaign | null {
  if (!isRecord(value)) return null;
  const id = safeId(value.id);
  const name = safeText(value.name, 80);
  const themeId = safeId(value.themeId);
  const startsAt = safeDate(value.startsAt);
  const endsAt = safeDate(value.endsAt);
  if (!id || !name || !themeId || !startsAt || !endsAt) return null;
  if (Date.parse(startsAt) >= Date.parse(endsAt)) return null;
  if (!Array.isArray(value.missions) || !Array.isArray(value.rewards)) return null;

  const missions = value.missions.map(parseMission).filter(isPresent);
  const rewards = value.rewards.map(parseReward).filter(isPresent)
    .sort((left, right) => left.pointsRequired - right.pointsRequired);
  if (missions.length !== value.missions.length || missions.length !== 3) return null;
  if (rewards.length !== value.rewards.length || rewards.length !== 7) return null;
  if (!hasUniqueIds(missions) || !hasUniqueIds(rewards)) return null;
  if (rewards.some((reward, index) => index > 0
    && reward.pointsRequired <= rewards[index - 1].pointsRequired)) return null;
  return { id, name, themeId, startsAt, endsAt, missions, rewards };
}

function parseMission(value: unknown): EventMissionDefinition | null {
  if (!isRecord(value)) return null;
  const id = safeId(value.id);
  const label = safeText(value.label, 100);
  const kind = MISSION_KINDS.has(value.kind as EventMissionKind)
    ? value.kind as EventMissionKind
    : null;
  const target = positiveInteger(value.target);
  const pointStep = positiveInteger(value.pointStep);
  const pointsPerStep = positiveInteger(value.pointsPerStep);
  return id && label && kind && target && pointStep && pointsPerStep
    ? { id, label, kind, target, pointStep, pointsPerStep }
    : null;
}

function parseReward(value: unknown): EventRewardDefinition | null {
  if (!isRecord(value)) return null;
  const id = safeId(value.id);
  const label = safeText(value.label, 100);
  const pointsRequired = positiveInteger(value.pointsRequired);
  const cosmeticSlot = COSMETIC_SLOTS.has(
    value.cosmeticSlot as EventRewardDefinition['cosmeticSlot'],
  )
    ? value.cosmeticSlot as EventRewardDefinition['cosmeticSlot']
    : null;
  return id && label && pointsRequired && cosmeticSlot
    ? { id, label, pointsRequired, cosmeticSlot }
    : null;
}

function hasUniqueIds(values: readonly { id: string }[]): boolean {
  return new Set(values.map((value) => value.id)).size === values.length;
}

function safeId(value: unknown): string | null {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= 100
    && /^[a-z0-9:_-]+$/.test(value)
    ? value
    : null;
}

function safeText(value: unknown, limit: number): string | null {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= limit
    ? value.trim()
    : null;
}

function safeDate(value: unknown): string | null {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null;
}

function positiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}
