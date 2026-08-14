export const BPM_GENERATOR_VERSION = 'bpm-grid-v1';

const DIFFICULTY_STEP_MULTIPLIER = {
  easy: 4,
  medium: 2,
  hard: 1,
};
const POSITION_MOTIF = [
  { x: 0.22, y: 0.28 },
  { x: 0.5, y: 0.2 },
  { x: 0.78, y: 0.3 },
  { x: 0.7, y: 0.58 },
  { x: 0.48, y: 0.72 },
  { x: 0.2, y: 0.62 },
  { x: 0.34, y: 0.42 },
  { x: 0.68, y: 0.44 },
];

function hashText(value) {
  let hash = 2_166_136_261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }
  return hash;
}

function normalizedTime(value) {
  return Number(value.toFixed(6));
}

export function createRhythmGrid(bpm) {
  if (!(bpm >= 30 && bpm <= 300)) throw new Error(`BPM fuera de rango: ${bpm}`);
  const quarter = 60 / bpm;
  return {
    quarter,
    eighth: quarter / 2,
    sixteenth: quarter / 4,
  };
}

function createBackbone(trackId, bpm, beatOffset, phases) {
  if (!(beatOffset >= 0)) throw new Error(`beatOffset invalido: ${beatOffset}`);
  const subdivision = createRhythmGrid(bpm).eighth;
  const seed = hashText(trackId);
  const candidates = [];

  for (const [phaseIndex, phase] of phases.entries()) {
    const safeStart = phase.startTime + (phaseIndex === 0 ? 1.5 : 2.1);
    const firstGridIndex = Math.ceil((safeStart - beatOffset) / subdivision);
    let suppressedUntil = -1;
    for (
      let gridIndex = firstGridIndex;
      beatOffset + gridIndex * subdivision < phase.endTime - 1.35;
      gridIndex += 1
    ) {
      const time = normalizedTime(beatOffset + gridIndex * subdivision);
      if (time < suppressedUntil - 0.000001) continue;
      const motifIndex = (seed + gridIndex * 5 + phaseIndex * 3) % POSITION_MOTIF.length;
      const start = POSITION_MOTIF[motifIndex];
      // Multiples of 8 are also valid on the medium/easy grids. This keeps every
      // drag on the exact same musical instant across all three difficulties.
      const isDrag = gridIndex > 0 && gridIndex % 16 === 8;
      const id = `${phase.id}-${String(gridIndex).padStart(4, '0')}`;
      if (isDrag) {
        const end = POSITION_MOTIF[(motifIndex + 3) % POSITION_MOTIF.length];
        const direction = (seed + gridIndex + phaseIndex) % 2 === 0 ? 1 : -1;
        candidates.push({
          id,
          gridIndex,
          time,
          phaseId: phase.id,
          kind: 'drag',
          start,
          controls: [{
            x: normalizedTime((start.x + end.x) * 0.5),
            y: normalizedTime(Math.max(
              0.16,
              Math.min(0.8, (start.y + end.y) * 0.5 + direction * 0.12),
            )),
          }],
          end,
        });
        suppressedUntil = time + 0.9;
      } else {
        candidates.push({
          id,
          gridIndex,
          time,
          phaseId: phase.id,
          kind: 'tap',
          start,
        });
      }
    }
  }
  return { subdivision, candidates };
}

export function generateBpmBeatmap({
  trackId,
  difficulty,
  duration,
  bpm,
  beatOffset,
  phases,
  versions,
}) {
  const stepMultiplier = DIFFICULTY_STEP_MULTIPLIER[difficulty];
  if (!stepMultiplier) throw new Error(`Dificultad invalida: ${difficulty}`);
  if (!(duration > 0) || !Array.isArray(phases) || phases.length === 0) {
    throw new Error('Duracion o fases invalidas.');
  }
  const { subdivision, candidates } = createBackbone(trackId, bpm, beatOffset, phases);
  const selected = candidates.filter(
    (candidate) => candidate.gridIndex % stepMultiplier === 0,
  );
  return {
    schemaVersion: 2,
    trackId,
    difficulty,
    duration,
    audioMode: 'single',
    generatorVersion: BPM_GENERATOR_VERSION,
    analysisHash: null,
    locked: false,
    spatialModelVersion: versions.spatialModelVersion,
    interactionContractVersion: versions.interactionContractVersion,
    phases: phases.map((phase) => ({ ...phase })),
    events: selected.map(({ gridIndex: _gridIndex, ...event }) => event),
  };
}

export function eventSignature(event) {
  return `${event.id}|${event.time}|${event.kind}|${event.phaseId}`;
}
