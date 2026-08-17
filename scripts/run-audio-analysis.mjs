import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const projectRoot = process.cwd();
const virtualEnvironmentRoot = path.join(projectRoot, '.venv');
const virtualEnvironmentPython = path.join(
  virtualEnvironmentRoot,
  process.platform === 'win32' ? 'Scripts' : 'bin',
  process.platform === 'win32' ? 'python.exe' : 'python',
);
const candidates = [
  process.env.SUPERFLOW_PYTHON,
  path.join(projectRoot, '.python', 'python.exe'),
  virtualEnvironmentPython,
  'python3',
  'python',
].filter(Boolean);

let python = null;
let bootstrapPython = null;
for (const candidate of candidates) {
  if (candidate.includes(path.sep) && !existsSync(candidate)) continue;
  const probe = spawnSync(candidate, ['--version'], { encoding: 'utf8' });
  if (probe.status === 0) {
    bootstrapPython ??= candidate;
    const dependencies = spawnSync(
      candidate,
      ['-c', 'import librosa, matplotlib, numpy'],
      { encoding: 'utf8' },
    );
    if (dependencies.status === 0) {
      python = candidate;
      break;
    }
  }
}
if (!python) {
  if (!bootstrapPython) {
    console.error(
      'Python no encontrado. Instala Python 3 o define SUPERFLOW_PYTHON con el ejecutable.',
    );
    process.exit(1);
  }
  if (process.env.SUPERFLOW_AUTO_INSTALL_AUDIO === '0') {
    console.error('Faltan dependencias de audio y SUPERFLOW_AUTO_INSTALL_AUDIO=0 impide instalarlas.');
    process.exit(1);
  }
  console.log('Preparando .venv para Music Intelligence (solo la primera vez)...');
  if (!existsSync(virtualEnvironmentPython)) {
    const createEnvironment = spawnSync(
      bootstrapPython,
      ['-m', 'venv', virtualEnvironmentRoot],
      { cwd: projectRoot, stdio: 'inherit' },
    );
    if (createEnvironment.status !== 0) process.exit(createEnvironment.status ?? 1);
  }
  const installDependencies = spawnSync(
    virtualEnvironmentPython,
    [
      '-m',
      'pip',
      'install',
      '--disable-pip-version-check',
      '--timeout',
      '120',
      '--retries',
      '10',
      '-r',
      'tools/audio-analysis/requirements.txt',
    ],
    { cwd: projectRoot, stdio: 'inherit' },
  );
  if (installDependencies.status !== 0) process.exit(installDependencies.status ?? 1);
  python = virtualEnvironmentPython;
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
