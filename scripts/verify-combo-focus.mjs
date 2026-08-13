import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});

try {
  const {
    chooseComboFocusPosition,
    getFocusProgressLabel,
    isComboMilestone,
  } = await server.ssrLoadModule('/src/ui/ComboFocusPresenter.ts');

  const viewports = [[320, 568], [390, 844], [915, 412], [1920, 1080]];
  for (const [width, height] of viewports) {
    const position = chooseComboFocusPosition({
      impact: { x: width * 0.5, y: height * 0.5 },
      avoid: [
        { x: width * 0.5, y: height * 0.5 - 82 },
        { x: width * 0.5 + 88, y: height * 0.5 - 24 },
      ],
      viewportWidth: width,
      viewportHeight: height,
    });
    assert.ok(position.x >= 78 && position.x <= Math.max(78, width - 78));
    assert.ok(position.y >= 158 && position.y <= Math.max(158, height - 74));
    assert.ok(
      Math.hypot(position.x - width * 0.5, position.y - height * 0.5 + 82) > 20,
      `${width}x${height}: focus overlaps first upcoming note`,
    );
  }

  const base = {
    charge: 80,
    maxCharge: 100,
    active: false,
    remaining: 0,
    duration: 8,
    multiplier: 1,
    activations: 0,
    mode: 'charging',
    superActive: false,
    superPerfects: 0,
    superPerfectRequirement: 4,
    superActivations: 0,
  };
  assert.equal(getFocusProgressLabel({ ...base, charge: 50 }), '');
  assert.equal(getFocusProgressLabel(base), 'FLOW 80%');
  assert.equal(getFocusProgressLabel({
    ...base, active: true, mode: 'flow', multiplier: 2, superPerfects: 3,
  }), 'SUPER 3/4');
  assert.equal(getFocusProgressLabel({
    ...base, active: true, mode: 'super', multiplier: 4, superActive: true,
  }), 'SUPER FLOW');

  assert.equal(isComboMilestone(9), false);
  assert.equal(isComboMilestone(10), true);
  assert.equal(isComboMilestone(25), true);
  assert.equal(isComboMilestone(50), true);
  assert.equal(isComboMilestone(100), true);
  assert.equal(isComboMilestone(75), false);

  console.log('Focal combo placement, milestones and FLOW anticipation: OK');
} finally {
  await server.close();
}
