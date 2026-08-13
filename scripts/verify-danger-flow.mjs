import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});

try {
  const { FlowModel } = await server.ssrLoadModule('/src/game/flow/FlowModel.ts');
  const { isDangerState } = await server.ssrLoadModule('/src/ui/DangerIndicator.ts');

  assert.equal(isDangerState({ lives: 2 }), false);
  assert.equal(isDangerState({ lives: 1 }), true);
  assert.equal(isDangerState({ lives: 0 }), false);

  const flow = new FlowModel();
  for (let index = 0; index < 4; index += 1) flow.register('perfect');
  assert.equal(flow.snapshot().mode, 'flow');
  const beforeIdle = flow.snapshot();
  const idleChange = flow.update(60 * 60);
  assert.equal(idleChange.ended, false);
  assert.deepEqual(flow.snapshot(), beforeIdle);

  flow.register('perfect');
  flow.register('perfect');
  flow.register('perfect');
  assert.equal(flow.snapshot().superPerfects, 3);
  flow.update(Number.MAX_SAFE_INTEGER);
  assert.equal(flow.snapshot().mode, 'flow');
  assert.equal(flow.snapshot().superPerfects, 3);
  const superChange = flow.register('perfect');
  assert.equal(superChange.superActivated, true);
  assert.equal(flow.snapshot().mode, 'super');
  flow.update(999999);
  assert.equal(flow.snapshot().mode, 'super');

  const demotion = flow.register('good');
  assert.equal(demotion.superDemoted, true);
  assert.equal(demotion.ended, false);
  assert.equal(flow.snapshot().mode, 'flow');
  assert.equal(flow.snapshot().superPerfects, 0);
  flow.update(999999);
  assert.equal(flow.snapshot().mode, 'flow');

  const broken = flow.register('miss');
  assert.equal(broken.ended, true);
  assert.equal(flow.snapshot().mode, 'charging');
  assert.equal(flow.snapshot().charge, 0);

  console.log('Last-life derivation and judgement-only FLOW state machine: OK');
} finally {
  await server.close();
}
