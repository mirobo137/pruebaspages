import assert from 'node:assert/strict';
import { createServer } from 'vite';

const originalWindow = globalThis.window;
globalThis.window = {
  devicePixelRatio: 2,
  screen: { width: 1920, height: 1080 },
};

const server = await createServer({
  configFile: false,
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});

try {
  const { GameplayInputTelemetry } = await server.ssrLoadModule(
    '/src/input/GameplayInputTelemetry.ts',
  );
  const telemetry = new GameplayInputTelemetry('mouse', 1920, 1080, {
    left: 550,
    top: 200,
    width: 820,
    height: 680,
  });

  let frameTimestamp = 0;
  telemetry.recordFrame('charging', frameTimestamp);
  for (let index = 0; index < 100; index += 1) {
    frameTimestamp += index < 95 ? 1_000 / 60 : 1_000 / 30;
    telemetry.recordFrame('charging', frameTimestamp);
  }
  telemetry.resetFrameClock();
  telemetry.recordFrame('flow', 0);
  telemetry.recordFrame('flow', 20);
  telemetry.resetFrameClock();
  telemetry.recordFrame('super', 0);
  telemetry.recordFrame('super', 1_000 / 45);
  telemetry.recordPointer(100, 100);
  telemetry.recordPointer(400, 500);
  telemetry.recordEmptyPress();
  telemetry.recordTargetTravel(null, { x: 0, y: 0, time: 0 });
  telemetry.recordTargetTravel(
    { x: 0, y: 0, time: 0 },
    { x: 300, y: 400, time: 0.5 },
  );
  telemetry.recordDragDemand(420, 0.7);
  telemetry.recordResult('perfect', 'tap');
  telemetry.recordResult('miss', 'drag', 'drag-release-early');

  const snapshot = telemetry.snapshot();
  assert.equal(snapshot.pointer, 'mouse');
  assert.equal(snapshot.viewport, '1920x1080');
  assert.equal(snapshot.screen, '1920x1080');
  assert.equal(snapshot.devicePixelRatio, 2);
  assert.equal(snapshot.renderResolution, 2);
  assert.equal(snapshot.renderedPixels, 1920 * 1080 * 4);
  assert.deepEqual(snapshot.playfield, { left: 550, top: 200, width: 820, height: 680 });
  assert.equal(snapshot.pointerDistance, 500);
  assert.equal(snapshot.emptyPresses, 1);
  assert.deepEqual(snapshot.results, { perfect: 1, good: 0, miss: 1 });
  assert.equal(snapshot.misses['drag-release-early'], 1);
  assert.equal(snapshot.frames.charging.samples, 100);
  assert.ok(snapshot.frames.charging.p95Ms >= 16.6);
  assert.ok(snapshot.frames.charging.p99Ms >= 33.3);
  assert.equal(snapshot.frames.flow.samples, 1);
  assert.equal(snapshot.frames.super.samples, 1);
  assert.equal(snapshot.travel.samples, 1);
  assert.equal(snapshot.travel.maximumDistance, 500);
  assert.equal(snapshot.travel.maximumRequiredSpeed, 1_000);
  assert.equal(snapshot.drags.samples, 1);
  assert.equal(snapshot.drags.maximumLength, 420);
  assert.equal(snapshot.drags.maximumRequiredSpeed, 600);

  telemetry.setProfile('touch', 390, 844);
  assert.equal(telemetry.snapshot().pointer, 'touch');
  assert.equal(globalThis.__superflowDiagnostics.pointer, 'touch');

  console.log('Desktop D0 frame, travel, drag and failure diagnostics: OK');
} finally {
  await server.close();
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
  delete globalThis.__superflowDiagnostics;
}
