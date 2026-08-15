import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});
try {
  const {
    AdaptiveSpectrumNormalizer,
    averageFrequencyBand,
    createLogFrequencyBands,
    MUSIC_FREQUENCY_BANDS,
    resolveFrequencyBinRange,
  } = await server.ssrLoadModule('/src/audio/MusicSpectrum.ts');
  const { sampleMusicVisualIntensity } = await server.ssrLoadModule(
    '/src/content/MusicVisualProfile.ts',
  );

  const lowRange = resolveFrequencyBinRange(48_000, 512, 256, 45, 250);
  const midRange = resolveFrequencyBinRange(48_000, 512, 256, 250, 2_000);
  const highRange = resolveFrequencyBinRange(48_000, 512, 256, 2_000, 8_000);
  assert.ok(lowRange.end <= midRange.end && midRange.end <= highRange.end);
  assert.deepEqual(MUSIC_FREQUENCY_BANDS.bass, { minimumHz: 45, maximumHz: 250 });
  assert.deepEqual(MUSIC_FREQUENCY_BANDS.mids, { minimumHz: 250, maximumHz: 2_000 });
  assert.deepEqual(MUSIC_FREQUENCY_BANDS.highs, { minimumHz: 2_000, maximumHz: 8_000 });
  const visualBands = createLogFrequencyBands(24);
  assert.equal(visualBands.length, 24);
  assert.equal(Math.round(visualBands[0].minimumHz), 60);
  assert.equal(Math.round(visualBands.at(-1).maximumHz), 10_000);
  assert.ok(visualBands.every((band, index) => index === 0
    || band.minimumHz >= visualBands[index - 1].maximumHz - .001));

  const spectrum = new Uint8Array(256);
  spectrum.fill(255, lowRange.start, lowRange.end);
  assert.equal(averageFrequencyBand(spectrum, 48_000, 512, 45, 250), 1);
  assert.ok(averageFrequencyBand(spectrum, 48_000, 512, 2_000, 8_000) < .01);

  const soft = settleNormalizer(AdaptiveSpectrumNormalizer, .08);
  const loud = settleNormalizer(AdaptiveSpectrumNormalizer, .55);
  assert.ok(Math.abs(soft.volume - loud.volume) < .06, 'normalizacion depende del volumen absoluto');
  const normalizer = new AdaptiveSpectrumNormalizer();
  let steady;
  for (let index = 0; index < 120; index += 1) steady = normalizer.update(frame(.12), 1 / 60);
  const transient = normalizer.update(frame(.5), 1 / 60);
  assert.ok(transient.volume > steady.volume, 'un ataque no eleva la microreaccion');
  normalizer.reset();
  assert.ok(normalizer.update(frame(0), 1 / 60).volume === 0);
  const shapedNormalizer = new AdaptiveSpectrumNormalizer();
  let shaped;
  for (let index = 0; index < 120; index += 1) {
    shaped = shapedNormalizer.update({
      ...frame(.12),
      spectrum: [.02, .08, .16, .04],
    }, 1 / 60);
  }
  assert.ok(shaped.spectrum[2] > shaped.spectrum[1]);
  assert.ok(shaped.spectrum[1] > shaped.spectrum[0]);
  assert.ok(Math.max(...shaped.spectrum) >= .6, 'calibracion alta no alcanza presencia');

  const profile = {
    frameStep: 1,
    frames: [{ time: 0, intensity: .2 }, { time: 1, intensity: .8 }],
  };
  assert.equal(sampleMusicVisualIntensity(profile, .5, 0), .5);
  assert.equal(sampleMusicVisualIntensity(null, 0, 2), .88);
} finally {
  await server.close();
}

const analysisFiles = (await readdir('content/music/analysis')).filter((file) => file.endsWith('.json'));
const visualIndex = JSON.parse(await readFile('public/assets/music-visuals/index.json', 'utf8'));
assert.equal(visualIndex.schemaVersion, 1);
assert.deepEqual(
  [...visualIndex.tracks].sort(),
  analysisFiles.map((file) => file.replace(/\.json$/, '')).sort(),
);
for (const fileName of analysisFiles) {
  const analysisText = await readFile(`content/music/analysis/${fileName}`, 'utf8');
  const analysis = JSON.parse(analysisText);
  const profile = JSON.parse(await readFile(`public/assets/music-visuals/${fileName}`, 'utf8'));
  assert.equal(profile.schemaVersion, 1);
  assert.equal(profile.trackId, analysis.trackId);
  assert.equal(profile.duration, analysis.duration);
  assert.equal(profile.analysisHash, createHash('sha256').update(analysisText, 'utf8').digest('hex'));
  assert.equal(profile.frames.length, Math.ceil(analysis.duration));
  assert.ok(profile.frames.every((frame) => frame.intensity >= 0 && frame.intensity <= 1));
}

const audioManagerSource = await readFile('src/audio/AudioManager.ts', 'utf8');
assert.ok(audioManagerSource.includes('gain.connect(this.analyser!)'));
assert.ok(audioManagerSource.includes('new ReactiveAudioFeedback(this.context, this.masterGain)'));
assert.equal(audioManagerSource.includes('this.analyser.connect(this.masterGain)'), false);
const gameSceneSource = await readFile('src/scenes/GameScene.ts', 'utf8');
const visualMethod = gameSceneSource.slice(
  gameSceneSource.indexOf('private updateMusicVisuals'),
  gameSceneSource.indexOf('resize(width', gameSceneSource.indexOf('private updateMusicVisuals')),
);
for (const forbidden of ['score.register', 'resolveTarget', 'beatmapPlayer.collect', 'flow.register']) {
  assert.equal(visualMethod.includes(forbidden), false, `FFT alcanzo gameplay: ${forbidden}`);
}
const backgroundSource = await readFile('src/game/effects/RhythmBackground.ts', 'utf8');
assert.ok(backgroundSource.includes('createMusicVisualizer'));
for (const implementationDetail of ['spectrumBars', 'spectrumWave', 'roundRect']) {
  assert.equal(
    backgroundSource.includes(implementationDetail),
    false,
    `RhythmBackground conserva detalle del visualizador: ${implementationDetail}`,
  );
}
const visualizerSource = await readFile(
  'src/game/effects/music-visualizers/SpectrumBarsMusicVisualizer.ts',
  'utf8',
);
assert.ok(visualizerSource.includes("this.style === 'spectrum-bars-line'"));
assert.ok(visualizerSource.includes("this.style === 'none'"));

console.log(`M5 music visuals: bandas Hz, normalizacion, macro offline, aislamiento y visualizador modular sobre ${analysisFiles.length} pistas: OK`);

function frame(value) {
  return {
    volume: value,
    bass: value,
    mids: value,
    highs: value,
    spectrum: Array.from({ length: 24 }, () => value),
  };
}

function settleNormalizer(Normalizer, value) {
  const normalizer = new Normalizer();
  let output;
  for (let index = 0; index < 240; index += 1) output = normalizer.update(frame(value), 1 / 60);
  return output;
}
