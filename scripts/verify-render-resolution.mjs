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
    MAX_RENDER_RESOLUTION,
    RENDER_PIXEL_BUDGET,
    resolveRenderResolution,
  } = await server.ssrLoadModule('/src/rendering/RenderResolutionPolicy.ts');

  const measuredViewport = resolveRenderResolution(2566, 1197, 1);
  assert.equal(measuredViewport.resolution, 1);
  assert.equal(measuredViewport.constrained, false);
  assert.equal(measuredViewport.renderedPixels, 3_071_502);

  const ultrawide = resolveRenderResolution(3440, 1440, 1);
  assert.equal(ultrawide.resolution, 1);
  assert.equal(ultrawide.constrained, false);
  assert.equal(ultrawide.budgetExceeded, true);

  const retina1080 = resolveRenderResolution(1920, 1080, 2);
  assert.equal(retina1080.requestedResolution, MAX_RENDER_RESOLUTION);
  assert.equal(retina1080.constrained, true);
  assert.ok(retina1080.renderedPixels <= RENDER_PIXEL_BUDGET);
  assert.ok(retina1080.resolution < 2);

  const fourK = resolveRenderResolution(3840, 2160, 1);
  assert.equal(fourK.resolution, 1);
  assert.equal(fourK.constrained, false);
  assert.equal(fourK.budgetExceeded, true);

  const extreme = resolveRenderResolution(15360, 8640, 2);
  assert.equal(extreme.resolution, 1);
  assert.equal(extreme.constrained, true);
  assert.equal(extreme.budgetExceeded, true);

  const zoomedOut = resolveRenderResolution(1280, 720, 0.8);
  assert.equal(zoomedOut.resolution, 0.8);
  assert.equal(zoomedOut.constrained, false);

  console.log('Render pixel budget across desktop, DPR and extreme viewports: OK');
} finally {
  await server.close();
}
