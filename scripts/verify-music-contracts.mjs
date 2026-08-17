import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canOverwriteBeatmap } from './lib/beatmap-generation-policy.mjs';
import {
  validateAnalysisV1,
  validateBeatmapV2,
  validateTrackMetadataV1,
} from './lib/music-contract-validation.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const musicRoot = path.join(projectRoot, 'content', 'music');
const schemasRoot = path.join(musicRoot, 'schemas');
const metadataRoot = path.join(musicRoot, 'metadata');
const audioRoot = path.join(projectRoot, 'public', 'assets', 'audio');
const beatmapsRoot = path.join(projectRoot, 'public', 'assets', 'beatmaps');

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

for (const schemaName of [
  'beatmap-v2.schema.json',
  'analysis-v1.schema.json',
  'track-metadata-v1.schema.json',
]) {
  const schema = await readJson(path.join(schemasRoot, schemaName));
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(schema.additionalProperties, false);
}

const versions = await readJson(path.join(projectRoot, 'src', 'content', 'music-contract-versions.json'));
const beatmapExample = validateBeatmapV2(await readJson(path.join(musicRoot, 'examples', 'beatmap-v2.example.json')));
validateAnalysisV1(await readJson(path.join(musicRoot, 'examples', 'analysis-v1.example.json')));
assert.equal(beatmapExample.spatialModelVersion, versions.spatialModelVersion);
assert.equal(beatmapExample.interactionContractVersion, versions.interactionContractVersion);

assert.throws(() => validateBeatmapV2({ ...beatmapExample, desktop: {} }), /no se permiten ramas/);
const invalidPixelMap = structuredClone(beatmapExample);
invalidPixelMap.events[0].start.x = 240;
assert.throws(() => validateBeatmapV2(invalidPixelMap), /fuera de 0\.\.1/);
assert.equal(canOverwriteBeatmap(null, false), true);
assert.equal(canOverwriteBeatmap({ generated: true, locked: false }, false), false);
assert.equal(canOverwriteBeatmap({ generated: true, locked: false }, true), true);
assert.equal(canOverwriteBeatmap({ generated: true, locked: true }, true), false);
assert.equal(canOverwriteBeatmap({ trackId: 'reviewed-map' }, true), false);
assert.equal(canOverwriteBeatmap({ schemaVersion: 2, locked: false }, true), true);
assert.equal(canOverwriteBeatmap({ schemaVersion: 2, locked: false }, false), false);
assert.equal(canOverwriteBeatmap({ schemaVersion: 2, locked: true }, true), false);

const manifest = await readJson(path.join(projectRoot, 'public', 'assets', 'music-manifest.json'));
const candidates = (await readJson(path.join(musicRoot, 'suno-candidates.json'))).tracks
  .filter((track) => track.status === 'candidate');
const metadataFiles = (await readdir(metadataRoot)).filter((name) => name.endsWith('.json'));
assert.equal(metadataFiles.length, manifest.length + candidates.length);

const expectedIds = new Set([
  ...manifest.map((track) => track.id),
  ...candidates.map((track) => track.trackId),
]);
for (const fileName of metadataFiles) {
  const metadata = validateTrackMetadataV1(await readJson(path.join(metadataRoot, fileName)));
  assert.ok(expectedIds.delete(metadata.trackId), `Metadata inesperada o duplicada: ${metadata.trackId}`);
  const relativeAudioPath = metadata.webAudioPath.replace(/^\.\/assets\/audio\//, '');
  const audio = await readFile(path.join(audioRoot, relativeAudioPath.replaceAll('/', path.sep)));
  assert.equal(createHash('sha256').update(audio).digest('hex'), metadata.audioHash);
}
assert.equal(expectedIds.size, 0, `Falta metadata para: ${[...expectedIds].join(', ')}`);

let v1MapCount = 0;
let v2MapCount = 0;
let reviewedMapCount = 0;
for (const track of manifest) {
  for (const difficulty of ['easy', 'medium', 'hard']) {
    const document = await readJson(path.join(beatmapsRoot, track.id, `${difficulty}.json`));
    assert.equal(document.trackId, track.id);
    assert.equal(document.difficulty, difficulty);
    if (document.schemaVersion === 2) {
      validateBeatmapV2(document);
      v2MapCount += 1;
    } else {
      assert.ok(Number.isFinite(document.loopDuration) && document.loopDuration > 0);
      assert.ok(Array.isArray(document.phases) && document.phases.length > 0);
      v1MapCount += 1;
    }
    if (document.schemaVersion !== 2 && document.generated !== true) {
      reviewedMapCount += 1;
      assert.equal(canOverwriteBeatmap(document, true), false);
    }
  }
}
assert.equal(v1MapCount + v2MapCount, manifest.length * 3);
assert.ok(v1MapCount >= 0);
assert.ok(v2MapCount >= 3);
assert.equal(reviewedMapCount, 3);

console.log(
  `Music contracts M0: 3 schemas, ${metadataFiles.length} metadata, `
  + `${v1MapCount} mapas v1, ${v2MapCount} mapas v2 y bloqueo revisado: OK`,
);
