import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});

try {
  const { resolveVisualTheme } = await server.ssrLoadModule(
    '/src/customization/ThemeSelection.ts',
  );
  const { DEFAULT_VISUAL_THEME } = await server.ssrLoadModule(
    '/src/customization/themes/defaultTheme.ts',
  );
  const { getVisualTheme, listVisualThemes, ThemeSelection } = await server.ssrLoadModule(
    '/src/customization/ThemeCatalog.ts',
  );
  const { FULL_VISUAL_QUALITY, REDUCED_VISUAL_QUALITY } = await server.ssrLoadModule(
    '/src/customization/VisualQuality.ts',
  );

  const partial = resolveVisualTheme({
    id: 'partial-test',
    target: { tapFill: 0x123456 },
    background: { phasePrimary: [0x111111] },
  });
  assert.equal(partial.id, 'partial-test');
  assert.equal(partial.name, DEFAULT_VISUAL_THEME.name);
  assert.equal(partial.target.tapFill, 0x123456);
  assert.equal(partial.target.dragFill, DEFAULT_VISUAL_THEME.target.dragFill);
  assert.deepEqual(partial.background.phasePrimary, [
    0x111111,
    DEFAULT_VISUAL_THEME.background.phasePrimary[1],
    DEFAULT_VISUAL_THEME.background.phasePrimary[2],
  ]);

  const invalid = resolveVisualTheme({
    target: { shape: 'unknown', tapFill: -1 },
    drag: { trailStyle: 'unknown' },
    background: { flowPattern: 'unknown', backdrop: 0x1000000 },
    effects: { particleStyle: 'unknown' },
  });
  assert.equal(invalid.target.shape, DEFAULT_VISUAL_THEME.target.shape);
  assert.equal(invalid.target.tapFill, DEFAULT_VISUAL_THEME.target.tapFill);
  assert.equal(invalid.drag.trailStyle, DEFAULT_VISUAL_THEME.drag.trailStyle);
  assert.equal(invalid.background.flowPattern, DEFAULT_VISUAL_THEME.background.flowPattern);
  assert.equal(invalid.background.backdrop, DEFAULT_VISUAL_THEME.background.backdrop);
  assert.equal(invalid.effects.particleStyle, DEFAULT_VISUAL_THEME.effects.particleStyle);
  assert.equal(Object.isFrozen(invalid), true);
  assert.equal(Object.isFrozen(invalid.target), true);

  const selection = new ThemeSelection();
  assert.equal(selection.current.id, DEFAULT_VISUAL_THEME.id);
  assert.deepEqual(
    listVisualThemes().map((theme) => theme.id),
    ['neon-pulse', 'cyber-sakura', 'solar-flux'],
  );
  assert.equal(selection.select('cyber-sakura').target.shape, 'segmented');
  assert.equal(selection.current.target.timingRingStyle, 'broken');
  assert.equal(selection.current.drag.trailStyle, 'comet');
  assert.equal(selection.current.background.flowPattern, 'waves');
  assert.equal(selection.current.background.superFlowPattern, 'prism');
  assert.equal(selection.current.effects.particleStyle, 'diamond');
  assert.equal(selection.select('solar-flux').target.shape, 'faceted');
  assert.equal(selection.current.target.timingRingStyle, 'orbiting');
  assert.equal(selection.current.drag.trailStyle, 'electric');
  assert.equal(selection.current.background.flowPattern, 'vortex');
  assert.equal(selection.current.background.superFlowPattern, 'hyperspace');
  assert.equal(selection.current.effects.particleStyle, 'spark');
  assert.equal(selection.select('missing-theme').id, DEFAULT_VISUAL_THEME.id);
  assert.equal(getVisualTheme('missing-theme').id, DEFAULT_VISUAL_THEME.id);
  assert.equal(FULL_VISUAL_QUALITY.particleMultiplier, 1);
  assert.ok(REDUCED_VISUAL_QUALITY.particleMultiplier < 1);
  assert.ok(REDUCED_VISUAL_QUALITY.ambientOrbCount < FULL_VISUAL_QUALITY.ambientOrbCount);

  console.log('Theme catalog and visual quality: OK');
} finally {
  await server.close();
}
