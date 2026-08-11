import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const audioDirectory = path.join(projectRoot, 'public', 'assets', 'audio');
const manifestPath = path.join(projectRoot, 'public', 'assets', 'music-manifest.json');
const categoriesPath = path.join(
  projectRoot,
  'src',
  'content',
  'song-categories.json',
);
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
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toUrlPath(...parts) {
  return parts.join('/').replaceAll('\\', '/');
}

function validateCategories(categories) {
  if (!Array.isArray(categories) || categories.length !== 4) {
    throw new Error('song-categories.json debe contener exactamente 4 categorias.');
  }

  const ids = new Set();
  const folders = new Set();
  for (const category of categories) {
    if (
      typeof category?.id !== 'string'
      || typeof category?.label !== 'string'
      || !Number.isSafeInteger(category?.price)
      || category.price < 0
      || (category.folder !== null && typeof category.folder !== 'string')
    ) {
      throw new Error('Hay una categoria musical con formato invalido.');
    }
    if (ids.has(category.id)) throw new Error(`Categoria duplicada: ${category.id}`);
    ids.add(category.id);
    if (category.folder !== null) {
      if (folders.has(category.folder)) {
        throw new Error(`Carpeta de categoria duplicada: ${category.folder}`);
      }
      folders.add(category.folder);
    }
  }
}

const categories = JSON.parse(await readFile(categoriesPath, 'utf8'));
validateCategories(categories);
await mkdir(audioDirectory, { recursive: true });

const discoveredTracks = [];
for (const category of categories) {
  const categoryDirectory = category.folder
    ? path.join(audioDirectory, category.folder)
    : audioDirectory;
  await mkdir(categoryDirectory, { recursive: true });

  const entries = await readdir(categoryDirectory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => supportedExtensions.has(path.extname(fileName).toLowerCase()))
    .sort((left, right) => left.localeCompare(right));

  for (const fileName of files) {
    discoveredTracks.push({ category, fileName, categoryDirectory });
  }
}

const duplicateIds = new Map();
for (const track of discoveredTracks) {
  const id = createId(track.fileName);
  const locations = duplicateIds.get(id) ?? [];
  locations.push(track.category.folder
    ? `${track.category.folder}/${track.fileName}`
    : track.fileName);
  duplicateIds.set(id, locations);
}
const collisions = [...duplicateIds.entries()].filter(([, locations]) => locations.length > 1);
if (collisions.length > 0) {
  const details = collisions
    .map(([id, locations]) => `- ${id}: ${locations.join(', ')}`)
    .join('\n');
  throw new Error(
    `Hay canciones que generan el mismo ID. Cambia uno de los nombres:\n${details}`,
  );
}

const tracks = [];
for (const { category, fileName, categoryDirectory } of discoveredTracks) {
  const filePath = path.join(categoryDirectory, fileName);
  const fileInfo = await stat(filePath);
  const id = createId(fileName);
  const relativeAudioPath = category.folder
    ? toUrlPath(category.folder, fileName)
    : fileName;

  tracks.push({
    id,
    title: createTitle(fileName),
    audioPath: `./assets/audio/${relativeAudioPath}`,
    priceTier: category.id,
    price: category.price,
    beatmapPaths: {
      easy: `./assets/beatmaps/${id}/easy.json`,
      medium: `./assets/beatmaps/${id}/medium.json`,
      hard: `./assets/beatmaps/${id}/hard.json`,
    },
  });

  const sizeInKiB = Math.round(fileInfo.size / 1024);
  const mobileWarning = fileInfo.size > 20 * 1024 * 1024 ? ' - supera 20 MiB' : '';
  console.log(
    `- [${category.label} / ${category.price} monedas] ${relativeAudioPath}`
      + ` (${sizeInKiB} KiB)${mobileWarning}`,
  );
}

await writeFile(manifestPath, `${JSON.stringify(tracks, null, 2)}\n`, 'utf8');
console.log(`Catalogo musical generado: ${tracks.length} cancion(es)`);
