import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile('scripts/sync-music-content.mjs', 'utf8');
for (const required of [
  'ingestSunoTracks',
  'run-audio-analysis.mjs',
  'inferPreviewPhases',
  'generateHybridBeatmaps',
  "status: 'active'",
  'generate-music-manifest.mjs',
  'generate-music-visual-profiles.mjs',
  'generate-default-beatmaps.mjs',
]) assert.ok(source.includes(required), `falta etapa automatica: ${required}`);
assert.ok(source.includes("track.pipeline === 'automatic'"));
assert.ok(source.includes("track.status === 'candidate'"));
assert.equal(source.includes("pipeline !== 'automatic'"), false);

const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
assert.equal(packageJson.scripts['content:sync'], 'node scripts/sync-music-content.mjs');
assert.ok(packageJson.scripts.build.startsWith('npm run content:sync'));
const analysisRunner = await readFile('scripts/run-audio-analysis.mjs', 'utf8');
assert.ok(analysisRunner.includes("['-m', 'venv', virtualEnvironmentRoot]"));
assert.ok(analysisRunner.includes("'tools/audio-analysis/requirements.txt'"));
console.log('Pipeline automatico: inbox -> hash/categoria -> Analysis v1 -> Beatmap v2 -> visuales -> catalogo: OK');
