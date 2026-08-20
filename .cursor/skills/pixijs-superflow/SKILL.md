---
name: pixijs-superflow
description: >-
  Builds SUPERFLOW cosmetics with PixiJS v8 Graphics (star, arc, beginPath,
  blendMode add) without changing gameplay. Use when editing skins, themes,
  visualizers, TargetNode, RhythmBackground, MusicVisualizer, ThemeCatalog,
  ThemeCollection, or Pixi drawing code.
---

# SUPERFLOW + PixiJS v8

Runtime: PixiJS 8 (`Application.init()`, `app.canvas`, `eventMode`).
Budget: JS chunk max 500 kB. Last CI failed at 500.01 kB — keep 150+ bytes headroom.

## Invariants

Cosmetics must not change timing, hitboxes, lives, score, FLOW, or mouse/touch.
`GAME_CONFIG.targetRadius` / `targetHitRadius` stay authoritative. Visual stars
may sit inside that radius; never enlarge the hit circle.

No external images. No new `Filter` / `BlurFilter` imports (bundle). Prefer
primitives already on `Graphics`. Do not add roulette rewards (weights sum 100,
deterministic). Unlock new full skins with `requiredRuns`, not the roulette table.

## Pixi v8 drawing

Shape then `fill()` / `stroke()`. Never `beginFill` / `lineStyle`.

After any `stroke()`, call `beginPath()` before the next `arc()` or the GPU
connects with a straight line (preview-ring bug).

Useful primitives already in the bundle:

```ts
g.star(x, y, 6, radius, radius * 0.46).fill({ color, alpha });
g.regularPoly(x, y, radius, 6, rotation);
g.blendMode = 'add';
```

`FillGradient` exists in v8 but skip new imports unless `npm run test:bundle` still
has hundreds of bytes free.

Docs: [Graphics](https://pixijs.com/8.x/guides/components/scene-objects/graphics),
[fills](https://pixijs.com/8.x/guides/components/scene-objects/graphics/graphics-fill).

## Theme slots

`src/customization/ThemeComponents.ts`: `target-palette`, `timing-ring`,
`drag-trail`, `perfect-impact`, `music-visualizer`, `flow-background`,
`super-flow-background`. `composeCustomTheme()` mixes those ids.

New enums **must** be added to the sets in `ThemeSelection.ts` or they fall back
to neon-pulse.

Shapes: `orbital` | `faceted` | `segmented` | `stellar`
Rings: `concentric` | `broken` | `orbiting`
Trails: `luminous` | `electric` | `comet`
FLOW: `polygon` | `waves` | `vortex`
SUPER FLOW: `tunnel` | `hyperspace` | `prism`
Visualizers: `spectrum-bars-line` | `spectrum-bars` | `spectrum-columns` |
`spectrum-rings` | `spectrum-pulse` | `none`
Particles: `mixed` | `spark` | `diamond`

`stellar` → `Graphics.star()` in `TargetNode` and `ThemeList`. Hit radius unchanged.
`spectrum-pulse` → rotating 7-point star (`blendMode: 'add'`).
`spectrum-rings` → counter-rotating `arc`s (`blendMode: 'add'`). After `clear()`, `arc()` is safe; after `stroke()`, call `beginPath()` before the next `arc()`.

Factory: `createMusicVisualizer()` → `SpectrumBarsMusicVisualizer` only. Switch
style with visibility, do not add a second visualizer class unless the budget
survives.

## Adding a skin

1. Compact `DeepPartial<VisualTheme>` in `src/customization/themes/`.
2. Register in `ThemeCatalog.ts` and `ThemeCollection.ts`.
3. Update `scripts/verify-theme-resolution.mjs` id list and collection length.
4. If new enums: `ThemeTypes.ts` + `ThemeSelection.ts` + visualizer/target renderer.
5. Preview: `?theme=<id>` (no unlock required).
6. `npx tsc -b`, `npm run test:theme`, `npx vite build`, `npm run test:bundle`.

A recolor is not a skin. Distinct shape + visualizer + trail + FLOW pattern.
Keep theme `description` short; those strings ship in the JS chunk.
