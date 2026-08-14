import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canOverwriteBeatmap } from './lib/beatmap-generation-policy.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(projectRoot, 'public', 'assets', 'music-manifest.json');
const beatmapsRoot = path.join(projectRoot, 'public', 'assets', 'beatmaps');
const contractVersionsPath = path.join(
  projectRoot,
  'src',
  'content',
  'music-contract-versions.json',
);
const difficulties = ['easy', 'medium', 'hard'];

function parseOptions(args) {
  let trackId = null;
  let force = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--force') force = true;
    else if (argument === '--track') {
      trackId = args[index + 1] ?? null;
      index += 1;
    } else {
      throw new Error(`Opcion desconocida: ${argument}`);
    }
  }
  if (trackId !== null && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trackId)) {
    throw new Error(`trackId invalido: ${trackId}`);
  }
  return { trackId, force };
}

const PHASES = [
  {
    name: 'LECTURA',
    events: [
      { kind: 'tap', start: { x: 0.2, y: 0.24 } },
      { kind: 'tap', start: { x: 0.78, y: 0.26 } },
      { kind: 'tap', start: { x: 0.7, y: 0.58 } },
      { kind: 'tap', start: { x: 0.28, y: 0.68 } },
      { kind: 'drag', start: { x: 0.24, y: 0.44 }, end: { x: 0.74, y: 0.44 } },
      { kind: 'tap', start: { x: 0.5, y: 0.22 } },
      { kind: 'tap', start: { x: 0.76, y: 0.7 } },
      { kind: 'drag', start: { x: 0.68, y: 0.3 }, end: { x: 0.3, y: 0.62 } },
    ],
  },
  {
    name: 'IMPULSO',
    events: [
      { kind: 'tap', start: { x: 0.8, y: 0.22 } },
      { kind: 'tap', start: { x: 0.22, y: 0.34 } },
      { kind: 'tap', start: { x: 0.74, y: 0.5 } },
      { kind: 'tap', start: { x: 0.26, y: 0.7 } },
      { kind: 'drag', start: { x: 0.72, y: 0.7 }, end: { x: 0.28, y: 0.7 } },
      { kind: 'tap', start: { x: 0.5, y: 0.26 } },
      { kind: 'tap', start: { x: 0.3, y: 0.5 } },
      { kind: 'drag', start: { x: 0.26, y: 0.28 }, end: { x: 0.74, y: 0.6 } },
    ],
  },
  {
    name: 'CLIMAX',
    events: [
      { kind: 'tap', start: { x: 0.16, y: 0.2 } },
      { kind: 'tap', start: { x: 0.84, y: 0.2 } },
      { kind: 'tap', start: { x: 0.8, y: 0.7 } },
      { kind: 'tap', start: { x: 0.2, y: 0.7 } },
      { kind: 'drag', start: { x: 0.2, y: 0.48 }, end: { x: 0.8, y: 0.48 } },
      { kind: 'tap', start: { x: 0.5, y: 0.22 } },
      { kind: 'tap', start: { x: 0.72, y: 0.62 } },
      { kind: 'drag', start: { x: 0.7, y: 0.28 }, end: { x: 0.3, y: 0.7 } },
    ],
  },
];

const DIFFICULTY_CONFIG = {
  easy: {
    grid: 0.75,
    eventIndexes: [0, 1, 3, 4, 5, 7],
    gaps: [2, 2, 2, 2, 2, 2],
  },
  medium: {
    grid: 0.375,
    eventIndexes: [0, 1, 2, 3, 4, 5, 7],
    gaps: [1, 2, 1, 2, 2, 1, 2],
  },
  hard: {
    grid: 0.375,
    eventIndexes: [0, 1, 2, 3, 4, 5, 6, 7],
    gaps: [1, 1, 1, 1, 2, 1, 1, 2],
  },
};

function hashId(id) {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash;
}

function transformPoint(point, variation) {
  if (!point) return undefined;
  if (variation === 1) return { x: 1 - point.x, y: point.y };
  if (variation === 2) return { x: point.x, y: 0.92 - point.y };
  if (variation === 3) return { x: 1 - point.x, y: 0.92 - point.y };
  return { ...point };
}

function createBeatmap(trackId, difficulty, contractVersions) {
  const config = DIFFICULTY_CONFIG[difficulty];
  const seed = hashId(trackId);

  return {
    schemaVersion: 1,
    trackId,
    difficulty,
    generated: true,
    generatorVersion: 'legacy-pattern-v1',
    analysisHash: null,
    locked: false,
    spatialModelVersion: contractVersions.spatialModelVersion,
    interactionContractVersion: contractVersions.interactionContractVersion,
    loopDuration: 30,
    grid: config.grid,
    phases: PHASES.map((phase, phaseIndex) => {
      const variation = (seed + phaseIndex) % 4;
      const shift = (seed + phaseIndex * 3) % config.eventIndexes.length;
      const orderedIndexes = config.eventIndexes.map((_, index) => (
        config.eventIndexes[(index + shift) % config.eventIndexes.length]
      ));

      return {
        name: phase.name,
        offset: 0.75,
        pattern: orderedIndexes.map((eventIndex, patternIndex) => {
          const event = phase.events[eventIndex];
          return {
            kind: event.kind,
            start: transformPoint(event.start, variation),
            ...(event.end ? { end: transformPoint(event.end, variation) } : {}),
            gap: config.gaps[patternIndex],
          };
        }),
      };
    }),
  };
}

const { trackId: requestedTrackId, force } = parseOptions(process.argv.slice(2));
const tracks = JSON.parse(await readFile(manifestPath, 'utf8'));
const contractVersions = JSON.parse(await readFile(contractVersionsPath, 'utf8'));
const selectedTracks = requestedTrackId
  ? tracks.filter((track) => track.id === requestedTrackId)
  : tracks;
if (requestedTrackId && selectedTracks.length === 0) {
  throw new Error(`No existe una cancion v1 activa con ID ${requestedTrackId}.`);
}
let createdCount = 0;
let regeneratedCount = 0;
let preservedCount = 0;
let lockedCount = 0;

for (const track of selectedTracks) {
  const beatmapDirectory = path.join(beatmapsRoot, track.id);
  await mkdir(beatmapDirectory, { recursive: true });

  for (const difficulty of difficulties) {
    const beatmapPath = path.join(beatmapDirectory, `${difficulty}.json`);
    const document = createBeatmap(track.id, difficulty, contractVersions);

    let existing = null;
    try {
      existing = JSON.parse(await readFile(beatmapPath, 'utf8'));
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    if (existing && !canOverwriteBeatmap(existing, force)) {
      if (!force) {
        preservedCount += 1;
        continue;
      }
      lockedCount += 1;
      console.log(`- bloqueado, no se sobrescribe: ${track.id}/${difficulty}.json`);
      continue;
    }

    try {
      await writeFile(beatmapPath, `${JSON.stringify(document, null, 2)}\n`, {
        encoding: 'utf8',
        flag: existing ? 'w' : 'wx',
      });
      if (existing) regeneratedCount += 1;
      else createdCount += 1;
      console.log(`- beatmap inicial: ${track.id}/${difficulty}.json`);
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
    }
  }
}

console.log(
  `Beatmaps v1: ${createdCount} creado(s), ${regeneratedCount} regenerado(s), `
  + `${preservedCount} preservado(s), ${lockedCount} bloqueado(s).`,
);
