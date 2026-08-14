import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const SUNO_REGISTRY_VERSION = 1;
export const SUPPORTED_SUNO_EXTENSIONS = new Set(['.mp3', '.ogg']);

export function normalizeSunoStem(fileName) {
  const extension = path.extname(fileName);
  const stem = path.basename(fileName, extension)
    .replace(/\s*\(\d+\)\s*$/u, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return stem || 'suno-track';
}

export function choosePaidCategory(contentHash, categories) {
  const paidCategories = categories.filter(
    (category) => category?.folder && Number(category.price) > 0,
  );
  if (paidCategories.length === 0) {
    throw new Error('No hay categorias de pago disponibles para canciones Suno.');
  }

  const selector = Number.parseInt(contentHash.slice(0, 8), 16);
  return paidCategories[selector % paidCategories.length];
}

export async function hashFile(filePath) {
  const data = await readFile(filePath);
  return createHash('sha256').update(data).digest('hex');
}

export async function readSunoRegistry(registryPath) {
  try {
    const parsed = JSON.parse(await readFile(registryPath, 'utf8'));
    if (parsed?.version !== SUNO_REGISTRY_VERSION || !Array.isArray(parsed.tracks)) {
      throw new Error('El registro de canciones Suno tiene un formato invalido.');
    }
    return parsed;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return { version: SUNO_REGISTRY_VERSION, tracks: [] };
    }
    throw error;
  }
}

async function writeRegistry(registryPath, registry) {
  await mkdir(path.dirname(registryPath), { recursive: true });
  const orderedRegistry = {
    version: SUNO_REGISTRY_VERSION,
    tracks: [...registry.tracks].sort((left, right) => (
      left.relativeAudioPath.localeCompare(right.relativeAudioPath)
    )),
  };
  await writeFile(registryPath, `${JSON.stringify(orderedRegistry, null, 2)}\n`, 'utf8');
}

export async function ingestSunoTracks({
  audioDirectory,
  sourceDirectory,
  categories,
  registryPath,
}) {
  await mkdir(sourceDirectory, { recursive: true });
  const registry = await readSunoRegistry(registryPath);
  const registeredHashes = new Map(
    registry.tracks.map((track) => [track.sha256, track]),
  );
  const entries = (await readdir(sourceDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
    .sort((left, right) => left.name.localeCompare(right.name));

  const unsupported = entries.filter(
    (entry) => !SUPPORTED_SUNO_EXTENSIONS.has(path.extname(entry.name).toLowerCase()),
  );
  if (unsupported.length > 0) {
    throw new Error(
      'La bandeja Suno solo admite MP3 u OGG. Convierte o retira: '
      + unsupported.map((entry) => entry.name).join(', '),
    );
  }

  const imported = [];
  for (const entry of entries) {
    const sourcePath = path.join(sourceDirectory, entry.name);
    const sha256 = await hashFile(sourcePath);
    const previous = registeredHashes.get(sha256);
    if (previous) {
      throw new Error(
        `La cancion ${entry.name} ya fue importada como ${previous.relativeAudioPath}. `
        + 'Retira el duplicado de la bandeja.',
      );
    }

    const category = choosePaidCategory(sha256, categories);
    const extension = path.extname(entry.name).toLowerCase();
    const fileName = `${normalizeSunoStem(entry.name)}-${sha256.slice(0, 10)}${extension}`;
    const relativeAudioPath = path.posix.join(category.folder, fileName);
    const destinationDirectory = path.join(audioDirectory, category.folder);
    const destinationPath = path.join(destinationDirectory, fileName);

    await mkdir(destinationDirectory, { recursive: true });
    try {
      await stat(destinationPath);
      throw new Error(`El destino ya existe: ${relativeAudioPath}`);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }

    const track = {
      trackId: path.basename(fileName, extension),
      relativeAudioPath,
      originalFileName: entry.name,
      sha256,
      categoryId: category.id,
      status: 'candidate',
    };
    await rename(sourcePath, destinationPath);
    registry.tracks.push(track);
    try {
      await writeRegistry(registryPath, registry);
    } catch (error) {
      registry.tracks.pop();
      await rename(destinationPath, sourcePath);
      throw error;
    }
    registeredHashes.set(sha256, track);
    imported.push(track);
  }

  return imported;
}
