import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { canOverwriteBeatmap } from './lib/beatmap-generation-policy.mjs';
import { analysisSha256, generateHybridBeatmaps, inferPreviewPhases } from './lib/hybrid-beatmap-generator.mjs';
import { validateAnalysisV1, validateBeatmapV2 } from './lib/music-contract-validation.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const options = parseOptions(process.argv.slice(2));
const metadata = await readJson(`content/music/metadata/${options.trackId}.json`);
const analysisPath = `content/music/analysis/${options.trackId}.json`;
const analysisText = await readFile(path.join(projectRoot, analysisPath), 'utf8');
const analysis = validateAnalysisV1(JSON.parse(analysisText));
const versions = await readJson('src/content/music-contract-versions.json');
if (metadata.trackId !== analysis.trackId || metadata.audioHash !== analysis.audioHash) {
  throw new Error(`${options.trackId}: metadata y Analysis v1 no corresponden.`);
}
if (metadata.audioMode !== 'single') throw new Error(`${options.trackId}: M4 requiere audio single.`);
const hasReviewedStructure = Boolean(metadata.durationSeconds && metadata.suggestedSections.length > 0);
if (options.apply && !hasReviewedStructure) {
  throw new Error(`${options.trackId}: aplicar M4 requiere duracion y secciones revisadas en metadata.`);
}
const duration = metadata.durationSeconds ?? analysis.duration;
const phases = hasReviewedStructure
  ? metadata.suggestedSections
  : inferPreviewPhases(analysis);

const result = generateHybridBeatmaps({
  trackId: options.trackId,
  duration,
  phases,
  analysis,
  analysisHash: analysisSha256(analysisText),
  versions,
});
for (const document of Object.values(result.documents)) validateBeatmapV2(document);

const currentDocuments = {};
for (const difficulty of ['easy', 'medium', 'hard']) {
  currentDocuments[difficulty] = await readOptionalJson(`public/assets/beatmaps/${options.trackId}/${difficulty}.json`);
}
const summary = {
  trackId: options.trackId,
  generatorVersion: result.documents.easy.generatorVersion,
  analysisPath,
  analysisHash: result.documents.easy.analysisHash,
  mode: options.apply ? 'apply' : 'preview',
  phaseSource: hasReviewedStructure ? 'metadata-reviewed' : 'analysis-derived-preview',
  currentGeneratorVersion: currentDocuments.easy?.generatorVersion ?? null,
  counts: Object.fromEntries(['easy', 'medium', 'hard'].map((difficulty) => [difficulty, {
    current: currentDocuments[difficulty]?.events.length ?? null,
    candidate: result.documents[difficulty].events.length,
    difference: currentDocuments[difficulty]
      ? result.documents[difficulty].events.length - currentDocuments[difficulty].events.length
      : null,
    drags: result.documents[difficulty].events.filter((event) => event.kind === 'drag').length,
  }])),
  fusedCandidates: result.diagnostics.fusedCandidates,
  musicalGrammar: result.diagnostics.musicalGrammar,
  musicalCoverage: result.diagnostics.coverage,
  segmentThresholds: result.diagnostics.thresholds,
  segments: result.diagnostics.segments,
  projections: await createProjectionSummary(result.documents),
};

const outputDirectory = options.apply
  ? path.join(projectRoot, 'public', 'assets', 'beatmaps', options.trackId)
  : path.join(projectRoot, 'public', 'assets', 'beatmap-previews', 'm4', options.trackId);
if (options.apply) {
  for (const difficulty of ['easy', 'medium', 'hard']) {
    if (!currentDocuments[difficulty]) {
      throw new Error(`${options.trackId}/${difficulty}: no existe mapa oficial que reemplazar.`);
    }
    if (!canOverwriteBeatmap(currentDocuments[difficulty], options.force)) {
      throw new Error(`${options.trackId}/${difficulty}: usa --force y verifica locked=false.`);
    }
  }
}
await writeDocuments(outputDirectory, result.documents);
if (!options.apply) await updatePreviewCatalog(metadata, analysis);
await writeFile(
  path.join(outputDirectory, options.apply ? 'm4-generation-summary.json' : 'summary.json'),
  `${JSON.stringify(summary, null, 2)}\n`,
);

