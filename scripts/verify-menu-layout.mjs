import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});

try {
  const { calculateMenuLayout } = await server.ssrLoadModule(
    '/src/scenes/MenuLayout.ts',
  );
  const { calculateResultLayout } = await server.ssrLoadModule(
    '/src/scenes/ResultLayout.ts',
  );
  const viewports = [
    [320, 568],
    [360, 640],
    [375, 667],
    [390, 844],
    [430, 932],
    [650, 360],
    [667, 375],
    [844, 390],
    [915, 412],
  ];

  for (const [width, height] of viewports) {
    const layout = calculateMenuLayout(width, height);
    assert.ok(layout.contentX >= 0, `${width}x${height}: contenido fuera a la izquierda`);
    assert.ok(
      layout.contentX + layout.contentWidth <= width,
      `${width}x${height}: contenido fuera a la derecha`,
    );
    assert.ok(layout.listHeight >= 100, `${width}x${height}: playlist demasiado pequena`);
    assert.ok(layout.listTop + layout.listHeight <= height, `${width}x${height}: playlist fuera`);
    assert.ok(layout.playTop >= 0, `${width}x${height}: JUGAR arriba del viewport`);
    assert.ok(layout.playTop + 64 <= height, `${width}x${height}: JUGAR fuera del viewport`);
    if (!layout.landscape) {
      assert.ok(
        layout.actionsY + 42 <= layout.categoryTop - 16,
        `${width}x${height}: navegacion y playlist se superponen`,
      );
      assert.ok(
        layout.listTop + layout.listHeight <= layout.difficultyTop,
        `${width}x${height}: playlist y dificultad se superponen`,
      );
    }

    const resultLayout = calculateResultLayout(width, height);
    assert.ok(resultLayout.cardX >= 0, `${width}x${height}: resultado fuera a la izquierda`);
    assert.ok(
      resultLayout.cardX + resultLayout.cardWidth <= width,
      `${width}x${height}: resultado fuera a la derecha`,
    );
    assert.ok(resultLayout.buttonY >= resultLayout.cardY + resultLayout.cardHeight);
    assert.ok(resultLayout.buttonY + 64 <= height, `${width}x${height}: botones de resultado fuera`);
    assert.ok(resultLayout.totalButtonWidth <= width);
  }

  assert.equal(calculateMenuLayout(320, 568).showDetails, false);
  assert.equal(calculateMenuLayout(390, 844).showDetails, true);
  assert.equal(calculateMenuLayout(650, 360).compact, true);
  console.log('Responsive menu and rewarded result across 9 mobile viewports: OK');
} finally {
  await server.close();
}
