import type { Difficulty } from '../../game/difficulty/Difficulty';
import type { NoteKind } from '../../game/notes/NoteKind';

export type BeatmapAudioMode = 'loop' | 'single';

export interface BeatPosition {
  x: number;
  y: number;
}

export interface BeatEvent {
  id?: string;
  time: number;
  kind: NoteKind;
  phaseIndex: number;
  start?: BeatPosition;
  end?: BeatPosition;
  controls?: BeatPosition[];
  checkpoints?: BeatPosition[];
}

export interface BeatmapPhase {
  id?: string;
  name: string;
  startTime: number;
  endTime: number;
}

export interface Beatmap {
  schemaVersion: 1 | 2;
  trackId: string;
  difficulty: Difficulty;
  audioMode: BeatmapAudioMode;
  loopDuration: number | null;
  duration: number;
  phases: BeatmapPhase[];
  events: BeatEvent[];
  generatorVersion?: string;
  analysisHash?: string | null;
  locked?: boolean;
  spatialModelVersion?: string;
  interactionContractVersion?: string;
}