console.log(`M4 ${options.apply ? 'APPLY' : 'PREVIEW'}: ${options.trackId}`);
for (const [difficulty, counts] of Object.entries(summary.counts)) {
  console.log(`- ${difficulty}: ${counts.current} -> ${counts.candidate} (${counts.drags} drags)`);
}
console.log(`- candidatos fusionados: ${summary.fusedCandidates}; segmentos: ${summary.segments.length}`);
console.log(`- metrica inferida: ${summary.musicalGrammar.meter}; confianza: ${summary.musicalGrammar.confidence}`);
for (const [difficulty, coverage] of Object.entries(summary.musicalCoverage)) {
  console.log(`- ${difficulty}: ${(coverage.beatOrStrongOnsetRatio * 100).toFixed(1)}% beat/onset fuerte; ${coverage.phraseBoundariesCaptured} inicios de frase`);
}
if (!options.apply) console.log('- probar con ?beatmapPreview=m4 (solo desarrollo)');

function parseOptions(args) {
  let trackId = null;
  let apply = false;
  let force = false;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--track') trackId = args[++index] ?? null;
    else if (args[index] === '--apply') apply = true;
    else if (args[index] === '--force') force = true;
    else if (!args[index].startsWith('-') && !trackId) trackId = args[index];
    else throw new Error(`Opcion desconocida: ${args[index]}`);
  }
  if (!trackId) throw new Error('Falta --track <trackId>.');
  if (force && !apply) throw new Error('--force solo se acepta junto con --apply.');
  return { trackId, apply, force };
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(projectRoot, relativePath), 'utf8'));
}

async function readOptionalJson(relativePath) {
  try {
    return await readJson(relativePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function updatePreviewCatalog(trackMetadata, trackAnalysis) {
  const catalogPath = path.join(projectRoot, 'public', 'assets', 'beatmap-previews', 'm4', 'catalog.json');
  let catalog = [];
  try {
    catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const audioPath = trackMetadata.webAudioPath;
  const previewRoot = `./assets/beatmap-previews/m4/${trackMetadata.trackId}`;
  const entry = {
    id: trackMetadata.trackId,
    title: `${trackMetadata.title} [M4]`,
    audioPath,
    priceTier: 'free',
    price: 0,
    bpm: trackAnalysis.bpm,
    beatmapPaths: Object.fromEntries(
      ['easy', 'medium', 'hard'].map((difficulty) => [difficulty, `${previewRoot}/${difficulty}.json`]),
    ),
  };
  catalog = [...catalog.filter((item) => item.id !== entry.id), entry]
    .sort((left, right) => left.id.localeCompare(right.id));
  await mkdir(path.dirname(catalogPath), { recursive: true });
  await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
}

async function writeDocuments(directory, documents) {
  await mkdir(directory, { recursive: true });
  for (const difficulty of ['easy', 'medium', 'hard']) {
    await writeFile(path.join(directory, `${difficulty}.json`), `${JSON.stringify(documents[difficulty], null, 2)}\n`, 'utf8');
  }
}

async function createProjectionSummary(documents) {
  const server = await createServer({ configFile: false, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } });
  try {
    const { TravelBudget } = await server.ssrLoadModule('/src/input/TravelBudget.ts');
    const { calculateTargetPlayfield, pointInTargetPlayfield } = await server.ssrLoadModule('/src/input/PlayfieldLayout.ts');
    const environments = [
      { id: 'mouse-balanced', mode: 'mouse', width: 1335, height: 1032 },
      { id: 'touch-portrait', mode: 'touch', width: 390, height: 844 },
    ];
    return Object.fromEntries(environments.map((environment) => [environment.id,
      Object.fromEntries(Object.entries(documents).map(([difficulty, document]) => {
        const bounds = calculateTargetPlayfield(environment.width, environment.height, environment.mode);
        const budget = new TravelBudget(difficulty);
        let previous = null;
        let total = 0;
        let maximum = 0;
        for (const event of document.events) {
          const desired = pointInTargetPlayfield(event.start, bounds);
          const start = budget.projectHead(desired, event.time, bounds, environment.mode);
          if (previous) {
            const distance = Math.hypot(start.x - previous.x, start.y - previous.y);
            total += distance;
            maximum = Math.max(maximum, distance);
          }
          let drag;
          if (event.kind === 'drag') {
            const end = budget.projectDragEnd(start, pointInTargetPlayfield(event.end, bounds), bounds, environment.mode);
            drag = { end, length: Math.hypot(end.x - start.x, end.y - start.y), completionTimeSeconds: { easy: 1, medium: .76, hard: .62 }[difficulty] };
          }
          budget.commit(event.time, start, environment.mode, drag);
          previous = drag?.end ?? start;
        }
        return [difficulty, {
          playfield: { width: bounds.width, height: bounds.height },
          averageTravel: document.events.length > 1 ? Number((total / (document.events.length - 1)).toFixed(1)) : 0,
          maximumTravel: Number(maximum.toFixed(1)),
        }];
      }))
    ]));
  } finally {
    await server.close();
  }
}
