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
  const { getAutomaticallyUnlockedThemeIds, listThemeCollection } = await server.ssrLoadModule(
    '/src/customization/ThemeCollection.ts',
  );
  const {
    composeCustomTheme,
    createDefaultCustomThemeSelection,
    listAvailableThemeComponents,
    sanitizeCustomThemeSelection,
  } = await server.ssrLoadModule('/src/customization/ThemeComponents.ts');

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
    [
      'neon-pulse',
      'cyber-sakura',
      'solar-flux',
      'neon-ascent',
      'aqua-vector',
      'violet-drive',
      'ember-beat',
    ],
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
  assert.equal(selection.select('neon-ascent').drag.trailStyle, 'comet');
  assert.equal(selection.current.background.superFlowPattern, 'prism');
  assert.equal(selection.select('missing-theme').id, DEFAULT_VISUAL_THEME.id);
  assert.equal(getVisualTheme('missing-theme').id, DEFAULT_VISUAL_THEME.id);
  assert.equal(FULL_VISUAL_QUALITY.particleMultiplier, 1);
  assert.ok(REDUCED_VISUAL_QUALITY.particleMultiplier < 1);
  assert.ok(REDUCED_VISUAL_QUALITY.ambientOrbCount < FULL_VISUAL_QUALITY.ambientOrbCount);

  const directSelection = new ThemeSelection('cyber-sakura');
  assert.equal(directSelection.current.id, 'cyber-sakura');
  assert.equal(new ThemeSelection('missing-theme').current.id, DEFAULT_VISUAL_THEME.id);

  const newPlayerUnlocks = getAutomaticallyUnlockedThemeIds(0);
  const newPlayerCollection = listThemeCollection(0, newPlayerUnlocks);
  assert.equal(newPlayerCollection.length, 7);
  assert.equal(newPlayerUnlocks.includes('neon-pulse'), true);
  assert.equal(newPlayerUnlocks.includes('cyber-sakura'), true);
  assert.equal(newPlayerUnlocks.includes('solar-flux'), false);
  assert.equal(getAutomaticallyUnlockedThemeIds(3).includes('solar-flux'), true);
  assert.equal(getAutomaticallyUnlockedThemeIds(999).includes('neon-ascent'), false);
  const eventCollection = listThemeCollection(0, newPlayerUnlocks, [
    'neon-ascent-2026:target-palette',
    'neon-ascent-2026:timing-ring',
  ]);
  assert.equal(eventCollection.find((item) => item.theme.id === 'neon-ascent')?.progressLabel, '2/7 COMPONENTES');

  const available = listAvailableThemeComponents(newPlayerUnlocks, [
    'neon-ascent:drag-trail',
  ]);
  assert.deepEqual(
    available['target-palette'].map((option) => option.themeId),
    ['neon-pulse', 'cyber-sakura'],
  );
  assert.deepEqual(
    available['drag-trail'].map((option) => option.themeId),
    ['neon-pulse', 'cyber-sakura', 'neon-ascent'],
  );
  const customSelection = {
    ...createDefaultCustomThemeSelection(),
    'target-palette': 'cyber-sakura',
    'drag-trail': 'neon-ascent',
    'super-flow-background': 'cyber-sakura',
  };
  const custom = composeCustomTheme(customSelection);
  assert.equal(custom.id, 'custom-1');
  assert.equal(custom.target.shape, getVisualTheme('cyber-sakura').target.shape);
  assert.equal(custom.drag.trailStyle, getVisualTheme('neon-ascent').drag.trailStyle);
  assert.equal(
    custom.background.superFlowPattern,
    getVisualTheme('cyber-sakura').background.superFlowPattern,
  );
  const sanitizedCustom = sanitizeCustomThemeSelection(
    { ...customSelection, 'perfect-impact': 'locked-theme' },
    newPlayerUnlocks,
    ['neon-ascent:drag-trail'],
  );
  assert.equal(sanitizedCustom['perfect-impact'], 'neon-pulse');
  const collectionWithCustom = listThemeCollection(
    0,
    newPlayerUnlocks,
    [],
    createDefaultCustomThemeSelection(),
  );
  assert.equal(collectionWithCustom.at(-1)?.theme.id, 'custom-1');

  console.log('Theme catalog, collection and visual quality: OK');
} finally {
  await server.close();
}
