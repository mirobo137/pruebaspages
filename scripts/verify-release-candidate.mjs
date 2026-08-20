import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const distDirectory = path.resolve(projectRoot, 'dist');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function runStep(label, command, args) {
  console.log(`\n[release] ${label}`);
  const isWindows = process.platform === 'win32';
  const executable = isWindows ? (process.env.ComSpec || 'cmd.exe') : command;
  const commandArgs = isWindows
    ? ['/d', '/s', '/c', [command, ...args].join(' ')]
    : args;
  const result = spawnSync(executable, commandArgs, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${label} termino con codigo ${result.status ?? 'desconocido'}.`);
  }
}

function requireFile(relativePath) {
  const absolutePath = path.resolve(distDirectory, relativePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Falta en dist: ${relativePath}`);
  }
  return absolutePath;
}

function resolvePublishedPath(relativePath) {
  if (typeof relativePath !== 'string' || relativePath.length === 0) return null;
  const normalized = relativePath.replace(/^\.\//, '');
  const absolutePath = path.resolve(distDirectory, normalized);
  const relativeToDist = path.relative(distDirectory, absolutePath);
  if (relativeToDist.startsWith('..') || path.isAbsolute(relativeToDist)) return null;
  return absolutePath;
}

function readJson(relativePath) {
  const absolutePath = requireFile(relativePath);
  try {
    return JSON.parse(readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    throw new Error(`JSON invalido en ${relativePath}: ${error.message}`);
  }
}

function verifyPublishedAssets() {
  requireFile('index.html');
  const indexHtml = readFileSync(path.resolve(distDirectory, 'index.html'), 'utf8');
  if (!indexHtml.includes('/assets/') && !indexHtml.includes('./assets/')) {
    throw new Error('index.html no contiene una referencia al bundle de assets.');
  }

  const manifest = readJson('assets/music-manifest.json');
  if (!Array.isArray(manifest) || manifest.length === 0) {
    throw new Error('El manifest musical esta vacio o no es un array.');
  }

  const missingPaths = [];
  for (const track of manifest) {
    const candidates = [track.audioPath, ...Object.values(track.beatmapPaths ?? {})];
    for (const publishedPath of candidates) {
      const absolutePath = resolvePublishedPath(publishedPath);
      if (!absolutePath || !existsSync(absolutePath)) {
        missingPaths.push(`${track.id ?? 'track'} -> ${publishedPath ?? 'ruta invalida'}`);
      }
    }
  }
  if (missingPaths.length > 0) {
    throw new Error(`Assets musicales ausentes (${missingPaths.length}):\n${missingPaths.join('\n')}`);
  }

  const visualIndex = readJson('assets/music-visuals/index.json');
  if (visualIndex.schemaVersion !== 1 || !Array.isArray(visualIndex.tracks)) {
    throw new Error('El indice de perfiles visuales no tiene el contrato esperado.');
  }
  const missingVisualProfiles = visualIndex.tracks.filter((trackId) => (
    typeof trackId !== 'string'
    || !existsSync(path.resolve(distDirectory, 'assets/music-visuals', `${trackId}.json`))
  ));
  if (missingVisualProfiles.length > 0) {
    throw new Error(`Perfiles visuales ausentes: ${missingVisualProfiles.join(', ')}`);
  }

  requireFile('assets/events/weekly-events.json');
  requireFile('assets/audio/sfx/miss.wav');
  console.log(`Assets publicados: OK (${manifest.length} canciones, ${visualIndex.tracks.length} perfiles visuales).`);
}

try {
  runStep('Suite de contratos y regresion', npmCommand, ['test']);
  runStep('Build de produccion y limite del bundle', npmCommand, ['run', 'build']);
  runStep('Revision de espacios en blanco de Git', 'git', ['diff', '--check']);
  verifyPublishedAssets();
  console.log('\nRelease candidate: OK');
} catch (error) {
  console.error(`\nRelease candidate: FALLA\n${error.message}`);
  process.exitCode = 1;
}
