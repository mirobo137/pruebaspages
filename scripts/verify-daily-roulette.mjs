import assert from 'node:assert/strict';
import { createServer } from 'vite';

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

const server = await createServer({
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});

try {
  const {
    claimDailyRoulette,
    getDailyRouletteOffer,
    listDailyRouletteRewards,
  } = await server.ssrLoadModule('/src/retention/DailyRouletteEngine.ts');
  const { LocalProgressStorage } = await server.ssrLoadModule(
    '/src/platform/LocalProgressStorage.ts',
  );
  const { ProgressionStore } = await server.ssrLoadModule(
    '/src/progression/ProgressionStore.ts',
  );

  const rewards = listDailyRouletteRewards();
  assert.equal(rewards.reduce((sum, reward) => sum + reward.weight, 0), 100);
  assert.equal(new Set(rewards.map((reward) => reward.id)).size, rewards.length);

  const day = new Date('2026-08-18T08:15:00.000Z');
  const lateSameDay = new Date('2026-08-18T23:59:59.000Z');
  const inventory = { unlockedThemeIds: [], unlockedCosmeticIds: [] };
  const firstOffer = getDailyRouletteOffer(
    { dayKey: null, outcomeId: null, claimed: false },
    inventory,
    day,
  );
  const sameDayOffer = getDailyRouletteOffer(
    { dayKey: firstOffer.dayKey, outcomeId: firstOffer.reward.id, claimed: false },
    inventory,
    lateSameDay,
  );
  assert.equal(firstOffer.dayKey, '2026-08-18');
  assert.equal(sameDayOffer.reward.id, firstOffer.reward.id);
  assert.equal(sameDayOffer.canClaim, true);

  const claim = claimDailyRoulette(
    { dayKey: firstOffer.dayKey, outcomeId: firstOffer.reward.id, claimed: false },
    inventory,
    day,
  );
  assert.equal(claim.claimed, true);
  assert.equal(claim.progress.claimed, true);
  const duplicateClaim = claimDailyRoulette(claim.progress, inventory, day);
  assert.equal(duplicateClaim.claimed, false);
  assert.deepEqual(duplicateClaim.progress, claim.progress);

  const seenKinds = new Set();
  for (let offset = 0; offset < 1_000 && seenKinds.size < 3; offset += 1) {
    const date = new Date(day.getTime() + offset * 24 * 60 * 60 * 1000);
    const offer = getDailyRouletteOffer(
      { dayKey: null, outcomeId: null, claimed: false },
      inventory,
      date,
    );
    seenKinds.add(offer.reward.kind);
    const duplicateInventory = offer.reward.kind === 'theme'
      ? { unlockedThemeIds: [offer.reward.themeId], unlockedCosmeticIds: [] }
      : offer.reward.kind === 'component'
        ? { unlockedThemeIds: [], unlockedCosmeticIds: [`${offer.reward.themeId}:${offer.reward.slot}`] }
        : inventory;
    const resolved = claimDailyRoulette(
      { dayKey: offer.dayKey, outcomeId: offer.reward.id, claimed: false },
      duplicateInventory,
      date,
    );
    assert.equal(resolved.claimed, true);
    if (offer.reward.kind !== 'coins') {
      assert.equal(resolved.duplicate, true);
      assert.equal(resolved.coinsAwarded, offer.reward.duplicateCoins);
    }
  }
  assert.deepEqual([...seenKinds].sort(), ['coins', 'component', 'theme']);

  const storage = createMemoryStorage();
  const store = new ProgressionStore(new LocalProgressStorage(storage));
  const storeOffer = store.getDailyRoulette(day);
  assert.equal(storeOffer.canClaim, true);
  const storeClaim = store.claimDailyRoulette(day);
  assert.equal(storeClaim.claimed, true);
  assert.equal(store.getDailyRoulette(day).claimed, true);
  const reloaded = new ProgressionStore(new LocalProgressStorage(storage));
  assert.equal(reloaded.getDailyRoulette(day).claimed, true);
  assert.equal(reloaded.claimDailyRoulette(day).claimed, false);
  assert.equal(reloaded.getDailyRoulette(lateSameDay).claimed, true);

  const nextDay = new Date('2026-08-19T00:00:00.000Z');
  assert.equal(reloaded.getDailyRoulette(nextDay).claimed, false);

  console.log('Daily roulette determinism, rollover, duplicate protection and persistence: OK');
} finally {
  await server.close();
}
