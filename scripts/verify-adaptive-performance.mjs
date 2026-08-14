import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});

try {
  const { AdaptivePerformanceController } = await server.ssrLoadModule(
    '/src/rendering/AdaptivePerformanceController.ts',
  );
  const { isSoftwareRendererLabel } = await server.ssrLoadModule(
    '/src/rendering/GraphicsCapability.ts',
  );

  assert.equal(isSoftwareRendererLabel(
    'ANGLE (Microsoft, Microsoft Basic Render Driver, D3D11)',
  ), true);
  assert.equal(isSoftwareRendererLabel('ANGLE (Google, Vulkan 1.3 SwiftShader)'), true);
  assert.equal(isSoftwareRendererLabel('llvmpipe (LLVM 18.1.8, 256 bits)'), true);
  assert.equal(isSoftwareRendererLabel(
    'ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Ti Direct3D11)',
  ), false);
  assert.equal(isSoftwareRendererLabel(null), false);

  const stable = new AdaptivePerformanceController();
  for (let index = 0; index < 240; index += 1) {
    assert.equal(stable.recordFrame(16.7, 'full', 1), null);
  }

  const slow = new AdaptivePerformanceController();
  for (let index = 0; index < 59; index += 1) {
    assert.equal(slow.recordFrame(34, 'full', 1), null);
  }
  assert.deepEqual(slow.recordFrame(34, 'full', 1), {
    qualityId: 'reduced',
    resolutionScale: 1,
    p95Ms: 34,
    reason: 'sustained-slow-frames',
  });

  const severe = new AdaptivePerformanceController();
  for (let index = 0; index < 59; index += 1) severe.recordFrame(78, 'full', 1);
  assert.equal(severe.recordFrame(78, 'full', 1)?.qualityId, 'minimal');

  const fallback = new AdaptivePerformanceController();
  for (let index = 0; index < 59; index += 1) fallback.recordFrame(78, 'minimal', 1);
  assert.equal(fallback.recordFrame(78, 'minimal', 1)?.resolutionScale, 0.75);
  for (let index = 0; index < 59; index += 1) fallback.recordFrame(78, 'minimal', 0.75);
  assert.equal(fallback.recordFrame(78, 'minimal', 0.75)?.resolutionScale, 0.5);

  const transitions = new AdaptivePerformanceController();
  for (let index = 0; index < 120; index += 1) {
    assert.equal(transitions.recordFrame(300, 'full', 1), null);
  }

  console.log('Adaptive full/reduced/minimal and resolution fallback: OK');
} finally {
  await server.close();
}
