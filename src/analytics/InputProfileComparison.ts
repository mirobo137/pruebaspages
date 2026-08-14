import type { TelemetryRecord } from './TelemetryTypes';
import type { GameplayInputProfileId } from '../input/GameplayResultContext';
import type { Difficulty } from '../game/difficulty/Difficulty';

export interface InputProfileSummary {
  inputProfileId: GameplayInputProfileId;
  spatialModelVersion: string;
  difficulty: Difficulty;
  runs: number;
  completionRate: number;
  averageAccuracy: number;
  averageBestCombo: number;
  averageMisses: number;
  averageFlowActivations: number;
  averageSuperFlowActivations: number;
  averagePointerDistance: number;
  averageEmptyPresses: number;
  averageTravelDistance: number;
  maximumRequiredSpeed: number;
  averageDragLength: number;
}

export function summarizeInputProfiles(
  records: readonly TelemetryRecord[],
): InputProfileSummary[] {
  const groups = new Map<string, Array<Extract<
    TelemetryRecord['event'],
    { type: 'song_finished' }
  >>>();
  for (const { event } of records) {
    if (!isVersionedTechnicalResult(event)) continue;
    const key = `${event.inputProfileId}:${event.spatialModelVersion}:${event.difficulty}`;
    const group = groups.get(key) ?? [];
    group.push(event);
    groups.set(key, group);
  }

  return [...groups.values()].map((runs) => ({
    inputProfileId: runs[0].inputProfileId,
    spatialModelVersion: runs[0].spatialModelVersion,
    difficulty: runs[0].difficulty,
    runs: runs.length,
    completionRate: average(runs.map((run) => run.completed ? 1 : 0)),
    averageAccuracy: average(runs.map((run) => run.accuracy)),
    averageBestCombo: average(runs.map((run) => run.bestCombo)),
    averageMisses: average(runs.map((run) => run.misses)),
    averageFlowActivations: average(runs.map((run) => run.flowActivations)),
    averageSuperFlowActivations: average(runs.map((run) => run.superFlowActivations)),
    averagePointerDistance: average(runs.map((run) => run.pointerDistance)),
    averageEmptyPresses: average(runs.map((run) => run.emptyPresses)),
    averageTravelDistance: average(runs.map((run) => run.averageTravelDistance)),
    maximumRequiredSpeed: Math.max(...runs.map((run) => run.maximumRequiredSpeed)),
    averageDragLength: average(runs.map((run) => run.averageDragLength)),
  })).sort((left, right) => (
    left.inputProfileId.localeCompare(right.inputProfileId)
    || left.difficulty.localeCompare(right.difficulty)
  ));
}

function isVersionedTechnicalResult(
  event: TelemetryRecord['event'],
): event is Extract<TelemetryRecord['event'], { type: 'song_finished' }> {
  if (event.type !== 'song_finished') return false;
  const candidate = event as Partial<Extract<
    TelemetryRecord['event'],
    { type: 'song_finished' }
  >>;
  return (
    candidate.inputProfileId === 'mouse'
    || candidate.inputProfileId === 'touch'
    || candidate.inputProfileId === 'pen'
    || candidate.inputProfileId === 'hybrid'
  )
    && typeof candidate.spatialModelVersion === 'string'
    && candidate.spatialModelVersion.length > 0
    && typeof candidate.accuracy === 'number'
    && Number.isFinite(candidate.accuracy)
    && typeof candidate.bestCombo === 'number'
    && typeof candidate.misses === 'number'
    && typeof candidate.pointerDistance === 'number';
}

function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const value = values.reduce((total, current) => total + current, 0) / values.length;
  return Math.round(value * 1_000) / 1_000;
}
