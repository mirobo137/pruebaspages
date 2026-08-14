import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createRhythmGrid,
  generateBpmBeatmap,
  eventSignature,
} from './lib/bpm-beatmap-generator.mjs';
import { validateBeatmapV2 } from './lib/music-contract-validation.mjs';

const versions = JSON.parse(await readFile(
  'src/content/music-contract-versions.json',
  'utf8',
));
const difficulties = ['easy', 'medium', 'hard'];
const referenceBpms = [90, 105, 120, 128, 140, 174];
const phases = [
  { id: 'read', name: 'LECTURA', startTime: 0, endTime: 20 },
  { id: 'drive', name: 'IMPULSO', startTime: 20, endTime: 44 },
  { id: 'climax', name: 'CLIMAX', startTime: 44, endTime: 64 },
];

for (const bpm of referenceBpms) {
  const grid = createRhythmGrid(bpm);
  assert.equal(grid.quarter, 60 / bpm);
  assert.equal(grid.eighth, grid.quarter / 2);
  assert.equal(grid.sixteenth, grid.quarter / 4);
  const maps = Object.fromEntries(difficulties.map((difficulty) => {
    const options = {
      trackId: `reference-${bpm}`,
      difficulty,
      duration: 64,
      bpm,
      beatOffset: 0.5,
      phases,
      versions,
    };
    const first = generateBpmBeatmap(options);
    const second = generateBpmBeatmap(options);
    assert.deepEqual(first, second, `${bpm}/${difficulty}: salida no determinista`);
    validateBeatmapV2(first);
    assertTemporalSafety(first, bpm, difficulty);
    return [difficulty, first];
  }));

  assertSubset(maps.easy, maps.medium, `${bpm}: Easy no es subconjunto de Medium`);
  assertSubset(maps.medium, maps.hard, `${bpm}: Medium no es subconjunto de Hard`);
}

const pilotMaps = {};
for (const difficulty of difficulties) {
  const document = JSON.parse(await readFile(
    `public/assets/beatmaps/untitled-0f61f35777/${difficulty}.json`,
    'utf8',
  ));
  validateBeatmapV2(document);
  assert.equal(document.generatorVersion, 'bpm-grid-v1');
  assertTemporalSafety(document, 128, difficulty);
  pilotMaps[difficulty] = document;
}
assertSubset(pilotMaps.easy, pilotMaps.medium, 'Piloto: Easy no es subconjunto de Medium');
assertSubset(pilotMaps.medium, pilotMaps.hard, 'Piloto: Medium no es subconjunto de Hard');

console.log(
  `BPM M2: ${referenceBpms.join('/')} BPM, determinismo, dificultad anidada, `
  + 'separacion y descanso de drag: OK',
);

function assertSubset(smaller, larger, message) {
  const largerById = new Map(larger.events.map((event) => [event.id, event]));
  for (const event of smaller.events) {
    const shared = largerById.get(event.id);
    assert.ok(shared, `${message}: falta ${event.id}`);
    assert.equal(eventSignature(event), eventSignature(shared), `${message}: timing/tipo alterado`);
    assert.deepEqual(event, shared, `${message}: evento compartido alterado`);
  }
}

function assertTemporalSafety(document, bpm, difficulty) {
  const multiplier = { easy: 4, medium: 2, hard: 1 }[difficulty];
  const expectedGrid = 60 / bpm / 2 * multiplier;
  for (let index = 1; index < document.events.length; index += 1) {
    const previous = document.events[index - 1];
    const current = document.events[index];
    const gap = current.time - previous.time;
    assert.ok(gap > 0.000001, `${bpm}/${difficulty}: simultaneidad en ${current.id}`);
    assert.ok(
      gap < 0.07 - 0.000001 || gap > 0.1 + 0.000001,
      `${bpm}/${difficulty}: intervalo 70-100 ms en ${current.id}`,
    );
    if (previous.kind === 'drag') {
      assert.ok(gap >= 0.9 - 0.000001, `${bpm}/${difficulty}: sin descanso tras drag`);
    } else if (previous.phaseId === current.phaseId) {
      assert.ok(
        gap >= expectedGrid - 0.000002,
        `${bpm}/${difficulty}: densidad excedida en ${current.id}`,
      );
    }
  }
}
