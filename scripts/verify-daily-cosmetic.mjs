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
    DAILY_COSMETIC_COIN_PRICE,
    getDailyRewardedThemeOffer,
    getUtcDayKey,
    listRewardedThemeDefinitions,
  } = await server.ssrLoadModule('/src/customization/RewardedThemeCatalog.ts');
  const { LocalProgressStorage } = await server.ssrLoadModule(
    '/src/platform/LocalProgressStorage.ts',
  );
  const { ProgressionStore } = await server.ssrLoadModule(
    '/src/progression/ProgressionStore.ts',
  );
  const { createEmptyProgressState } = await server.ssrLoadModule(
    '/src/progression/ProgressionTypes.ts',
  );
  const { createRewardedAdsService } = await server.ssrLoadModule(
    '/src/monetization/RewardedAdsFactory.ts',
  );
  const { DailyCosmeticUnlocker } = await server.ssrLoadModule(
    '/src/monetization/DailyCosmeticUnlocker.ts',
  );

  const dayOne = new Date('2026-08-12T08:15:00.000Z');
  const sameUtcDay = new Date('2026-08-12T23:59:59.000Z');
  const dayTwo = new Date('2026-08-13T00:00:00.000Z');
  const offerOne = getDailyRewardedThemeOffer(dayOne);
  assert.equal(getUtcDayKey(dayOne), '2026-08-12');
  assert.equal(getDailyRewardedThemeOffer(sameUtcDay).theme.id, offerOne.theme.id);
  assert.notEqual(getDailyRewardedThemeOffer(dayTwo).theme.id, offerOne.theme.id);
  assert.equal(listRewardedThemeDefinitions().length, 3);
  assert.equal(offerOne.coinPrice, 1_200);

  const storage = createMemoryStorage();
  const progressStorage = new LocalProgressStorage(storage);
  const store = new ProgressionStore(progressStorage);
  const initial = store.getDailyRewardedTheme(dayOne);
  assert.equal(initial.owned, false);
  assert.equal(initial.claimedToday, false);
  assert.equal(initial.canAfford, false);
  assert.equal(
    store.tryGrantDailyRewardedTheme(
      initial.theme.id,
      initial.opportunityId,
      dayOne,
    ),
    true,
  );
  assert.equal(store.isThemeUnlocked(initial.theme.id), true);
  assert.equal(store.getDailyRewardedTheme(dayOne).claimedToday, true);
  assert.equal(
    store.tryGrantDailyRewardedTheme(
      initial.theme.id,
      initial.opportunityId,
      dayOne,
    ),
    false,
  );
  const reloaded = new ProgressionStore(new LocalProgressStorage(storage));
  assert.equal(reloaded.isThemeUnlocked(initial.theme.id), true);
  assert.equal(reloaded.getDailyRewardedTheme(dayOne).claimedToday, true);
  assert.equal(reloaded.getDailyRewardedTheme(dayTwo).claimedToday, false);

  const purchaseStorage = createMemoryStorage();
  const purchaseProgressStorage = new LocalProgressStorage(purchaseStorage);
  const purchaseState = createEmptyProgressState();
  purchaseState.coins = DAILY_COSMETIC_COIN_PRICE;
  purchaseProgressStorage.save(purchaseState);
  const buyer = new ProgressionStore(purchaseProgressStorage);
  const purchaseOffer = buyer.getDailyRewardedTheme(dayOne);
  assert.equal(purchaseOffer.canAfford, true);
  assert.equal(buyer.tryBuyDailyRewardedTheme(purchaseOffer.theme.id, dayOne), true);
  assert.equal(buyer.coins, 0);
  assert.equal(buyer.isThemeUnlocked(purchaseOffer.theme.id), true);
  assert.equal(buyer.tryBuyDailyRewardedTheme(purchaseOffer.theme.id, dayOne), false);

  for (const outcome of ['cancelled', 'unavailable', 'error']) {
    let granted = false;
    const unlocker = new DailyCosmeticUnlocker(
      createRewardedAdsService({
        development: true,
        simulationOutcome: outcome,
        simulationDelayMs: 0,
      }),
      () => { granted = true; return true; },
    );
    assert.equal(await unlocker.unlock(offerOne), outcome);
    assert.equal(granted, false);
  }

  let grantCount = 0;
  const unlocker = new DailyCosmeticUnlocker(
    createRewardedAdsService({
      development: true,
      simulationOutcome: 'rewarded',
      simulationDelayMs: 0,
    }),
    () => { grantCount += 1; return grantCount === 1; },
  );
  assert.equal(await unlocker.unlock(offerOne), 'rewarded');
  assert.equal(await unlocker.unlock(offerOne), 'already-granted');
  assert.equal(grantCount, 2);

  console.log('Daily cosmetic rotation, permanent unlock and daily limits: OK');
} finally {
  await server.close();
}

