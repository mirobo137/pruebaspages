import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const server = await createServer({
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});

try {
  const { parseWeeklyEventCatalog } = await server.ssrLoadModule(
    '/src/events/EventCatalog.ts',
  );
  const { getUtcWeekWindow } = await server.ssrLoadModule(
    '/src/events/EventClock.ts',
  );
  const {
    claimWeeklyEventReward,
    evaluateWeeklyEventRun,
    getWeeklyEventSnapshot,
    resolveActiveWeeklyEvent,
  } = await server.ssrLoadModule('/src/events/WeeklyEventEngine.ts');
  const { createEmptyProgressState } = await server.ssrLoadModule(
    '/src/progression/ProgressionTypes.ts',
  );
  const { LocalProgressStorage } = await server.ssrLoadModule(
    '/src/platform/LocalProgressStorage.ts',
  );
  const { ProgressionStore } = await server.ssrLoadModule(
    '/src/progression/ProgressionStore.ts',
  );

  const rawCatalog = JSON.parse(await readFile(
    new URL('../public/assets/events/weekly-events.json', import.meta.url),
    'utf8',
  ));
  const catalog = parseWeeklyEventCatalog(rawCatalog);
  assert.equal(catalog.length, 1);
  assert.equal(catalog[0].missions.length, 3);
  assert.equal(catalog[0].rewards.length, 7);
  assert.deepEqual(parseWeeklyEventCatalog({ invalid: true }), []);
  assert.deepEqual(parseWeeklyEventCatalog([{ ...rawCatalog[0], rewards: [] }]), []);

  const wednesday = new Date('2026-08-12T19:30:00.000Z');
  const sunday = new Date('2026-08-16T23:59:59.000Z');
  assert.deepEqual(getUtcWeekWindow(wednesday), getUtcWeekWindow(sunday));
  assert.equal(getUtcWeekWindow(wednesday).weekKey, '2026-08-10');
  const active = resolveActiveWeeklyEvent(catalog, wednesday);
  assert.equal(active?.id, 'neon-ascent-2026:2026-08-10');
  assert.equal(resolveActiveWeeklyEvent(catalog, new Date('2027-02-01T00:00:00Z')), null);

  let progress = createEmptyProgressState().weeklyEvent;
  const firstRun = evaluateWeeklyEventRun(catalog, progress, {
    completed: true,
    perfects: 50,
    bestCombo: 25,
    flowActivations: 2,
    superFlowActivations: 1,
  }, wednesday);
  assert.equal(firstRun.progress.missionProgress['complete-seven'], 1);
  assert.equal(firstRun.progress.missionProgress['perfect-three-hundred'], 50);
  assert.equal(firstRun.progress.missionProgress['combo-eighty'], 25);
  assert.equal(firstRun.progress.points, 30);
  assert.deepEqual(firstRun.claimableRewardIds, ['target-palette']);
  progress = firstRun.progress;

  const secondRun = evaluateWeeklyEventRun(catalog, progress, {
    completed: false,
    perfects: 25,
    bestCombo: 18,
    flowActivations: 0,
    superFlowActivations: 0,
  }, wednesday);
  assert.equal(secondRun.progress.missionProgress['complete-seven'], 1);
  assert.equal(secondRun.progress.missionProgress['perfect-three-hundred'], 75);
  assert.equal(secondRun.progress.missionProgress['combo-eighty'], 25);

  const wrongOrder = claimWeeklyEventReward(
    catalog,
    secondRun.progress,
    'timing-ring',
    wednesday,
  );
  assert.equal(wrongOrder.claimed, false);
  const firstClaim = claimWeeklyEventReward(
    catalog,
    secondRun.progress,
    'target-palette',
    wednesday,
  );
  assert.equal(firstClaim.claimed, true);
  assert.deepEqual(firstClaim.progress.claimedRewardIds, ['target-palette']);
  const duplicateClaim = claimWeeklyEventReward(
    catalog,
    firstClaim.progress,
    'target-palette',
    wednesday,
  );
  assert.equal(duplicateClaim.claimed, false);

  let completedRun = evaluateWeeklyEventRun(catalog, firstClaim.progress, {
    completed: true,
    perfects: 300,
    bestCombo: 80,
    flowActivations: 9,
    superFlowActivations: 4,
  }, wednesday);
  for (let run = 0; run < 2; run += 1) {
    completedRun = evaluateWeeklyEventRun(catalog, completedRun.progress, {
      completed: true,
      perfects: 0,
      bestCombo: 0,
      flowActivations: 0,
      superFlowActivations: 0,
    }, wednesday);
  }
  let claimProgress = completedRun.progress;
  const claimedIds = [...claimProgress.claimedRewardIds];
  for (const reward of catalog[0].rewards.slice(1)) {
    const claim = claimWeeklyEventReward(catalog, claimProgress, reward.id, wednesday);
    assert.equal(claim.claimed, true);
    claimProgress = claim.progress;
    claimedIds.push(reward.id);
  }
  assert.deepEqual(claimProgress.claimedRewardIds, catalog[0].rewards.map(
    (reward) => reward.id,
  ));
  assert.equal(new Set(claimProgress.claimedRewardIds).size, 7);
  assert.equal(claimedIds.length, 7);
  assert.equal(claimWeeklyEventReward(
    catalog,
    claimProgress,
    'complete-theme',
    wednesday,
  ).claimed, false);

  const nextWeek = new Date('2026-08-17T00:00:00.000Z');
  const resetRun = evaluateWeeklyEventRun(catalog, firstClaim.progress, {
    completed: true,
    perfects: 0,
    bestCombo: 0,
    flowActivations: 0,
    superFlowActivations: 0,
  }, nextWeek);
  assert.equal(resetRun.progress.weekKey, '2026-08-17');
  assert.equal(resetRun.progress.missionProgress['complete-seven'], 1);
  assert.deepEqual(resetRun.progress.claimedRewardIds, []);

  const noEvent = getWeeklyEventSnapshot([], progress, wednesday);
  assert.equal(noEvent.activeEvent, null);
  assert.equal(noEvent.changed, false);
  assert.deepEqual(noEvent.progress, progress);

  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const store = new ProgressionStore(new LocalProgressStorage(storage));
  for (let run = 0; run < 7; run += 1) {
    store.recordWeeklyEventRun(catalog, {
      completed: true,
      perfects: run === 0 ? 300 : 0,
      bestCombo: run === 0 ? 80 : 0,
      flowActivations: 0,
      superFlowActivations: 0,
    }, wednesday);
  }
  for (const reward of catalog[0].rewards) {
    assert.equal(store.claimWeeklyEventReward(catalog, reward.id, wednesday).claimed, true);
  }
  assert.equal(store.unlockedCosmeticIds.length, 7);
  assert.equal(store.isThemeUnlocked('neon-ascent'), true);
  const reloadedStore = new ProgressionStore(new LocalProgressStorage(storage));
  assert.equal(reloadedStore.unlockedCosmeticIds.length, 7);
  assert.equal(reloadedStore.isThemeUnlocked('neon-ascent'), true);

  console.log('Weekly event engine, rollover, inventory and claims: OK');
} finally {
  await server.close();
}
