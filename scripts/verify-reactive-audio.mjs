import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const server = await createServer({
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});

try {
  const {
    createFeedbackVoicePlan,
    createErrorNoisePlan,
    createMusicReactionPlan,
  } = await server.ssrLoadModule('/src/audio/ReactiveAudioFeedback.ts');

  const perfect = createFeedbackVoicePlan('perfect');
  const good = createFeedbackVoicePlan('good');
  const miss = createFeedbackVoicePlan('miss');
  const comboBreak = createFeedbackVoicePlan('combo-break');
  const defeat = createFeedbackVoicePlan('defeat');
  const flowActivation = createFeedbackVoicePlan('flow-activation');
  const superFlowActivation = createFeedbackVoicePlan('super-flow-activation');
  assert.equal(perfect.length, 2);
  assert.equal(good.length, 1);
  assert.equal(miss.length, 1);
  assert.equal(comboBreak.length, 2);
  assert.equal(defeat.length, 3);
  assert.equal(flowActivation.length, 3);
  assert.equal(superFlowActivation.length, 4);
  assert.ok(perfect[0].startFrequency > good[0].startFrequency);
  assert.ok(good[0].startFrequency > miss[0].startFrequency);
  assert.ok(comboBreak[0].duration > miss[0].duration);
  assert.equal(createErrorNoisePlan('perfect'), null);
  assert.equal(createErrorNoisePlan('good'), null);
  assert.ok(createErrorNoisePlan('miss').duration < createErrorNoisePlan('combo-break').duration);
  assert.ok(createErrorNoisePlan('combo-break').duration < createErrorNoisePlan('defeat').duration);

  assert.ok(perfect[0].gain >= 0.17);
  assert.ok(good[0].gain >= 0.14);
  assert.ok(flowActivation[0].gain > perfect[0].gain);
  assert.ok(superFlowActivation[0].gain > flowActivation[0].gain);
  assert.ok(superFlowActivation.at(-1).endFrequency > flowActivation.at(-1).endFrequency);
  for (const cue of [
    'perfect',
    'good',
    'miss',
    'combo-break',
    'defeat',
    'flow-activation',
    'super-flow-activation',
  ]) {
    for (const voice of createFeedbackVoicePlan(cue)) {
      assert.ok(voice.duration > 0 && voice.duration <= 0.45);
      assert.ok(voice.gain > 0 && voice.gain <= 0.22);
      assert.ok(voice.startFrequency > 0 && voice.endFrequency > 0);
    }
  }

  const missReaction = createMusicReactionPlan(false);
  const breakReaction = createMusicReactionPlan(true);
  const defeatReaction = createMusicReactionPlan(true, true);
  assert.ok(missReaction.duration < breakReaction.duration);
  assert.ok(missReaction.filterFrequency > breakReaction.filterFrequency);
  assert.ok(breakReaction.dryGain < missReaction.dryGain);
  assert.ok(breakReaction.duration < 0.2);
  assert.ok(defeatReaction.duration > breakReaction.duration);
  assert.ok(defeatReaction.duration < 0.35);
  assert.ok(defeatReaction.filterFrequency < breakReaction.filterFrequency);

  const feedbackSource = await readFile('src/audio/ReactiveAudioFeedback.ts', 'utf8');
  const audioManagerSource = await readFile('src/audio/AudioManager.ts', 'utf8');
  assert.equal(feedbackSource.includes('playbackRate'), false);
  assert.equal(feedbackSource.includes('suspend()'), false);
  assert.equal(feedbackSource.includes('currentTime ='), false);
  assert.equal(feedbackSource.includes('WaveShaper'), false);
  assert.equal(feedbackSource.includes('distortion'), false);
  assert.equal(audioManagerSource.includes("./assets/audio/sfx/miss.wav"), true);
  assert.equal(audioManagerSource.includes("./assets/audio/sfx/miss.mp3"), false);

  console.log('Procedural cues, bounded miss reaction and clock isolation: OK');
} finally {
  await server.close();
}
