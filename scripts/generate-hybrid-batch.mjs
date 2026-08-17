import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const argumentsList = process.argv.slice(2);
const tracks = await parseTracks(argumentsList);
const interpretationV2 = argumentsList.includes('--interpretation-v2');
for (const trackId of tracks) {
  const result = spawnSync(
    process.execPath,
    [
      'scripts/generate-hybrid-beatmaps.mjs',
      '--track',
      trackId,
      ...(interpretationV2 ? ['--interpretation-v2'] : []),
    ],
    { cwd: process.cwd(), stdio: 'inherit' },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`M4 batch: ${tracks.length} preview(s) generado(s).`);

async function parseTracks(args) {
  if (args.includes('--all-analyzed')) return discoverAnalyzedTracks();
  const valueIndex = args.indexOf('--tracks');
  const value = (valueIndex >= 0 ? args.slice(valueIndex + 1) : args)
    .filter((argument) => !argument.startsWith('-'))
    .join(',');
  if (!value || value.startsWith('-')) {
    throw new Error('Usa --tracks id-uno,id-dos o --all-analyzed.');
  }
  return [...new Set(value.split(/[\s,]+/).map((track) => track.trim()).filter(Boolean))];
}

async function discoverAnalyzedTracks() {
  const files = await readdir(path.join('content', 'music', 'analysis'));
  return files.filter((file) => file.endsWith('.json')).map((file) => path.basename(file, '.json')).sort();
}
