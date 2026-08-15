import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { canOverwriteBeatmap } from './lib/beatmap-generation-policy.mjs';
import {
  analysisSha256,
  generateHybridBeatmaps,
  inferPreviewPhases,
} from './lib/hybrid-beatmap-generator.mjs';
import { validateBeatmapV2 } from './lib/music-contract-validation.mjs';

const manifest = await readJson('content/music/approved-beatmaps.json');
assert.equal(manifest.schemaVersion, 1);
assert.ok(manifest.tracks.length > 0, 'no hay mapas aprobados bloqueados');
const versions = await readJson('src/content/music-contract-versions.json');

for (const approved of manifest.tracks) {
  const metadata = await readJson(`content/music/metadata/${approved.trackId}.json`);
  assert.equal(metadata.status, 'active');
  const analysisText = await readFile(`content/music/analysis/${approved.trackId}.json`, 'utf8');
  const analysis = JSON.parse(analysisText);
  const generated = generateHybridBeatmaps({
    trackId: approved.trackId,
    duration: metadata.durationSeconds ?? analysis.duration,
    phases: metadata.suggestedSections.length > 0
      ? metadata.suggestedSections
      : inferPreviewPhases(analysis),
    analysis,
    analysisHash: analysisSha256(analysisText),
    versions,
  }).documents;
  for (const difficulty of ['easy', 'medium', 'hard']) {
    const fileText = await readFile(
      `public/assets/beatmaps/${approved.trackId}/${difficulty}.json`,
      'utf8',
    );
    const current = JSON.parse(fileText);
    validateBeatmapV2(current);
    assert.equal(current.locked, true, `${approved.trackId}/${difficulty} no esta bloqueado`);
    assert.equal(canOverwriteBeatmap(current, false), false);
    assert.equal(canOverwriteBeatmap(current, true), false);
    assert.equal(sha256(fileText), approved.difficulties[difficulty].sha256);
    assert.deepEqual(
      current,
      { ...generated[difficulty], locked: true },
      `${approved.trackId}/${difficulty}: regenerar alteraria el mapa aprobado`,
    );
  }
}

const analyses = (await readdir('content/music/analysis')).filter((file) => file.endsWith('.json'));
const previewCatalog = await readJson('public/assets/beatmap-previews/m4/catalog.json');
assert.ok(analyses.length >= 6, 'M6 requiere al menos seis canciones analizadas');
assert.deepEqual(
  previewCatalog.map((track) => track.id).sort(),
  analyses.map((file) => file.replace(/\.json$/, '')).sort(),
  'toda pista analizada debe tener preview curable',
);
console.log(`M6 release: ${manifest.tracks.length} pista(s) bloqueada(s), ${analyses.length} previews listas para curacion: OK`);

async function readJson(relativePath) {
  return JSON.parse(await readFile(relativePath, 'utf8'));
}

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}
