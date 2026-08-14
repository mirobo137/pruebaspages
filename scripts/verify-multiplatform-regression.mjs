import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';

const server = await createServer({
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});

try {
  const { DIFFICULTIES, DIFFICULTY_PROFILES } = await server.ssrLoadModule(
    '/src/game/difficulty/Difficulty.ts',
  );
  const { calculateTargetPlayfield } = await server.ssrLoadModule(
    '/src/input/InputGameplayProfile.ts',
  );
  const { TouchTuning } = await server.ssrLoadModule('/src/input/TouchTuning.ts');
  const { ScoreModel } = await server.ssrLoadModule('/src/game/score/ScoreModel.ts');
  const { FlowModel } = await server.ssrLoadModule('/src/game/flow/FlowModel.ts');
  const { calculateDefeatLayout } = await server.ssrLoadModule('/src/ui/DefeatOverlay.ts');
  const { isDangerState } = await server.ssrLoadModule('/src/ui/DangerIndicator.ts');

  const viewports = [
    { width: 320, height: 568, input: 'touch' },
    { width: 390, height: 844, input: 'touch' },
    { width: 430, height: 932, input: 'pen' },
    { width: 650, height: 360, input: 'touch' },
    { width: 915, height: 412, input: 'touch' },
    { width: 1280, height: 720, input: 'mouse' },
    { width: 1920, height: 1080, input: 'mouse' },
    { width: 2560, height: 1080, input: 'mouse' },
  ];
  const tuning = new TouchTuning();
  for (const viewport of viewports) {
    tuning.resize(viewport.width, viewport.height);
    const pointerTuning = tuning.forPointer(viewport.input);
    const bounds = calculateTargetPlayfield(
      viewport.width,
      viewport.height,
      viewport.input,
    );
    assert.ok(bounds.left >= 0 && bounds.right <= viewport.width);
    assert.ok(bounds.top >= 0 && bounds.bottom <= viewport.height);
    assert.ok(bounds.width > 0 && bounds.height > 0);
    if (viewport.input === 'mouse') {
      assert.equal(pointerTuning.hitRadiusBonus, 0);
      assert.ok(bounds.width <= 1040);
    } else {
      assert.ok(pointerTuning.hitRadiusBonus > 0);
      assert.equal(bounds.width, Math.max(0, viewport.width - 124));
    }
    for (const reviveAvailable of [false, true]) {
      const defeat = calculateDefeatLayout(
        viewport.width,
        viewport.height,
        reviveAvailable,
      );
      assert.ok(defeat.panelX >= 0 && defeat.panelY >= 0);
      assert.ok(defeat.panelX + defeat.panelWidth <= viewport.width);
      assert.ok(defeat.panelY + defeat.panelHeight <= viewport.height);
    }
  }

  for (const difficulty of DIFFICULTIES) {
    const profile = DIFFICULTY_PROFILES[difficulty];
    const score = new ScoreModel(profile.maxLives);
    assert.equal(isDangerState(score.snapshot()), profile.maxLives === 1);
    for (let miss = 0; miss < profile.maxLives - 1; miss += 1) score.register('miss');
    assert.equal(score.snapshot().lives, 1);
    assert.equal(isDangerState(score.snapshot()), true);
    score.register('perfect');
    assert.equal(score.snapshot().lives, 2);
    assert.equal(isDangerState(score.snapshot()), false);
    score.register('miss');
    score.register('miss');
    assert.equal(score.isGameOver(), true);
    assert.equal(isDangerState(score.snapshot()), false);

    const flow = new FlowModel();
    for (let perfect = 0; perfect < 4; perfect += 1) flow.register('perfect');
    assert.equal(flow.snapshot().mode, 'flow');
    flow.update(86_400);
    assert.equal(flow.snapshot().mode, 'flow');
    for (let perfect = 0; perfect < 4; perfect += 1) flow.register('perfect');
    assert.equal(flow.snapshot().mode, 'super');
    flow.update(86_400);
    assert.equal(flow.snapshot().mode, 'super');
    flow.register('good');
    assert.equal(flow.snapshot().mode, 'flow');
    flow.register('miss');
    assert.equal(flow.snapshot().mode, 'charging');
  }

  const manifest = JSON.parse(await readFile('public/assets/music-manifest.json', 'utf8'));
  assert.ok(manifest.length > 0);
  let beatmapCount = 0;
  for (const track of manifest) {
    for (const difficulty of DIFFICULTIES) {
      const beatmapPath = path.join(
        'public', 'assets', 'beatmaps', track.id, `${difficulty}.json`,
      );
      const document = JSON.parse(await readFile(beatmapPath, 'utf8'));
      assert.equal(document.trackId, track.id);
      assert.equal(document.difficulty, difficulty);
      assert.equal(document.phases.length, 3);
      if (document.schemaVersion === 2) {
        assert.equal(document.audioMode, 'single');
        assert.ok(document.duration > 0);
        assert.ok(document.events.length > 0);
        for (const event of document.events) {
          assert.ok(event.kind === 'tap' || event.kind === 'drag');
          assert.ok(event.start.x >= 0 && event.start.x <= 1);
          assert.ok(event.start.y >= 0 && event.start.y <= 1);
        }
      } else {
        assert.ok(document.grid >= 0.05);
        for (const phase of document.phases) {
          assert.ok(phase.pattern.length > 0);
          for (const event of phase.pattern) {
            assert.ok(event.kind === 'tap' || event.kind === 'drag');
            assert.ok(event.start.x >= 0 && event.start.x <= 1);
            assert.ok(event.start.y >= 0 && event.start.y <= 1);
          }
        }
      }
      beatmapCount += 1;
    }
  }

  const wavPath = 'public/assets/audio/sfx/miss.wav';
  const wav = await readFile(wavPath);
  assert.equal(wav.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(wav.subarray(8, 12).toString('ascii'), 'WAVE');
  assert.ok((await stat(wavPath)).size > 44);
  const sfxFiles = await readdir('public/assets/audio/sfx');
  assert.ok(sfxFiles.includes('miss.wav'));

  console.log(
    `Regression matrix: ${viewports.length} viewports, ${DIFFICULTIES.length} difficulties, `
      + `${manifest.length} tracks, ${beatmapCount} beatmaps and miss.wav: OK`,
  );
} finally {
  await server.close();
}
