import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const trackId = 'untitled-0f61f35777';
const duration = 124.872;
const outputDirectory = path.join(projectRoot, 'public', 'assets', 'beatmaps', trackId);
const versions = JSON.parse(await readFile(
  path.join(projectRoot, 'src', 'content', 'music-contract-versions.json'),
  'utf8',
));
const phases = [
  { id: 'read', name: 'LECTURA', startTime: 0, endTime: 34 },
  { id: 'drive', name: 'IMPULSO', startTime: 34, endTime: 82 },
  { id: 'climax', name: 'CLIMAX', startTime: 82, endTime: duration },
];
const positions = [
  { x: 0.24, y: 0.28 },
  { x: 0.72, y: 0.24 },
  { x: 0.78, y: 0.58 },
  { x: 0.52, y: 0.72 },
  { x: 0.22, y: 0.62 },
  { x: 0.46, y: 0.38 },
];
const difficultyRules = {
  easy: { step: 3, dragEvery: 7 },
  medium: { step: 1.8, dragEvery: 8 },
  hard: { step: 1.25, dragEvery: 10 },
};

function createEvents(difficulty) {
  const rule = difficultyRules[difficulty];
  const events = [];
  for (const [phaseIndex, phase] of phases.entries()) {
    let time = phase.startTime + (phaseIndex === 0 ? 2 : 2.2);
    let localIndex = 0;
    while (time < phase.endTime - 1.4) {
      const start = positions[(localIndex + phaseIndex * 2) % positions.length];
      const drag = localIndex > 0 && localIndex % rule.dragEvery === 0;
      if (drag) {
        const end = positions[(localIndex + phaseIndex * 2 + 2) % positions.length];
        const direction = phaseIndex % 2 === 0 ? 1 : -1;
        events.push({
          id: `note-${String(events.length + 1).padStart(3, '0')}`,
          time: Number(time.toFixed(3)),
          phaseId: phase.id,
          kind: 'drag',
          start,
          controls: [{
            x: Number(((start.x + end.x) * 0.5).toFixed(3)),
            y: Number(Math.max(0.18, Math.min(0.78, (start.y + end.y) * 0.5 + 0.12 * direction)).toFixed(3)),
          }],
          end,
        });
        time += rule.step * 1.5;
      } else {
        events.push({
          id: `note-${String(events.length + 1).padStart(3, '0')}`,
          time: Number(time.toFixed(3)),
          phaseId: phase.id,
          kind: 'tap',
          start,
        });
        time += rule.step;
      }
      localIndex += 1;
    }
  }
  return events;
}

await mkdir(outputDirectory, { recursive: true });
for (const difficulty of Object.keys(difficultyRules)) {
  const document = {
    schemaVersion: 2,
    trackId,
    difficulty,
    duration,
    audioMode: 'single',
    generatorVersion: 'm1-technical-pilot-v1',
    analysisHash: null,
    locked: false,
    spatialModelVersion: versions.spatialModelVersion,
    interactionContractVersion: versions.interactionContractVersion,
    phases,
    events: createEvents(difficulty),
  };
  const outputPath = path.join(outputDirectory, `${difficulty}.json`);
  try {
    await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
    });
    console.log(`- piloto M1 creado: ${trackId}/${difficulty}.json`);
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    console.log(`- piloto M1 preservado: ${trackId}/${difficulty}.json`);
  }
}
