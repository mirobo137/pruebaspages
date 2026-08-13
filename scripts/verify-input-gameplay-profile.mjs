import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({
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
  ];
  for (const [width, height] of desktopViewports) {
    const bounds = calculateTargetPlayfield(width, height, 'mouse');
    assert.ok(bounds.left >= 62 && bounds.right <= width - 62);
    assert.ok(bounds.width <= 1040, `${width}x${height}: mouse field too wide`);
    assert.ok(Math.abs((bounds.left + bounds.right) * 0.5 - width * 0.5) < 0.01);
    const start = pointInTargetPlayfield({ x: 0, y: 0 }, bounds);
    const end = pointInTargetPlayfield({ x: 1, y: 1 }, bounds);
    assert.deepEqual(start, { x: bounds.left, y: bounds.top });
    assert.deepEqual(end, { x: bounds.right, y: bounds.bottom });
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

  assert.equal(resolveDesktopReachVariant('?mouseReach=compact'), 'compact');
  assert.equal(resolveDesktopReachVariant('?mouseReach=expansive'), 'expansive');
  assert.equal(resolveDesktopReachVariant('?mouseReach=anything'), 'balanced');
  const compact = calculateTargetPlayfield(1920, 1080, 'mouse', 'compact');
  const balanced = calculateTargetPlayfield(1920, 1080, 'mouse', 'balanced');
  const expansive = calculateTargetPlayfield(1920, 1080, 'mouse', 'expansive');
  assert.ok(compact.width < balanced.width && balanced.width < expansive.width);

  console.log('Mouse/touch profiles, hybrid switching and 7 viewports: OK');
} finally {
  await server.close();
}
