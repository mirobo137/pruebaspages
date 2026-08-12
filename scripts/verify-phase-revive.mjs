import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});

try {
  const { ScoreModel } = await server.ssrLoadModule('/src/game/score/ScoreModel.ts');
  const { FlowModel } = await server.ssrLoadModule('/src/game/flow/FlowModel.ts');
  const { BeatmapPlayer } = await server.ssrLoadModule('/src/game/beatmap/BeatmapPlayer.ts');
  const { PhaseTransitionGuard } = await server.ssrLoadModule(
    '/src/game/beatmap/PhaseTransitionGuard.ts',
  );
  const { calculateAudioTimelineTime } = await server.ssrLoadModule(
    '/src/audio/AudioManager.ts',
  );
  const { RewardedGameplayPolicy } = await server.ssrLoadModule(
    '/src/game/checkpoint/RewardedGameplayPolicy.ts',
  );

  const score = new ScoreModel(4);
  score.register('perfect');
  score.register('good');
  const scoreCheckpoint = score.snapshot();
  score.register('perfect', 4);
  for (let miss = 0; miss < 5; miss += 1) score.register('miss');
  assert.equal(score.isGameOver(), true);
  score.restoreAfterRevive(scoreCheckpoint, 2);
  const restoredScore = score.snapshot();
  assert.equal(restoredScore.score, scoreCheckpoint.score);
  assert.equal(restoredScore.perfects, scoreCheckpoint.perfects);
  assert.equal(restoredScore.goods, scoreCheckpoint.goods);
  assert.equal(restoredScore.misses, scoreCheckpoint.misses);
  assert.equal(restoredScore.bestCombo, scoreCheckpoint.bestCombo);
  assert.equal(restoredScore.combo, 0);
  assert.equal(restoredScore.lives, 2);

  const flow = new FlowModel();
  for (let index = 0; index < 4; index += 1) flow.register('perfect');
  const flowCheckpoint = flow.snapshot();
  assert.equal(flowCheckpoint.activations, 1);
  for (let index = 0; index < 4; index += 1) flow.register('perfect');
  assert.equal(flow.snapshot().superActivations, 1);
  flow.restoreAfterRevive(flowCheckpoint);
  const restoredFlow = flow.snapshot();
  assert.equal(restoredFlow.mode, 'charging');
  assert.equal(restoredFlow.charge, 0);
  assert.equal(restoredFlow.activations, flowCheckpoint.activations);
  assert.equal(restoredFlow.superActivations, flowCheckpoint.superActivations);
  assert.equal(restoredFlow.multiplier, 1);

  const beatmap = {
    trackId: 'test', difficulty: 'medium', loopDuration: 30, duration: 90,
    phases: [
      { name: 'Lectura', startTime: 0, endTime: 30 },
      { name: 'Impulso', startTime: 30, endTime: 60 },
      { name: 'Climax', startTime: 60, endTime: 90 },
    ],
    events: [
      { time: 0.5, kind: 'tap', phaseIndex: 0 },
      { time: 29.5, kind: 'tap', phaseIndex: 0 },
      { time: 31.5, kind: 'tap', phaseIndex: 1 },
      { time: 32, kind: 'drag', phaseIndex: 1 },
      { time: 61.5, kind: 'tap', phaseIndex: 2 },
    ],
  };
  const player = new BeatmapPlayer(beatmap);
  player.collectUpcomingEvents(29, 1);
  player.seek(30);
  const replayedPhase = player.collectUpcomingEvents(30, 2.1);
  assert.deepEqual(replayedPhase.map((event) => event.time), [31.5, 32]);
  assert.equal(replayedPhase.every((event) => event.phaseIndex === 1), true);

  const guard = new PhaseTransitionGuard();
  guard.begin(30, 30, 0.55);
  assert.equal(guard.isActive(30.2), true);
  guard.reset();
  assert.equal(guard.isActive(30.2), false);
  assert.equal(guard.accepts(beatmap.events[2], 1), true);

  assert.equal(calculateAudioTimelineTime(12.5, 10, 30), 32.5);
  assert.equal(calculateAudioTimelineTime(9, 10, 60), 60);

  const unavailablePolicy = new RewardedGameplayPolicy();
  assert.equal(unavailablePolicy.canOffer(true), true);
  assert.equal(unavailablePolicy.beginRequest(), true);
  assert.equal(unavailablePolicy.beginRequest(), false);
  assert.equal(unavailablePolicy.resolve('unavailable'), false);
  assert.equal(unavailablePolicy.consumed, false);
  assert.equal(unavailablePolicy.unavailable, true);
  assert.equal(unavailablePolicy.canOffer(true), false);

  for (const status of ['cancelled', 'error', 'rewarded']) {
    const policy = new RewardedGameplayPolicy();
    assert.equal(policy.beginRequest(), true);
    assert.equal(policy.resolve(status), status === 'rewarded');
    assert.equal(policy.consumed, true);
    assert.equal(policy.canOffer(true), false);
    assert.equal(policy.beginRequest(), false);
    assert.equal(policy.revived, status === 'rewarded');
  }

  console.log('Phase checkpoint restore, beatmap seek and audio timeline: OK');
} finally {
  await server.close();
}
