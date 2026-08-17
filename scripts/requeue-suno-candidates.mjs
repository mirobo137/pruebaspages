import { copyFile, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { hashFile } from './lib/suno-ingestion.mjs';

if (!process.argv.slice(2).includes('--apply')) {
  throw new Error('Operacion explicita requerida: node scripts/requeue-suno-candidates.mjs --apply');
}

const audioRoot = path.resolve('public/assets/audio');
const inbox = path.join(audioRoot, 'agregadas suno');
const registryPath = 'content/music/suno-candidates.json';
const registry = JSON.parse(await readFile(registryPath, 'utf8'));
const approved = JSON.parse(await readFile('content/music/approved-beatmaps.json', 'utf8'));
const approvedIds = new Set(approved.tracks.map((track) => track.trackId));
const candidates = registry.tracks.filter((track) => track.status === 'candidate');
if (candidates.length === 0) {
  console.log('No hay candidatas historicas para reencolar.');
  process.exit(0);
}
await mkdir(inbox, { recursive: true });

const moves = candidates.map((track) => {
  if (approvedIds.has(track.trackId)) throw new Error(`${track.trackId}: pista aprobada no puede reencolarse.`);
  return {
    track,
    source: path.resolve(audioRoot, track.relativeAudioPath.replaceAll('/', path.sep)),
    destination: path.resolve(inbox, track.originalFileName),
    action: 'move',
  };
});
for (const move of moves) {
  if (!move.source.startsWith(`${audioRoot}${path.sep}`)) throw new Error('Ruta fuente fuera de audio.');
  if (!move.destination.startsWith(`${inbox}${path.sep}`)) throw new Error('Ruta destino fuera de inbox.');
  try {
    await readFile(move.destination);
    const [sourceHash, destinationHash] = await Promise.all([
      hashFile(move.source),
      hashFile(move.destination),
    ]);
    if (sourceHash !== move.track.sha256 || destinationHash !== move.track.sha256) {
      throw new Error(`Conflicto de contenido en la bandeja: ${move.track.originalFileName}`);
    }
    move.action = 'deduplicate';
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  await readFile(move.source);
}

const completed = [];
try {
  for (const move of moves) {
    if (move.action === 'deduplicate') await unlink(move.source);
    else await rename(move.source, move.destination);
    completed.push(move);
  }
  await writeFile(registryPath, `${JSON.stringify({
    ...registry,
    tracks: registry.tracks.filter((track) => track.status !== 'candidate'),
  }, null, 2)}\n`, 'utf8');
} catch (error) {
  for (const move of completed.reverse()) {
    if (move.action === 'deduplicate') await copyFile(move.destination, move.source);
    else await rename(move.destination, move.source);
  }
  throw error;
}

for (const move of moves) {
  try {
    await unlink(`content/music/metadata/${move.track.trackId}.json`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}
console.log(`Reencoladas ${moves.length} candidatas historicas; las seis activas permanecen intactas.`);
