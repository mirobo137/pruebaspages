import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { validateBeatmapV2 } from './lib/music-contract-validation.mjs';

const args = process.argv.slice(2);
const trackIndex = args.indexOf('--track');
const trackId = trackIndex >= 0 ? args[trackIndex + 1] : null;
if (!trackId || args.some((arg, index) => arg.startsWith('-') && index !== trackIndex)) {
  throw new Error('Uso: node scripts/lock-approved-beatmaps.mjs --track <trackId>');
}

const metadata = await readJson(`content/music/metadata/${trackId}.json`);
if (metadata.status !== 'active') {
  throw new Error(`${trackId}: solo se bloquean pistas activas y aprobadas.`);
}

const documents = {};
for (const difficulty of ['easy', 'medium', 'hard']) {
  const relativePath = `public/assets/beatmaps/${trackId}/${difficulty}.json`;
  const document = await readJson(relativePath);
  validateBeatmapV2(document);
  if (document.trackId !== trackId || document.difficulty !== difficulty) {
    throw new Error(`${relativePath}: identidad incoherente.`);
  }
  documents[difficulty] = { ...document, locked: true };
  await writeFile(relativePath, `${JSON.stringify(documents[difficulty], null, 2)}\n`, 'utf8');
}

const manifestPath = 'content/music/approved-beatmaps.json';
let manifest = { schemaVersion: 1, tracks: [] };
try {
  manifest = await readJson(manifestPath);
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}
const entry = {
  trackId,
  approvedAt: '2026-08-14',
  generatorVersion: documents.easy.generatorVersion,
  analysisHash: documents.easy.analysisHash,
  difficulties: Object.fromEntries(Object.entries(documents).map(([difficulty, document]) => [
    difficulty,
    {
      eventCount: document.events.length,
      sha256: sha256(`${JSON.stringify(document, null, 2)}\n`),
    },
  ])),
};
manifest.tracks = [...manifest.tracks.filter((track) => track.trackId !== trackId), entry]
  .sort((left, right) => left.trackId.localeCompare(right.trackId));
await mkdir(path.dirname(manifestPath), { recursive: true });
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`M6 lock: ${trackId} bloqueada y registrada (${Object.values(entry.difficulties).map((item) => item.eventCount).join('/')}).`);

async function readJson(relativePath) {
  return JSON.parse(await readFile(relativePath, 'utf8'));
}

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}
