import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createServer } from 'vite';
import {
  analysisSha256,
  fuseMusicalCandidates,
  generateHybridBeatmaps,
  HYBRID_GENERATOR_VERSION,
  inferPreviewPhases,
  inferMusicalGrammar,
} from './lib/hybrid-beatmap-generator.mjs';
import { validateBeatmapV2 } from './lib/music-contract-validation.mjs';

const trackId = 'untitled-0f61f35777';
const metadata = JSON.parse(await readFile(`content/music/metadata/${trackId}.json`, 'utf8'));
const analysisText = await readFile(`content/music/analysis/${trackId}.json`, 'utf8');
const analysis = JSON.parse(analysisText);
const versions = JSON.parse(await readFile('src/content/music-contract-versions.json', 'utf8'));
const options = {
  trackId,
  duration: metadata.durationSeconds,
  phases: metadata.suggestedSections,
  analysis,
  analysisHash: analysisSha256(analysisText),
  versions,
};
const first = generateHybridBeatmaps(options);
const second = generateHybridBeatmaps(options);
assert.deepEqual(first, second, 'M4 debe ser determinista');

const grammar = inferMusicalGrammar(analysis);
assert.equal(grammar.meter, '4/4-inferred');
assert.equal(grammar.beatsPerBar, 4);
assert.equal(grammar.phraseBeats, 16);
assert.ok(grammar.downbeatRemainder >= 0 && grammar.downbeatRemainder < 4);
assert.ok(grammar.confidence >= 0 && grammar.confidence <= 1);

const { easy, medium, hard } = first.documents;
for (const document of [easy, medium, hard]) {
  validateBeatmapV2(document);
  assert.equal(document.generatorVersion, HYBRID_GENERATOR_VERSION);
  assert.equal(document.analysisHash, analysisSha256(analysisText));
  assert.ok(document.events.length > 0);
  assertTemporalSafety(document);
  assert.ok(document.events.some((event) => event.kind === 'drag'));
  for (let index = 1; index < document.events.length; index += 1) {
    const previous = document.events[index - 1].start;
    const current = document.events[index].start;
    assert.ok(
      Math.hypot(current.x - previous.x, current.y - previous.y) >= .075 - 1e-6,
      `${document.difficulty}: notas consecutivas superpuestas`,
    );
  }
}
assertSubset(easy, medium, 'Easy no es subconjunto exacto de Medium');
assertSubset(medium, hard, 'Medium no es subconjunto exacto de Hard');
assert.ok(easy.events.length < medium.events.length && medium.events.length < hard.events.length);
assert.ok(hard.events.length < analysis.onsets.length, 'M4 convirtio cada onset en nota');

const musicalTimes = [...analysis.beats, ...analysis.onsets.map((onset) => onset.time)];
for (const event of hard.events) {
  assert.ok(
    musicalTimes.some((time) => Math.abs(time - event.time) <= .000001),
    `${event.id}: no proviene de beat/onset`,
  );
}
const fused = fuseMusicalCandidates(analysis, metadata.suggestedSections);
assert.ok(fused.length < analysis.beats.length + analysis.onsets.length);
assert.ok(new Set(hard.events.map((event) => `${event.start.x},${event.start.y}`)).size >= 24);
const fixedEightRepeats = hard.events.slice(8).filter((event, index) => (
  event.start.x === hard.events[index].start.x && event.start.y === hard.events[index].start.y
)).length;
assert.ok(fixedEightRepeats < hard.events.length * .35, 'Persiste un motivo fijo cada ocho notas');

const segmentTypes = new Set(first.diagnostics.segments.map((segment) => segment.type));
assert.ok(segmentTypes.has('quiet'));
assert.ok(segmentTypes.has('peak'));
assert.ok(segmentTypes.has('buildup') || segmentTypes.has('break'));
assert.ok(first.diagnostics.segments.length < 50, 'Segmentacion demasiado nerviosa');

for (const difficulty of ['easy', 'medium', 'hard']) {
  const coverage = first.diagnostics.coverage[difficulty];
  assert.equal(coverage.noteCount, first.documents[difficulty].events.length);
  assert.ok(coverage.beatOrStrongOnsetRatio >= .75, `${difficulty}: demasiadas notas sin pulso/onset fuerte`);
  assert.ok(coverage.averageSalience > 0, `${difficulty}: saliencia musical vacia`);
  assert.ok(coverage.phraseBoundariesCaptured > 0, `${difficulty}: no conserva inicios de frase`);
  assert.ok(coverage.rhythmicRoles.downbeat > 0, `${difficulty}: no conserva tiempos fuertes`);
  assert.ok(coverage.rhythmicRoles.syncopation > 0, `${difficulty}: perdio la sincopa`);
  assert.equal(
    coverage.sustainedDrags,
    first.documents[difficulty].events.filter((event) => event.kind === 'drag').length,
    `${difficulty}: existe un drag sin energia sostenida`,
  );
}

