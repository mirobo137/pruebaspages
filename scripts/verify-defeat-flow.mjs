import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});

try {
  const { calculateDefeatLayout } = await server.ssrLoadModule(
    '/src/ui/DefeatOverlay.ts',
  );
  const { RewardedGameplayPolicy } = await server.ssrLoadModule(
    '/src/game/checkpoint/RewardedGameplayPolicy.ts',
  );
  const { RunFinalizationGate } = await server.ssrLoadModule(
    '/src/game/results/RunFinalizationGate.ts',
  );

  for (const [width, height] of [
    [320, 568], [390, 844], [430, 932], [650, 360], [915, 412], [1920, 1080],
  ]) {
    for (const reviveAvailable of [false, true]) {
      const layout = calculateDefeatLayout(width, height, reviveAvailable);
      assert.ok(layout.panelX >= 0 && layout.panelY >= 0);
      assert.ok(layout.panelX + layout.panelWidth <= width);
      assert.ok(layout.panelY + layout.panelHeight <= height);
      assert.ok(layout.buttonWidth >= 120);
      assert.equal(layout.twoColumns, height < 620 && width >= 540);
    }
  }

  const policy = new RewardedGameplayPolicy();
  assert.equal(policy.canOffer(true), true);
  assert.equal(policy.beginRequest(), true);
  assert.equal(policy.resolve('cancelled'), false);
  assert.equal(policy.consumed, true);
  assert.equal(policy.canOffer(true), false);

  for (const destination of ['result', 'restart', 'menu']) {
    const gate = new RunFinalizationGate();
    assert.equal(gate.claim(), true, `${destination}: first finalization must win`);
    assert.equal(gate.finalized, true);
    assert.equal(gate.claim(), false, `${destination}: duplicate finalization blocked`);
  }

  console.log('Defeat overlay across 6 viewports and one-shot revive policy: OK');
} finally {
  await server.close();
}
