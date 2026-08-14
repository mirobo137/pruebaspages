import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { validateAnalysisV1 } from './lib/music-contract-validation.mjs';

const analysisRoot = path.join('content', 'music', 'analysis');
const metadataRoot = path.join('content', 'music', 'metadata');
const files = (await readdir(analysisRoot)).filter((name) => name.endsWith('.json')).sort();
assert.ok(files.length >= 6, `M3 requiere al menos 6 analisis; existen ${files.length}`);

for (const fileName of files) {
  const analysis = validateAnalysisV1(JSON.parse(await readFile(
    path.join(analysisRoot, fileName), 'utf8',
  )));
  const metadata = JSON.parse(await readFile(
    path.join(metadataRoot, `${analysis.trackId}.json`), 'utf8',
  ));
  assert.equal(fileName, `${analysis.trackId}.json`);
  assert.equal(analysis.audioHash, metadata.audioHash);
  assert.equal(analysis.analyzerVersion, 'librosa-m3-v1');
  assert.ok(analysis.beats.length > 0, `${analysis.trackId}: sin beats`);
  assert.ok(analysis.onsets.length > 0, `${analysis.trackId}: sin onsets`);
  assert.ok(analysis.energyFrames.length > 0, `${analysis.trackId}: sin energia`);
  assertSorted(analysis.beats, `${analysis.trackId}/beats`);
  assertSorted(analysis.onsets.map((entry) => entry.time), `${analysis.trackId}/onsets`);
  assertSorted(analysis.energyFrames.map((entry) => entry.time), `${analysis.trackId}/energy`);
  const audioRelative = metadata.webAudioPath.replace(/^\.\/assets\/audio\//, '');
  const audio = await readFile(path.join('public', 'assets', 'audio', audioRelative));
  assert.equal(createHash('sha256').update(audio).digest('hex'), analysis.audioHash);
}

console.log(`Analysis M3: ${files.length} pistas, hashes, beats, onsets y energia: OK`);

function assertSorted(values, label) {
  for (let index = 1; index < values.length; index += 1) {
    assert.ok(values[index] >= values[index - 1], `${label}: fuera de orden`);
  }
}
