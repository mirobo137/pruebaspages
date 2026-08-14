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
    InputGameplayProfile,
    calculateTargetPlayfield,
    detectInitialPointerMode,
    pointInTargetPlayfield,
    resolveDesktopReachVariant,
  } = await server.ssrLoadModule('/src/input/InputGameplayProfile.ts');
  const { getInteractionProfile, resolvePointerTuning } = await server.ssrLoadModule(
    '/src/input/InteractionProfileCatalog.ts',
  );
  const { DragInteractionController } = await server.ssrLoadModule(
    '/src/input/drag/DragInteractionController.ts',
  );
  const { PointerAssistance } = await server.ssrLoadModule(
    '/src/input/PointerAssistance.ts',
  );
  const { getDragInteractionPolicy } = await server.ssrLoadModule(
    '/src/input/drag/DragPolicyCatalog.ts',
  );

  assert.equal(getInteractionProfile('mouse').usesGameplayCursor, true);
  assert.equal(getInteractionProfile('mouse').dragPolicyId, 'mouse-assisted');
  assert.equal(getInteractionProfile('touch').playfield, 'safe-viewport');
  assert.deepEqual(resolvePointerTuning('mouse', 7), {
    hitRadiusBonus: 0,
    dragToleranceBonus: 24,
    dragCompletionThreshold: 0.84,
    earlyInputBuffer: 0.03,
    sparkDistance: 12,
    latencyCompensationLimit: 0.025,
  });
  assert.equal(resolvePointerTuning('touch', 7).hitRadiusBonus, 19);
  assert.equal(resolvePointerTuning('touch', 7).dragToleranceBonus, 21);
  assert.equal(resolvePointerTuning('pen', 4).hitRadiusBonus, 8);
  const pointerAssistance = new PointerAssistance();
  assert.equal(pointerAssistance.forPointer('mouse', 'medium').hitRadiusBonus, 0);
  assert.equal(pointerAssistance.forPointer('mouse', 'hard').hitRadiusBonus, 20);
  assert.equal(pointerAssistance.forPointer('touch', 'hard').hitRadiusBonus, 12);

  assert.equal(detectInitialPointerMode({
    maxTouchPoints: 0, coarsePointer: false, finePointer: true,
  }), 'mouse');
  assert.equal(detectInitialPointerMode({
    maxTouchPoints: 5, coarsePointer: true, finePointer: false,
  }), 'touch');
  // Hybrid hardware starts as mouse but last active pointer can take over.
  assert.equal(detectInitialPointerMode({
    maxTouchPoints: 10, coarsePointer: true, finePointer: true,
  }), 'mouse');

  const desktopViewports = [
    [1280, 720],
    [1366, 768],
    [1920, 1080],
    [2560, 1080],
    [3102, 1384],
    [3440, 1440],
    [3840, 2160],
  ];
  for (const [width, height] of desktopViewports) {
    const bounds = calculateTargetPlayfield(width, height, 'mouse');
    assert.ok(bounds.left >= 62 && bounds.right <= width - 62);
    assert.ok(bounds.width <= 820, `${width}x${height}: mouse field too wide`);
    assert.ok(bounds.height <= 680, `${width}x${height}: mouse field too tall`);
    assert.ok(Math.abs((bounds.left + bounds.right) * 0.5 - width * 0.5) < 0.01);
    assert.ok(bounds.top >= 130 && bounds.bottom <= height - 62);
    if (bounds.height === 680) {
      assert.ok(Math.abs((bounds.top + bounds.bottom) * 0.5 - height * 0.5) < 0.01);
    }
    const start = pointInTargetPlayfield({ x: 0, y: 0 }, bounds);
    const end = pointInTargetPlayfield({ x: 1, y: 1 }, bounds);
    assert.deepEqual(start, { x: bounds.left, y: bounds.top });
    assert.deepEqual(end, { x: bounds.right, y: bounds.bottom });
    assert.deepEqual(
      pointInTargetPlayfield({ x: 0.37, y: 0.61 }, bounds),
      pointInTargetPlayfield({ x: 0.37, y: 0.61 }, bounds),
    );
  }

  const mobileViewports = [[320, 568], [390, 844], [915, 412]];
  for (const [width, height] of mobileViewports) {
    const touch = calculateTargetPlayfield(width, height, 'touch');
    const pen = calculateTargetPlayfield(width, height, 'pen');
    assert.equal(touch.left, 62);
    assert.equal(touch.right, Math.max(62, width - 62));
    assert.deepEqual(pen, touch);
  }

  const profile = new InputGameplayProfile(1920, 1080, 'mouse');
  assert.equal(profile.usesGameplayCursor, true);
  assert.equal(profile.registerPointer('touch'), true);
  assert.equal(profile.mode, 'touch');
  assert.equal(profile.usesGameplayCursor, false);
  assert.equal(profile.bounds.width, 1920 - 124);
  assert.equal(profile.registerPointer('touch'), false);
  assert.equal(profile.registerPointer('pen'), true);
  profile.resize(390, 844);
  assert.equal(profile.bounds.width, 390 - 124);

  const lockedProfile = new InputGameplayProfile(1920, 1080, 'mouse');
  lockedProfile.lockGesture(7, 'mouse');
  assert.equal(lockedProfile.registerPointer('touch'), false);
  assert.equal(lockedProfile.mode, 'mouse');
  assert.equal(lockedProfile.releaseGesture(99), false);
  assert.equal(lockedProfile.releaseGesture(7), true);
  assert.equal(lockedProfile.mode, 'touch');

  const dragController = new DragInteractionController();
  const dragState = {
    pointerId: 3,
    target: { id: 'target' },
    grade: 'perfect',
    deadline: 2,
    completed: false,
    released: false,
    progress: 0,
    checkpointsPassed: 0,
    lastSparkX: 10,
    lastSparkY: 20,
    tuning: resolvePointerTuning('mouse', 0),
  };
  const tracePolicy = getDragInteractionPolicy('trace');
  dragController.start(dragState, tracePolicy);
  assert.equal(dragController.active.target, dragState.target);
  assert.equal(dragController.active.policy, tracePolicy);
  assert.equal(dragController.active.policy.resolvesOnDestination, true);
  assert.equal(dragController.clear().target, dragState.target);
  assert.equal(dragController.active, null);

  assert.equal(resolveDesktopReachVariant('?mouseReach=compact'), 'compact');
  assert.equal(resolveDesktopReachVariant('?mouseReach=expansive'), 'expansive');
  assert.equal(resolveDesktopReachVariant('?mouseReach=anything'), 'balanced');
  const compact = calculateTargetPlayfield(1920, 1080, 'mouse', 'compact');
  const balanced = calculateTargetPlayfield(1920, 1080, 'mouse', 'balanced');
  const expansive = calculateTargetPlayfield(1920, 1080, 'mouse', 'expansive');
  assert.ok(compact.width < balanced.width && balanced.width < expansive.width);
  assert.deepEqual(
    [compact.width, balanced.width, expansive.width],
    [720, 820, 920],
  );
  assert.deepEqual(
    [compact.height, balanced.height, expansive.height],
    [620, 680, 740],
  );

  const fullscreen = calculateTargetPlayfield(3102, 1384, 'mouse', 'balanced');
  assert.equal(fullscreen.width, 820);
  assert.equal(fullscreen.height, 680);
  assert.equal((fullscreen.left + fullscreen.right) / 2, 1551);
  assert.equal((fullscreen.top + fullscreen.bottom) / 2, 692);

  console.log('Mouse/touch profiles, hybrid locking and 10 viewports: OK');
} finally {
  await server.close();
}