const previewCatalog = JSON.parse(await readFile('public/assets/beatmap-previews/m4/catalog.json', 'utf8'));
for (const track of previewCatalog) {
  assert.equal(track.price, 0);
  assert.equal(track.priceTier, 'free');
  for (const difficulty of ['easy', 'medium', 'hard']) {
    const document = JSON.parse(await readFile(
      `public/assets/beatmap-previews/m4/${track.id}/${difficulty}.json`,
      'utf8',
    ));
    validateBeatmapV2(document);
    assert.equal(document.trackId, track.id);
    assert.equal(document.difficulty, difficulty);
  }
}

const analyzedFiles = await readdir('content/music/analysis');
for (const fileName of analyzedFiles.filter((name) => name.endsWith('.json'))) {
  const analyzed = JSON.parse(await readFile(`content/music/analysis/${fileName}`, 'utf8'));
  const phases = inferPreviewPhases(analyzed);
  assert.equal(phases.length, 3);
  assert.equal(phases[0].startTime, 0);
  assert.equal(phases.at(-1).endTime, analyzed.duration);
  for (let index = 1; index < phases.length; index += 1) {
    assert.equal(phases[index].startTime, phases[index - 1].endTime);
  }
}

for (const difficulty of ['easy', 'medium', 'hard']) {
  const current = JSON.parse(await readFile(`public/assets/beatmaps/${trackId}/${difficulty}.json`, 'utf8'));
  assert.equal(current.generatorVersion, HYBRID_GENERATOR_VERSION, 'M4 aprobado no esta aplicado');
  assert.equal(current.locked, true, 'M4 aprobado debe quedar protegido en M6');
  const preview = JSON.parse(await readFile(`public/assets/beatmap-previews/m4/${trackId}/${difficulty}.json`, 'utf8'));
  assert.deepEqual(preview, first.documents[difficulty], `Preview ${difficulty} desactualizado`);
  assert.deepEqual(current, { ...first.documents[difficulty], locked: true }, `Mapa oficial ${difficulty} difiere del M4 aprobado`);
}

const server = await createServer({ configFile: false, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } });
try {
  const { TravelBudget } = await server.ssrLoadModule('/src/input/TravelBudget.ts');
  const { calculateTargetPlayfield, pointInTargetPlayfield } = await server.ssrLoadModule('/src/input/PlayfieldLayout.ts');
  const { getDragInteractionPolicy } = await server.ssrLoadModule('/src/input/drag/DragPolicyCatalog.ts');
  assert.equal(getDragInteractionPolicy('mouse-assisted').trackingMode, 'directional-assisted');
  assert.equal(getDragInteractionPolicy('touch-trace').trackingMode, 'trace');
  for (const [difficulty, document] of Object.entries(first.documents)) {
    for (const environment of [
      { mode: 'mouse', width: 1335, height: 1032 },
      { mode: 'touch', width: 390, height: 844 },
      { mode: 'pen', width: 430, height: 932 },
    ]) {
      const bounds = calculateTargetPlayfield(environment.width, environment.height, environment.mode);
      const budget = new TravelBudget(difficulty);
      for (const event of document.events) {
        const start = budget.projectHead(pointInTargetPlayfield(event.start, bounds), event.time, bounds, environment.mode);
        assertPointInBounds(start, bounds);
        let drag;
        if (event.kind === 'drag') {
          const end = budget.projectDragEnd(start, pointInTargetPlayfield(event.end, bounds), bounds, environment.mode);
          assertPointInBounds(end, bounds);
          const length = Math.hypot(end.x - start.x, end.y - start.y);
          if (environment.mode === 'mouse') assert.ok(length <= budget.profile.maximumDragLength + .01);
          drag = { end, length, completionTimeSeconds: { easy: 1, medium: .76, hard: .62 }[difficulty] };
        }
        budget.commit(event.time, start, environment.mode, drag);
      }
    }
  }
} finally {
  await server.close();
}

console.log(`Hybrid M4: ${easy.events.length}/${medium.events.length}/${hard.events.length} notas, motivos, segmentos y perfiles: OK`);

function assertSubset(smaller, larger, message) {
  const largerByTime = new Map(larger.events.map((event) => [event.time, event]));
  for (const event of smaller.events) assert.deepEqual(largerByTime.get(event.time), event, `${message}: ${event.id}`);
}

function assertTemporalSafety(document) {
  for (let index = 1; index < document.events.length; index += 1) {
    const previous = document.events[index - 1];
    const current = document.events[index];
    const gap = current.time - previous.time;
    assert.ok(gap > 0, `${document.difficulty}: simultaneidad`);
    assert.ok(gap < .07 || gap > .1, `${document.difficulty}: intervalo prohibido 70-100 ms`);
    if (previous.kind === 'drag') assert.ok(gap >= 1.05 - 1e-6, `${document.difficulty}: sin descanso de drag`);
  }
}

function assertPointInBounds(point, bounds) {
  assert.ok(point.x >= bounds.left - .01 && point.x <= bounds.right + .01);
  assert.ok(point.y >= bounds.top - .01 && point.y <= bounds.bottom + .01);
}
