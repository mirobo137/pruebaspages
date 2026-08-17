import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ingestSunoTracks } from './lib/suno-ingestion.mjs';
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

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const audioDirectory = path.join(projectRoot, 'public', 'assets', 'audio');
const sourceDirectory = path.join(audioDirectory, 'agregadas suno');
const registryPath = path.join(projectRoot, 'content', 'music', 'suno-candidates.json');
const categories = await readJson('src/content/song-categories.json');

const imported = await ingestSunoTracks({
  audioDirectory,
  sourceDirectory,
  categories,
  registryPath,
});
if (imported.length > 0) {
  console.log(`Pipeline musical: ${imported.length} audio(s) nuevo(s) recibido(s).`);
  for (const track of imported) console.log(`- ${track.originalFileName} -> ${track.relativeAudioPath}`);
}

// Metadata necesita el manifest legado como fuente, aunque las nuevas candidatas
// todavía se excluyen de ese primer catálogo.
runNode('scripts/generate-music-manifest.mjs');
runNode('scripts/sync-track-metadata.mjs');

let registry = await readJson('content/music/suno-candidates.json');
const pending = registry.tracks.filter((track) => (
  track.pipeline === 'automatic' && track.status === 'candidate'
));
if (pending.length > 0) {
  console.log(`Pipeline musical: analizando ${pending.length} pista(s) automatica(s).`);
  runNode('scripts/run-audio-analysis.mjs', pending.flatMap((track) => ['--track', track.trackId]));
  await activateAutomaticTracks(pending);
  registry = {
    ...registry,
    tracks: registry.tracks.map((track) => (
      pending.some((candidate) => candidate.trackId === track.trackId)
        ? { ...track, status: 'active' }
        : track
    )),
  };
  await writeJson('content/music/suno-candidates.json', registry);
  console.log(`Pipeline musical: ${pending.length} pista(s) activada(s) con Beatmap v2.`);
} else {
  console.log('Pipeline musical: bandeja vacia y ninguna importacion automatica pendiente.');
}

// La segunda pasada incorpora las pistas recién activadas. Los generadores son
// idempotentes y nunca sobrescriben mapas bloqueados.
runNode('scripts/generate-music-manifest.mjs');
runNode('scripts/sync-track-metadata.mjs');
runNode('scripts/generate-music-visual-profiles.mjs');
runNode('scripts/generate-default-beatmaps.mjs');

async function activateAutomaticTracks(tracks) {
  const versions = await readJson('src/content/music-contract-versions.json');
  const prepared = [];
  for (const track of tracks) {
    const metadataPath = `content/music/metadata/${track.trackId}.json`;
    const analysisPath = `content/music/analysis/${track.trackId}.json`;
    for (const difficulty of ['easy', 'medium', 'hard']) {
      const existingPath = path.join(
        projectRoot,
        'public',
        'assets',
        'beatmaps',
        track.trackId,
        `${difficulty}.json`,
      );
      try {
        const existing = await readJsonAbsolute(existingPath);
        if (existing.locked === true) {
          throw new Error(
            `${track.trackId}/${difficulty}: el pipeline automatico no puede sobrescribir un mapa bloqueado.`,
          );
        }
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
    }
    const metadata = validateTrackMetadataV1(await readJson(metadataPath));
    const analysisText = await readFile(path.join(projectRoot, analysisPath), 'utf8');
    const analysis = validateAnalysisV1(JSON.parse(analysisText));
    if (metadata.audioHash !== analysis.audioHash) {
      throw new Error(`${track.trackId}: Analysis v1 no corresponde al audio importado.`);
    }
    const phases = inferPreviewPhases(analysis);
    const activeMetadata = validateTrackMetadataV1({
      ...metadata,
      status: 'active',
      durationSeconds: analysis.duration,
      rhythm: {
        ...metadata.rhythm,
        tempoHint: metadata.rhythm.tempoHint ?? analysis.bpm,
      },
      suggestedSections: phases,
    });
    const result = generateHybridBeatmaps({
      trackId: track.trackId,
      duration: analysis.duration,
      phases,
      analysis,
      analysisHash: analysisSha256(analysisText),
      versions,
      interpretationProfile: 'musical-v2',
    });
    for (const document of Object.values(result.documents)) validateBeatmapV2(document);
    prepared.push({ track, metadataPath, activeMetadata, documents: result.documents });
  }

  for (const item of prepared) {
    await writeJson(item.metadataPath, item.activeMetadata);
    for (const difficulty of ['easy', 'medium', 'hard']) {
      await writeJson(
        `public/assets/beatmaps/${item.track.trackId}/${difficulty}.json`,
        item.documents[difficulty],
      );
    }
  }
}

function runNode(script, args = []) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: projectRoot,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(`${script} termino con codigo ${result.status ?? 'desconocido'}.`);
  }
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(projectRoot, relativePath), 'utf8'));
}

async function readJsonAbsolute(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function writeJson(relativePath, value) {
  const destination = path.join(projectRoot, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
