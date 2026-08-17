import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  chooseSunoCategory,
  createSunoDisplayTitle,
  createSunoGeneratedStem,
  ingestSunoTracks,
  normalizeSunoStem,
} from './lib/suno-ingestion.mjs';

const categories = [
  { id: 'free', folder: null, price: 0 },
  { id: 'economy', folder: 'economicas', price: 400 },
  { id: 'select', folder: 'selectas', price: 800 },
  { id: 'premium', folder: 'premium', price: 1400 },
];

assert.equal(normalizeSunoStem('Canci\u00f3n El\u00e9ctrica (4).mp3'), 'cancion-electrica');
assert.equal(normalizeSunoStem('Untitled (2).mp3'), 'untitled');
assert.equal(
  chooseSunoCategory('00000000ffffffff', categories).id,
  'free',
);
assert.equal(chooseSunoCategory('00000002ffffffff', categories).id, 'select');
const generatedHashA = '61be6b1153aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const generatedHashB = '686e538467bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
assert.match(createSunoGeneratedStem(generatedHashA), /^[a-z]+-[a-z]+-61be6b1153$/u);
assert.notEqual(createSunoGeneratedStem(generatedHashA), createSunoGeneratedStem(generatedHashB));
assert.match(createSunoDisplayTitle('Untitled (2).mp3', generatedHashA), /^[A-Z][a-z]+ [A-Z][a-z]+$/u);
assert.match(createSunoDisplayTitle('Velvet Steel (1).mp3', generatedHashB), /^[A-Z][a-z]+ [A-Z][a-z]+$/u);
assert.doesNotMatch(createSunoDisplayTitle('Untitled (2).mp3', generatedHashA), /[0-9A-F]{10}$/u);
assert.doesNotMatch(createSunoDisplayTitle('Velvet Steel (1).mp3', generatedHashB), /[0-9A-F]{10}$/u);

const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'superflow-suno-'));
try {
  const audioDirectory = path.join(temporaryRoot, 'audio');
  const sourceDirectory = path.join(audioDirectory, 'agregadas suno');
  const registryPath = path.join(temporaryRoot, 'content', 'suno-candidates.json');
  await mkdir(sourceDirectory, { recursive: true });
  await writeFile(path.join(sourceDirectory, 'Untitled (1).mp3'), 'track-one');
  await writeFile(path.join(sourceDirectory, 'Untitled (2).mp3'), 'track-two');

  const firstRun = await ingestSunoTracks({
    audioDirectory,
    sourceDirectory,
    categories,
    registryPath,
  });
  assert.equal(firstRun.length, 2);
  assert.notEqual(firstRun[0].trackId, firstRun[1].trackId);
  assert.ok(firstRun.every((track) => track.status === 'candidate'));
  assert.ok(firstRun.every((track) => track.pipeline === 'automatic'));
  assert.equal(new Set(firstRun.map((track) => track.title)).size, 2);
  assert.ok(firstRun.every((track) => /^[a-z]+-[a-z]+-[0-9a-f]{10}\.mp3$/u.test(
    track.relativeAudioPath.split('/').at(-1),
  )));
  assert.ok(firstRun.every((track) => track.relativeAudioPath.endsWith('.mp3')));
  assert.deepEqual(await readdir(sourceDirectory), []);

  const registry = JSON.parse(await readFile(registryPath, 'utf8'));
  assert.equal(registry.version, 1);
  assert.equal(registry.tracks.length, 2);

  const secondRun = await ingestSunoTracks({
    audioDirectory,
    sourceDirectory,
    categories,
    registryPath,
  });
  assert.deepEqual(secondRun, []);
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

console.log('Ingestion Suno determinista, segura e idempotente: OK');
