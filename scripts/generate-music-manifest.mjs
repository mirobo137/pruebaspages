import { readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const audioDirectory = path.join(projectRoot, 'public', 'assets', 'audio');
const manifestPath = path.join(projectRoot, 'public', 'assets', 'music-manifest.json');
const supportedExtensions = new Set(['.mp3', '.ogg', '.wav']);

function createId(fileName) {
  return path
    .basename(fileName, path.extname(fileName))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function createTitle(fileName) {
  return path
    .basename(fileName, path.extname(fileName))
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const files = (await readdir(audioDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((fileName) => supportedExtensions.has(path.extname(fileName).toLowerCase()))
  .sort((left, right) => left.localeCompare(right));

const tracks = [];

for (const fileName of files) {
  const filePath = path.join(audioDirectory, fileName);
  const fileInfo = await stat(filePath);
  const id = createId(fileName);

  tracks.push({
    id,
    title: createTitle(fileName),
    audioPath: `./assets/audio/${fileName}`,
    beatmapPaths: {
      easy: `./assets/beatmaps/${id}/easy.json`,
      medium: `./assets/beatmaps/${id}/medium.json`,
      hard: `./assets/beatmaps/${id}/hard.json`,
    },
  });

  const sizeInKiB = Math.round(fileInfo.size / 1024);
  const mobileWarning = fileInfo.size > 20 * 1024 * 1024 ? ' ⚠ supera 20 MiB' : '';
  console.log(`- ${fileName} (${sizeInKiB} KiB)${mobileWarning}`);
}

await writeFile(manifestPath, `${JSON.stringify(tracks, null, 2)}\n`, 'utf8');
console.log(`Catálogo musical generado: ${tracks.length} canción(es)`);
