import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ingestSunoTracks } from './lib/suno-ingestion.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const audioDirectory = path.join(projectRoot, 'public', 'assets', 'audio');
const sourceDirectory = path.join(audioDirectory, 'agregadas suno');
const categoriesPath = path.join(projectRoot, 'src', 'content', 'song-categories.json');
const registryPath = path.join(projectRoot, 'content', 'music', 'suno-candidates.json');
const categories = JSON.parse(await readFile(categoriesPath, 'utf8'));

const imported = await ingestSunoTracks({
  audioDirectory,
  sourceDirectory,
  categories,
  registryPath,
});

if (imported.length === 0) {
  console.log('Bandeja Suno vacia: no fue necesario importar canciones.');
} else {
  console.log(`Canciones Suno recibidas por el pipeline automatico: ${imported.length}`);
  for (const track of imported) {
    console.log(`- ${track.originalFileName} -> ${track.relativeAudioPath}`);
  }
  console.log('El sincronizador completara Analysis v1, Beatmap v2 y activacion.');
}
