import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSunoDisplayTitle, hashFile } from './lib/suno-ingestion.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const audioDirectory = path.join(projectRoot, 'public', 'assets', 'audio');
const manifestPath = path.join(projectRoot, 'public', 'assets', 'music-manifest.json');
const candidatesPath = path.join(projectRoot, 'content', 'music', 'suno-candidates.json');
const metadataDirectory = path.join(projectRoot, 'content', 'music', 'metadata');

function parseOptions(args) {
  let trackId = null;
  let force = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--force') force = true;
    else if (argument === '--track') {
      trackId = args[index + 1] ?? null;
      index += 1;
    } else {
      throw new Error(`Opcion desconocida: ${argument}`);
    }
  }
  if (trackId !== null && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trackId)) {
    throw new Error(`trackId invalido: ${trackId}`);
  }
  return { trackId, force };
}

function titleFromFileName(fileName) {
  return path.basename(fileName, path.extname(fileName))
    .replace(/\s*\(\d+\)\s*$/u, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function resolveAudioFile(relativeAudioPath) {
  const normalized = relativeAudioPath.replaceAll('/', path.sep);
  const resolved = path.resolve(audioDirectory, normalized);
  if (!resolved.startsWith(`${audioDirectory}${path.sep}`)) {
    throw new Error(`Ruta de audio fuera del directorio permitido: ${relativeAudioPath}`);
  }
  return resolved;
}

const { trackId: requestedTrackId, force } = parseOptions(process.argv.slice(2));
const activeTracks = JSON.parse(await readFile(manifestPath, 'utf8'));
const candidateRegistry = JSON.parse(await readFile(candidatesPath, 'utf8'));
const normalizedRegistryTracks = candidateRegistry.tracks.map((track) => {
  if (track.pipeline !== 'automatic' || typeof track.sha256 !== 'string') return track;
  const title = createSunoDisplayTitle(track.originalFileName, track.sha256);
  return track.title === title ? track : { ...track, title };
});
if (normalizedRegistryTracks.some((track, index) => track !== candidateRegistry.tracks[index])) {
  await writeFile(
    candidatesPath,
    `${JSON.stringify({ ...candidateRegistry, tracks: normalizedRegistryTracks }, null, 2)}\n`,
    'utf8',
  );
}
const managedTracks = normalizedRegistryTracks.filter(
  (track) => track.status === 'candidate' || track.status === 'active',
);
const managedIds = new Set(managedTracks.map((track) => track.trackId));

const definitions = [
  ...activeTracks.filter((track) => !managedIds.has(track.id)).map((track) => ({
    trackId: track.id,
    title: track.title,
    status: 'legacy-active',
    audioMode: 'loop',
    webAudioPath: track.audioPath,
    relativeAudioPath: track.audioPath.replace(/^\.\/assets\/audio\//, ''),
    loopDuration: 30,
    provenance: {
      sourceType: 'legacy-unknown',
      provider: null,
      commercialUseStatus: 'review-required',
      privateEvidenceRef: null,
    },
  })),
  ...managedTracks.map((track) => ({
    trackId: track.trackId,
    title: track.pipeline === 'automatic' && typeof track.sha256 === 'string'
      ? createSunoDisplayTitle(track.originalFileName, track.sha256)
      : track.title ?? titleFromFileName(track.originalFileName),
    status: track.status,
    audioMode: 'single',
    webAudioPath: `./assets/audio/${track.relativeAudioPath}`,
    relativeAudioPath: track.relativeAudioPath,
    provenance: {
      sourceType: 'ai-generated',
      provider: 'suno',
      commercialUseStatus: 'evidence-required',
      privateEvidenceRef: null,
    },
  })),
];

const duplicateIds = definitions
  .map((definition) => definition.trackId)
  .filter((id, index, all) => all.indexOf(id) !== index);
if (duplicateIds.length > 0) {
  throw new Error(`Metadata con trackId duplicado: ${[...new Set(duplicateIds)].join(', ')}`);
}

const selected = requestedTrackId
  ? definitions.filter((definition) => definition.trackId === requestedTrackId)
  : definitions;
if (requestedTrackId && selected.length === 0) {
  throw new Error(`No existe la cancion solicitada: ${requestedTrackId}`);
}

await mkdir(metadataDirectory, { recursive: true });
let created = 0;
let updated = 0;
let preserved = 0;
for (const definition of selected) {
  const metadataPath = path.join(metadataDirectory, `${definition.trackId}.json`);
  let exists = true;
  try {
    await access(metadataPath);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    exists = false;
  }
  if (exists && !force) {
    const existing = JSON.parse(await readFile(metadataPath, 'utf8'));
    if (existing.title === definition.title) {
      preserved += 1;
      continue;
    }
    await writeFile(metadataPath, `${JSON.stringify({ ...existing, title: definition.title }, null, 2)}\n`, 'utf8');
    updated += 1;
    continue;
  }

  const audioHash = await hashFile(resolveAudioFile(definition.relativeAudioPath));
  const metadata = {
    schemaVersion: 1,
    trackId: definition.trackId,
    title: definition.title,
    status: definition.status,
    audioMode: definition.audioMode,
    webAudioPath: definition.webAudioPath,
    audioHash,
    ...(definition.loopDuration ? { loopDuration: definition.loopDuration } : {}),
    rhythm: {
      tempoHint: null,
      bpmOverride: null,
      beatOffsetOverride: null,
    },
    suggestedSections: [],
    provenance: definition.provenance,
  };

  try {
    await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, {
      encoding: 'utf8',
      flag: force ? 'w' : 'wx',
    });
    if (exists) updated += 1;
    else created += 1;
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    preserved += 1;
  }
}

console.log(
  `Metadata musical: ${created} creada(s), ${updated} actualizada(s), `
  + `${preserved} preservada(s).`,
);
