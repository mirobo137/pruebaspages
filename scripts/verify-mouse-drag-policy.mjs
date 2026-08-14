import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});

try {
  const { getDragInteractionPolicy } = await server.ssrLoadModule(
    '/src/input/drag/DragPolicyCatalog.ts',
  );
  const { resolveDirectionalDragProgress } = await server.ssrLoadModule(
    '/src/input/drag/DirectionalDragAssistance.ts',
  );
  const { DragInteractionController } = await server.ssrLoadModule(
    '/src/input/drag/DragInteractionController.ts',
  );

  const mouse = getDragInteractionPolicy('mouse-assisted');
  const touch = getDragInteractionPolicy('trace');
  assert.equal(mouse.trackingMode, 'directional-assisted');
  assert.equal(mouse.requiresRelease, false);
  assert.equal(mouse.resolvesOnDestination, true);
  assert.equal(touch.trackingMode, 'trace');
  assert.equal(touch.requiresRelease, false);
  assert.equal(touch.resolvesOnDestination, true);

  const baseSample = {
    currentProgress: 0.2,
    projectedProgress: 0.6,
    distanceFromPath: 80,
    corridor: 76,
    movementDistance: 70,
    directionAlignment: 0.6,
    pathLength: 320,
  };
  const assisted = resolveDirectionalDragProgress(baseSample);
  assert.equal(assisted.valid, true);
  assert.ok(assisted.progress > 0.2 && assisted.progress < 0.6);

  // A jump to the end without real movement never completes the drag.
  assert.deepEqual(resolveDirectionalDragProgress({
    ...baseSample,
    projectedProgress: 1,
    movementDistance: 0,
  }), { valid: false, progress: 0.2 });
  // Leaving the broad route or moving backwards also receives no assistance.
  assert.equal(resolveDirectionalDragProgress({
    ...baseSample,
    distanceFromPath: 111,
  }).valid, false);
  assert.equal(resolveDirectionalDragProgress({
    ...baseSample,
    directionAlignment: -0.5,
  }).valid, false);
  // Accumulated movement can complete without checkpoints or an exact final release.
  const completion = resolveDirectionalDragProgress({
    ...baseSample,
    currentProgress: 0.78,
    projectedProgress: 0.9,
    distanceFromPath: 42,
    movementDistance: 40,
  });
  assert.equal(completion.valid, true);
  assert.ok(completion.progress >= 0.84);

  // Pause/visibility cleanup uses this same clear path in GameScene.
  const controller = new DragInteractionController();
  controller.start({
    pointerId: 4,
    target: { id: 'drag' },
    grade: 'good',
    deadline: 10,
    completed: false,
    released: false,
    progress: 0.5,
    checkpointsPassed: 0,
    lastSparkX: 0,
    lastSparkY: 0,
    tuning: {
      hitRadiusBonus: 0,
      dragToleranceBonus: 24,
      dragCompletionThreshold: 0.84,
      earlyInputBuffer: 0.03,
      sparkDistance: 12,
      latencyCompensationLimit: 0.025,
    },
  }, mouse);
  assert.equal(controller.clear().target.id, 'drag');
  assert.equal(controller.active, null);

  console.log('Mouse directional assistance and touch trace regression: OK');
} finally {
  await server.close();
}
