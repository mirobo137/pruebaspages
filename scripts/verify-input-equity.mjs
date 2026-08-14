import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});

try {
  const {
    areCompetitiveResultsComparable,
    COMPETITIVE_RANKING_POLICY,
    PROGRESSION_SCOPE,
    resolveInputProfileId,
    SPATIAL_MODEL_VERSION,
  } = await server.ssrLoadModule('/src/input/GameplayResultContext.ts');
  const { summarizeInputProfiles } = await server.ssrLoadModule(
    '/src/analytics/InputProfileComparison.ts',
  );
  const { LocalProgressStorage } = await server.ssrLoadModule(
    '/src/platform/LocalProgressStorage.ts',
  );
  const { ProgressionStore } = await server.ssrLoadModule(
    '/src/progression/ProgressionStore.ts',
  );

  assert.equal(PROGRESSION_SCOPE, 'shared-across-input-profiles');
  assert.equal(
    COMPETITIVE_RANKING_POLICY,
    'separate-by-profile-and-spatial-version',
  );
  assert.equal(resolveInputProfileId(new Set(['mouse']), 'touch'), 'mouse');
  assert.equal(resolveInputProfileId(new Set(['mouse', 'touch']), 'mouse'), 'hybrid');
  assert.equal(areCompetitiveResultsComparable(
    { inputProfileId: 'mouse', spatialModelVersion: SPATIAL_MODEL_VERSION },
    { inputProfileId: 'mouse', spatialModelVersion: SPATIAL_MODEL_VERSION },
  ), true);
  assert.equal(areCompetitiveResultsComparable(
    { inputProfileId: 'mouse', spatialModelVersion: SPATIAL_MODEL_VERSION },
    { inputProfileId: 'touch', spatialModelVersion: SPATIAL_MODEL_VERSION },
  ), false);
  assert.equal(areCompetitiveResultsComparable(
    { inputProfileId: 'mouse', spatialModelVersion: 'spatial-v1' },
    { inputProfileId: 'mouse', spatialModelVersion: SPATIAL_MODEL_VERSION },
  ), false);

  const finished = (inputProfileId, accuracy, misses, completed = true) => ({
    type: 'song_finished',
    trackId: 'song',
    difficulty: 'hard',
    completed,
    stars: completed ? 2 : 0,
    score: 5000,
    inputProfileId,
    spatialModelVersion: SPATIAL_MODEL_VERSION,
    accuracy,
    bestCombo: 20,
    misses,
    missReasons: misses ? { 'tap-timeout': misses } : {},
    flowActivations: 2,
    superFlowActivations: 1,
    pointerDistance: 20_000,
    emptyPresses: 3,
    averageTravelDistance: 225,
    maximumRequiredSpeed: 1000,
    averageDragLength: 310,
  });
  const summaries = summarizeInputProfiles([
    { at: 0, event: {
      type: 'song_finished', trackId: 'legacy', difficulty: 'easy',
      completed: true, stars: 1, score: 100,
    } },
    { at: 1, event: finished('mouse', 0.8, 4) },
    { at: 2, event: finished('mouse', 0.9, 2, false) },
    { at: 3, event: finished('touch', 0.95, 1) },
  ]);
  assert.equal(summaries.length, 2);
  const mouse = summaries.find((summary) => summary.inputProfileId === 'mouse');
  assert.equal(mouse.runs, 2);
  assert.equal(mouse.difficulty, 'hard');
  assert.equal(mouse.completionRate, 0.5);
  assert.equal(mouse.averageAccuracy, 0.85);
  assert.equal(mouse.averageMisses, 3);
  assert.equal(mouse.maximumRequiredSpeed, 1000);

  // Mouse and touch runs intentionally update the same progression record.
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const progression = new ProgressionStore(new LocalProgressStorage(storage));
  const flow = { activations: 1, superActivations: 0 };
  const mouseRun = {
    score: 4000,
    combo: 8,
    bestCombo: 18,
    lives: 2,
    maxLives: 4,
    perfects: 30,
    goods: 10,
    misses: 4,
  };
  const touchRun = {
    ...mouseRun,
    score: 5200,
    bestCombo: 24,
    perfects: 34,
    misses: 2,
  };
  progression.recordRun('shared-song', 'hard', mouseRun, flow, true);
  progression.recordRun('shared-song', 'hard', touchRun, flow, true);
  const sharedRecord = progression.getRecord('shared-song', 'hard');
  assert.equal(sharedRecord.attempts, 2);
  assert.equal(sharedRecord.highScore, 5200);
  assert.equal(sharedRecord.bestCombo, 24);
  assert.equal(progression.totalRuns, 2);
  assert.ok(progression.coins > 0);

  console.log('Shared progression policy and versioned input comparison: OK');
} finally {
  await server.close();
}
