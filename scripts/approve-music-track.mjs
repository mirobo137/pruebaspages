import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  analysisSha256,
  generateHybridBeatmaps,
  inferPreviewPhases,
} from './lib/hybrid-beatmap-generator.mjs';
import {
  validateAnalysisV1,
  validateBeatmapV2,
  validateTrackMetadataV1,
} from './lib/music-contract-validation.mjs';

const trackIds = parseTrackIds(process.argv.slice(2));
const versions = await readJson('src/content/music-contract-versions.json');
const registry = await readJson('content/music/suno-candidates.json');
const prepared = [];

for (const trackId of trackIds) {
  const registryTrack = registry.tracks.find((track) => track.trackId === trackId);
  if (!registryTrack) throw new Error(`${trackId}: no existe en el registro Suno.`);
  const metadataPath = `content/music/metadata/${trackId}.json`;
  const metadata = validateTrackMetadataV1(await readJson(metadataPath));
  const analysisText = await readFile(`content/music/analysis/${trackId}.json`, 'utf8');
  const analysis = validateAnalysisV1(JSON.parse(analysisText));
  if (metadata.audioHash !== analysis.audioHash) {
    throw new Error(`${trackId}: metadata y analisis no corresponden al mismo audio.`);
  }
  const phases = metadata.suggestedSections.length > 0
    ? metadata.suggestedSections
    : inferPreviewPhases(analysis);
  const activeMetadata = validateTrackMetadataV1({
    ...metadata,
    status: 'active',
    durationSeconds: metadata.durationSeconds ?? analysis.duration,
    rhythm: {
      ...metadata.rhythm,
      tempoHint: metadata.rhythm.tempoHint ?? analysis.bpm,
    },
    suggestedSections: phases,
  });
  const result = generateHybridBeatmaps({
    trackId,
    duration: activeMetadata.durationSeconds,
    phases,
    analysis,
    analysisHash: analysisSha256(analysisText),
    versions,
  });
  for (const document of Object.values(result.documents)) validateBeatmapV2(document);
  prepared.push({ trackId, metadataPath, activeMetadata, documents: result.documents });
}

for (const item of prepared) {
  await writeJson(item.metadataPath, item.activeMetadata);
  for (const difficulty of ['easy', 'medium', 'hard']) {
    await writeJson(
      `public/assets/beatmaps/${item.trackId}/${difficulty}.json`,
      item.documents[difficulty],
    );
  }
}
await writeJson('content/music/suno-candidates.json', {
  ...registry,
  tracks: registry.tracks.map((track) => (
    trackIds.includes(track.trackId) ? { ...track, status: 'active' } : track
  )),
});
console.log(`M6: ${trackIds.length} pista(s) promovida(s) a catálogo oficial.`);
console.log('Ejecuta el bloqueo después de la última prueba física aprobada.');

function parseTrackIds(args) {
  const ids = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== '--track') throw new Error(`Opcion desconocida: ${args[index]}`);
    const id = args[++index];
    if (!id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
      throw new Error(`trackId invalido: ${id ?? '(vacio)'}`);
    }
    ids.push(id);
  }
  if (ids.length === 0) {
    throw new Error('Uso: node scripts/approve-music-track.mjs --track <id> [--track <id>]');
  }
  return [...new Set(ids)];
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(relativePath, 'utf8'));
}

async function writeJson(relativePath, value) {
  await mkdir(path.dirname(relativePath), { recursive: true });
  await writeFile(relativePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
