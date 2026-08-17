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
    // JSON generated on Windows can be checked out with CRLF. Hash the
    // canonical serialization used by lock-approved-beatmaps.mjs so release
    // verification is identical on Windows, macOS and Linux.
    assert.equal(
      sha256(`${JSON.stringify(current, null, 2)}\n`),
      approved.difficulties[difficulty].sha256,
    );
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
const approvedIds = new Set(manifest.tracks.map((track) => track.trackId));
const previewIds = new Set(previewCatalog.map((track) => track.id));
const registry = await readJson('content/music/suno-candidates.json');
const automaticIds = new Set(registry.tracks.filter((track) => (
  track.pipeline === 'automatic' && track.status === 'active'
)).map((track) => track.trackId));
for (const file of analyses) {
  const trackId = file.replace(/\.json$/, '');
  assert.ok(
    previewIds.has(trackId) || approvedIds.has(trackId) || automaticIds.has(trackId),
    `${trackId}: analisis sin preview, aprobacion ni alta automatica`,
  );
  if (automaticIds.has(trackId)) {
    for (const difficulty of ['easy', 'medium', 'hard']) {
      const document = await readJson(`public/assets/beatmaps/${trackId}/${difficulty}.json`);
      validateBeatmapV2(document);
    }
  }
}
console.log(`M6 release: ${manifest.tracks.length} pista(s) bloqueada(s), ${automaticIds.size} automatica(s), ${analyses.length} analisis cubiertos: OK`);

async function readJson(relativePath) {
  return JSON.parse(await readFile(relativePath, 'utf8'));
}

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}
