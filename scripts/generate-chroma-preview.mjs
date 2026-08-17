import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const trackIds = (await readdir('content/music/metadata'))
  .filter((fileName) => fileName.endsWith('.json'))
  .map((fileName) => fileName.replace(/\.json$/u, ''))
  .sort();

const result = spawnSync(
  process.execPath,
  [
    'scripts/run-audio-analysis.mjs',
    '--chroma-output',
    ...trackIds.flatMap((trackId) => ['--track', trackId]),
  ],
  { cwd: process.cwd(), stdio: 'inherit' },
);

if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`Chroma preview: ${trackIds.length} pista(s) generada(s).`);
