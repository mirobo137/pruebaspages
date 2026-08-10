import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(projectRoot, 'public', 'assets', 'music-manifest.json');
const beatmapsRoot = path.join(projectRoot, 'public', 'assets', 'beatmaps');
const difficulties = ['easy', 'medium', 'hard'];

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

function createBeatmap(trackId, difficulty) {
  const config = DIFFICULTY_CONFIG[difficulty];
  const seed = hashId(trackId);

  return {
    trackId,
    difficulty,
    generated: true,
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

const tracks = JSON.parse(await readFile(manifestPath, 'utf8'));
let createdCount = 0;

for (const track of tracks) {
  const beatmapDirectory = path.join(beatmapsRoot, track.id);
  await mkdir(beatmapDirectory, { recursive: true });

  for (const difficulty of difficulties) {
    const beatmapPath = path.join(beatmapDirectory, `${difficulty}.json`);
    const document = createBeatmap(track.id, difficulty);

    try {
      await writeFile(beatmapPath, `${JSON.stringify(document, null, 2)}\n`, {
        encoding: 'utf8',
        flag: 'wx',
      });
      createdCount += 1;
      console.log(`- beatmap inicial: ${track.id}/${difficulty}.json`);
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
    }
  }
}

console.log(createdCount > 0
  ? `Beatmaps iniciales creados: ${createdCount}`
  : 'Beatmaps completos: no fue necesario crear archivos.');
