import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canOverwriteBeatmap } from './lib/beatmap-generation-policy.mjs';
import { generateBpmBeatmap } from './lib/bpm-beatmap-generator.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const metadataRoot = path.join(projectRoot, 'content', 'music', 'metadata');
const beatmapsRoot = path.join(projectRoot, 'public', 'assets', 'beatmaps');
const versions = JSON.parse(await readFile(
  path.join(projectRoot, 'src', 'content', 'music-contract-versions.json'),
  'utf8',
));

function parseOptions(args) {
  let trackId = null;
  let difficulty = null;
  let force = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--force') force = true;
    else if (argument === '--track') {
      trackId = args[++index] ?? null;
    } else if (argument === '--difficulty') {
      difficulty = args[++index] ?? null;
    } else throw new Error(`Opcion desconocida: ${argument}`);
  }
  if (!trackId) throw new Error('Falta --track <trackId>.');
  if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) {
    throw new Error(`Dificultad invalida: ${difficulty}`);
  }
  return { trackId, difficulty, force };
}

const options = parseOptions(process.argv.slice(2));
const metadata = JSON.parse(await readFile(
  path.join(metadataRoot, `${options.trackId}.json`),
  'utf8',
));
if (metadata.audioMode !== 'single' || !(metadata.durationSeconds > 0)) {
  throw new Error(`${options.trackId} no tiene audio single/durationSeconds.`);
}
const bpm = metadata.rhythm.bpmOverride ?? metadata.rhythm.tempoHint;
const beatOffset = metadata.rhythm.beatOffsetOverride;
if (!(bpm > 0) || !(beatOffset >= 0) || metadata.suggestedSections.length === 0) {
  throw new Error(`${options.trackId} necesita BPM, beatOffset y secciones.`);
}

const difficulties = options.difficulty
  ? [options.difficulty]
  : ['easy', 'medium', 'hard'];
const outputDirectory = path.join(beatmapsRoot, options.trackId);
await mkdir(outputDirectory, { recursive: true });
for (const difficulty of difficulties) {
  const outputPath = path.join(outputDirectory, `${difficulty}.json`);
  let existing = null;
  try {
    existing = JSON.parse(await readFile(outputPath, 'utf8'));
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  if (!canOverwriteBeatmap(existing, options.force)) {
    console.log(`- preservado/bloqueado: ${options.trackId}/${difficulty}.json`);
    continue;
  }
  const document = generateBpmBeatmap({
    trackId: options.trackId,
    difficulty,
    duration: metadata.durationSeconds,
    bpm,
    beatOffset,
    phases: metadata.suggestedSections,
    versions,
  });
  await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
  console.log(`- BPM ${bpm}: ${options.trackId}/${difficulty}.json (${document.events.length} notas)`);
}
