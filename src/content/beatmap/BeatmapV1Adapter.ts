import type { Difficulty } from '../../game/difficulty/Difficulty';
import type { NoteKind } from '../../game/notes/NoteKind';
import type { Beatmap, BeatPosition } from './BeatmapTypes';

export const PHASE_TRANSITION_DURATION = 0.65;
export const PHASE_ENTRY_SAFE_OFFSET = 1.5;

interface PatternEvent {
  kind: NoteKind;
  start?: BeatPosition;
  end?: BeatPosition;
  controls?: BeatPosition[];
  gap?: number;
}

interface BeatmapPhaseV1Document {
  name: string;
  offset?: number;
  pattern: PatternEvent[];
}

export interface BeatmapV1Document {
  schemaVersion?: 1;
  trackId: string;
  difficulty: Difficulty;
  loopDuration: number;
  grid: number;
  phases: BeatmapPhaseV1Document[];
  generatorVersion?: string;
  analysisHash?: string | null;
  locked?: boolean;
}

export function adaptBeatmapV1(documentData: BeatmapV1Document): Beatmap {
  const loopDuration = Math.max(1, documentData.loopDuration);
  const grid = Math.max(0.05, documentData.grid);
  const events: Beatmap['events'] = [];
  const phases: Beatmap['phases'] = [];

  documentData.phases.forEach((phase, phaseIndex) => {
    const phaseStart = phaseIndex * loopDuration;
    phases.push({
      id: `phase-${phaseIndex + 1}`,
      name: phase.name,
      startTime: phaseStart,
      endTime: phaseStart + loopDuration,
    });

    if (phase.pattern.length === 0) return;
    let localTime = Math.max(
      phaseIndex === 0 ? 0 : PHASE_ENTRY_SAFE_OFFSET,
      phase.offset ?? grid,
    );
    let patternIndex = 0;
    while (localTime < loopDuration - 0.05) {
      const patternEvent = phase.pattern[patternIndex % phase.pattern.length];
      events.push({
        time: phaseStart + localTime,
        kind: patternEvent.kind,
        phaseIndex,
        start: patternEvent.start,
        end: patternEvent.end,
        controls: patternEvent.controls?.slice(0, 2),
      });
      localTime += grid * Math.max(1, patternEvent.gap ?? 1);
      patternIndex += 1;
    }
  });

  return {
    schemaVersion: 1,
    trackId: documentData.trackId,
    difficulty: documentData.difficulty,
    audioMode: 'loop',
    loopDuration,
    duration: loopDuration * documentData.phases.length,
    phases,
    events,
    generatorVersion: documentData.generatorVersion,
    analysisHash: documentData.analysisHash,
    locked: documentData.locked,
  };
}
