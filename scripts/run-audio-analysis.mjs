import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const projectRoot = process.cwd();
const candidates = [
  process.env.SUPERFLOW_PYTHON,
  path.join(projectRoot, '.python', 'python.exe'),
  path.join(projectRoot, '.venv', 'Scripts', 'python.exe'),
  'python3',
  'python',
].filter(Boolean);

let python = null;
for (const candidate of candidates) {
  if (candidate.includes(path.sep) && !existsSync(candidate)) continue;
  const probe = spawnSync(candidate, ['--version'], { encoding: 'utf8' });
  if (probe.status === 0) {
    python = candidate;
    break;
  }
}
if (!python) {
  console.error(
    'Python no encontrado. Crea .python/.venv o define SUPERFLOW_PYTHON con el ejecutable.',
  );
  process.exit(1);
}

const userArguments = process.argv.slice(2);
const pythonArguments = userArguments[0] === '--test'
  ? ['-m', 'unittest', 'discover', '-s', 'tools/audio-analysis', '-p', 'test_analysis.py', '-v']
  : ['tools/audio-analysis/analyze_song.py', ...userArguments];
const result = spawnSync(python, pythonArguments, {
  cwd: projectRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    MPLCONFIGDIR: path.join(projectRoot, 'tools', 'audio-analysis', '.matplotlib'),
  },
});
process.exit(result.status ?? 1);
