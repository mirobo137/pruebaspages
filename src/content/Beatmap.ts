import type { Difficulty } from '../game/difficulty/Difficulty';
import type { NoteKind } from '../game/notes/NoteKind';
import type { MusicTrack } from './MusicCatalog';

export interface BeatEvent {
  time: number;
  kind: NoteKind;
  start?: BeatPosition;
  end?: BeatPosition;
}

export interface BeatPosition {
  x: number;
  y: number;
}

export interface BeatmapPhase {
  name: string;
  startTime: number;
  endTime: number;
}

export interface Beatmap {
  trackId: string;
  difficulty: Difficulty;
  loopDuration: number;
  duration: number;
  phases: BeatmapPhase[];
  events: BeatEvent[];
}

interface PatternEvent {
  kind: NoteKind;
  start?: BeatPosition;
  end?: BeatPosition;
  gap?: number;
}

interface BeatmapPhaseDocument {
  name: string;
  offset?: number;
  pattern: PatternEvent[];
}

interface BeatmapDocument {
  trackId: string;
  difficulty: Difficulty;
  loopDuration: number;
  grid: number;
  phases: BeatmapPhaseDocument[];
}

export async function loadBeatmap(
  track: MusicTrack,
  difficulty: Difficulty,
): Promise<Beatmap | null> {
  const beatmapUrl = new URL(track.beatmapPaths[difficulty], document.baseURI);
  const response = await fetch(beatmapUrl);

  if (!response.ok) return null;

  const documentData = await response.json() as BeatmapDocument;
  return expandBeatmap(documentData);
}

function expandBeatmap(documentData: BeatmapDocument): Beatmap {
  const loopDuration = Math.max(1, documentData.loopDuration);
  const grid = Math.max(0.05, documentData.grid);
  const events: BeatEvent[] = [];
  const phases: BeatmapPhase[] = [];

  documentData.phases.forEach((phase, phaseIndex) => {
    const phaseStart = phaseIndex * loopDuration;
    phases.push({
      name: phase.name,
      startTime: phaseStart,
      endTime: phaseStart + loopDuration,
    });

    if (phase.pattern.length === 0) return;

    let localTime = Math.max(0, phase.offset ?? grid);
    let patternIndex = 0;
    while (localTime < loopDuration - 0.05) {
      const patternEvent = phase.pattern[patternIndex % phase.pattern.length];
      events.push({
        time: phaseStart + localTime,
        kind: patternEvent.kind,
        start: patternEvent.start,
        end: patternEvent.end,
      });
      localTime += grid * Math.max(1, patternEvent.gap ?? 1);
      patternIndex += 1;
    }
  });

  return {
    trackId: documentData.trackId,
    difficulty: documentData.difficulty,
    loopDuration,
    duration: loopDuration * documentData.phases.length,
    phases,
    events,
  };
}
