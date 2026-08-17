import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateBeatmapV2 } from './lib/music-contract-validation.mjs';
import { analysisSha256, HYBRID_GENERATOR_NEXT_VERSION } from './lib/hybrid-beatmap-generator.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const approvalDate = new Date().toISOString().slice(0, 10);
const trackIds = await parseTrackIds(process.argv.slice(2));
const prepared = [];

for (const trackId of trackIds) {
  const metadata = await readJson(`content/music/metadata/${trackId}.json`);
  const analysisPath = `content/music/analysis/${trackId}.json`;
  const analysisText = await readFile(path.join(projectRoot, analysisPath), 'utf8');
  const analysis = JSON.parse(analysisText);
  if (metadata.status !== 'active') throw new Error(`${trackId}: la metadata no esta activa.`);
  if (metadata.audioHash !== analysis.audioHash) {
    throw new Error(`${trackId}: metadata y Analysis v1 no corresponden al mismo audio.`);
  }

  const documents = {};
  for (const difficulty of ['easy', 'medium', 'hard']) {
    const previewPath = `public/assets/beatmap-previews/m4-v2/${trackId}/${difficulty}.json`;
    const preview = await readJson(previewPath);
    validateBeatmapV2(preview);
    if (preview.trackId !== trackId || preview.difficulty !== difficulty) {
      throw new Error(`${previewPath}: identidad incoherente.`);
    }
    if (preview.generatorVersion !== HYBRID_GENERATOR_NEXT_VERSION) {
      throw new Error(`${previewPath}: no es un mapa Musical v2.`);
    }
    if (preview.analysisHash !== analysisSha256(analysisText)) {
      throw new Error(`${previewPath}: hash de analisis desactualizado.`);
    }
    documents[difficulty] = { ...preview, locked: true };
  }
  prepared.push({ trackId, documents });
}

const currentManifest = await readJson('content/music/approved-beatmaps.json');
const previousByTrack = new Map(currentManifest.tracks.map((track) => [track.trackId, track]));

for (const item of prepared) {
  for (const difficulty of ['easy', 'medium', 'hard']) {
    await writeJson(
      `public/assets/beatmaps/${item.trackId}/${difficulty}.json`,
      item.documents[difficulty],
    );
  }
}

const manifest = {
  schemaVersion: 1,
  tracks: prepared.map(({ trackId, documents }) => ({
    trackId,
    approvedAt: approvalDate,
    generatorVersion: HYBRID_GENERATOR_NEXT_VERSION,
    analysisHash: documents.easy.analysisHash,
    difficulties: Object.fromEntries(Object.entries(documents).map(([difficulty, document]) => [
      difficulty,
      {
        eventCount: document.events.length,
        sha256: sha256(`${JSON.stringify(document, null, 2)}\n`),
      },
    ])),
  })).sort((left, right) => left.trackId.localeCompare(right.trackId)),
};

await writeJson('content/music/approved-beatmaps.json', manifest);
console.log(`Musical v2: ${prepared.length} pista(s) promovida(s), ${prepared.length * 3} mapas bloqueados.`);
console.log(`- Version oficial: ${HYBRID_GENERATOR_NEXT_VERSION}`);
console.log(`- Fecha de aprobacion: ${approvalDate}`);
console.log(`- Registros previos reemplazados: ${previousByTrack.size}`);

async function parseTrackIds(args) {
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
    const metadataFiles = (await readdir(path.join(projectRoot, 'content/music/metadata')))
      .filter((fileName) => fileName.endsWith('.json'));
    return metadataFiles.map((fileName) => fileName.replace(/\.json$/, '')).sort();
  }
  return [...new Set(ids)].sort();
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(projectRoot, relativePath), 'utf8'));
}

async function writeJson(relativePath, value) {
  const destination = path.join(projectRoot, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}
