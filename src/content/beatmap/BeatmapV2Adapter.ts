import type { Difficulty } from '../../game/difficulty/Difficulty';
import type { NoteKind } from '../../game/notes/NoteKind';
import type { Beatmap, BeatmapAudioMode, BeatPosition } from './BeatmapTypes';

interface BeatmapV2PhaseDocument {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
}

interface BeatmapV2EventDocument {
  id: string;
  time: number;
  phaseId: string;
  kind: NoteKind;
  start: BeatPosition;
  end?: BeatPosition;
  controls?: BeatPosition[];
  checkpoints?: BeatPosition[];
}

export interface BeatmapV2Document {
  schemaVersion: 2;
  trackId: string;
  difficulty: Difficulty;
  duration: number;
  audioMode: BeatmapAudioMode;
  loopDuration?: number;
  generatorVersion: string;
  analysisHash: string | null;
  locked: boolean;
  spatialModelVersion: string;
  interactionContractVersion: string;
  phases: BeatmapV2PhaseDocument[];
  events: BeatmapV2EventDocument[];
}

export function adaptBeatmapV2(documentData: BeatmapV2Document): Beatmap {
  if (documentData.schemaVersion !== 2) throw new Error('Beatmap v2 requiere schemaVersion 2.');
  if (!(documentData.duration > 0)) throw new Error('Beatmap v2 requiere duration positiva.');
  if (documentData.audioMode === 'loop' && !(documentData.loopDuration && documentData.loopDuration > 0)) {
    throw new Error('Beatmap v2 loop requiere loopDuration.');
  }
  if (documentData.audioMode === 'single' && documentData.loopDuration !== undefined) {
    throw new Error('Beatmap v2 single no admite loopDuration.');
  }

  const phaseIndexById = new Map<string, number>();
  let previousPhaseEnd = 0;
  const phases = documentData.phases.map((phase, phaseIndex) => {
    if (
      phaseIndexById.has(phase.id)
      || phase.startTime < previousPhaseEnd
      || phase.endTime <= phase.startTime
      || phase.endTime > documentData.duration
    ) throw new Error(`Fase v2 invalida: ${phase.id}`);
    phaseIndexById.set(phase.id, phaseIndex);
    previousPhaseEnd = phase.endTime;
    return { ...phase };
  });
  if (phases.length === 0) throw new Error('Beatmap v2 requiere fases.');

  let previousEventTime = -1;
  const eventIds = new Set<string>();
  const events = documentData.events.map((event) => {
    const phaseIndex = phaseIndexById.get(event.phaseId);
    const phase = phaseIndex === undefined ? null : phases[phaseIndex];
    if (
      phaseIndex === undefined
      || !phase
      || eventIds.has(event.id)
      || event.time < previousEventTime
      || event.time < phase.startTime
      || event.time >= phase.endTime
      || event.time > documentData.duration
    ) throw new Error(`Evento v2 invalido: ${event.id}`);
    if (event.kind === 'drag' && !event.end) throw new Error(`Drag sin destino: ${event.id}`);
    eventIds.add(event.id);
    previousEventTime = event.time;
    return {
      id: event.id,
      time: event.time,
      kind: event.kind,
      phaseIndex,
      start: event.start,
      end: event.end,
      controls: event.controls?.slice(0, 2),
      checkpoints: event.checkpoints?.slice(0, 4),
    };
  });

  return {
    schemaVersion: 2,
    trackId: documentData.trackId,
    difficulty: documentData.difficulty,
    audioMode: documentData.audioMode,
    loopDuration: documentData.loopDuration ?? null,
    duration: documentData.duration,
    phases,
    events,
    generatorVersion: documentData.generatorVersion,
    analysisHash: documentData.analysisHash,
    locked: documentData.locked,
    spatialModelVersion: documentData.spatialModelVersion,
    interactionContractVersion: documentData.interactionContractVersion,
  };
}
