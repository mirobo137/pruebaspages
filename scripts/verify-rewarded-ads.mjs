import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});

try {
  const { DevelopmentAdsService } = await server.ssrLoadModule(
    '/src/monetization/DevelopmentAdsService.ts',
  );
  const { UnavailableAdsService } = await server.ssrLoadModule(
    '/src/monetization/UnavailableAdsService.ts',
  );
  const { SafeRewardedAdsService } = await server.ssrLoadModule(
    '/src/monetization/RewardedAdsService.ts',
  );
  const { RewardGrantGuard, MemoryRewardGrantLedger } = await server.ssrLoadModule(
    '/src/monetization/RewardGrantGuard.ts',
  );
  const { createRewardedAdsService, readDevelopmentAdOutcome } = await server.ssrLoadModule(
    '/src/monetization/RewardedAdsFactory.ts',
  );
  const { RunCoinDoubler } = await server.ssrLoadModule(
    '/src/monetization/RunCoinDoubler.ts',
  );

  const request = {
    placement: 'double-run-coins',
    opportunityId: 'run:123:double-coins',
  };
  for (const outcome of ['rewarded', 'cancelled', 'unavailable']) {
    const service = new SafeRewardedAdsService(new DevelopmentAdsService({
      outcome,
      delayMs: 0,
    }));
    const calls = [];
    const result = await service.showRewarded(request, {
      onStarted: () => calls.push('started'),
      onFinished: () => calls.push('finished'),
    });
    assert.equal(result.status, outcome);
    assert.deepEqual(
      calls,
      outcome === 'unavailable' ? [] : ['started', 'finished'],
    );
    assert.equal(service.busy, false);
  }

  const errorService = new SafeRewardedAdsService(new DevelopmentAdsService({
    outcome: 'error',
    delayMs: 0,
  }));
  const errorCalls = [];
  assert.equal((await errorService.showRewarded(request, {
    onStarted: () => errorCalls.push('started'),
    onFinished: () => errorCalls.push('finished'),
  })).status, 'error');
  assert.deepEqual(errorCalls, ['started', 'finished']);

  let providerStarts = 0;
  const duplicateStartProvider = {
    available: true,
    async showRewarded(adRequest, lifecycle) {
      await lifecycle.onStarted();
      await lifecycle.onStarted();
      return {
        status: 'rewarded',
        placement: adRequest.placement,
        opportunityId: adRequest.opportunityId,
      };
    },
  };
  const duplicateStartService = new SafeRewardedAdsService(duplicateStartProvider);
  await duplicateStartService.showRewarded(request, {
    onStarted: () => { providerStarts += 1; },
  });
  assert.equal(providerStarts, 1);

  const unavailableService = new SafeRewardedAdsService(new UnavailableAdsService());
  let unavailableLifecycleCalled = false;
  const unavailable = await unavailableService.showRewarded(request, {
    onStarted: () => { unavailableLifecycleCalled = true; },
    onFinished: () => { unavailableLifecycleCalled = true; },
  });
  assert.equal(unavailable.status, 'unavailable');
  assert.equal(unavailableLifecycleCalled, false);

  const concurrentService = new SafeRewardedAdsService(new DevelopmentAdsService({
    outcome: 'rewarded',
    delayMs: 20,
  }));
  const firstRequest = concurrentService.showRewarded(request);
  const blocked = await concurrentService.showRewarded({
    placement: 'daily-cosmetic',
    opportunityId: 'daily:2026-08-12',
  });
  assert.equal(blocked.status, 'unavailable');
  assert.equal(blocked.errorCode, 'request-in-progress');
  assert.equal((await firstRequest).status, 'rewarded');

  const ledger = new MemoryRewardGrantLedger();
  const guard = new RewardGrantGuard(ledger);
  let granted = 0;
  assert.equal(await guard.grantOnce('run:123:double-coins', () => { granted += 1; }), true);
  assert.equal(await guard.grantOnce('run:123:double-coins', () => { granted += 1; }), false);
  assert.equal(granted, 1);

  let releaseGrant;
  const pendingGrant = guard.grantOnce('run:124:double-coins', async () => {
    await new Promise((resolve) => { releaseGrant = resolve; });
    granted += 1;
  });
  assert.equal(await guard.grantOnce('run:124:double-coins', () => { granted += 1; }), false);
  releaseGrant();
  assert.equal(await pendingGrant, true);
  assert.equal(granted, 2);

  assert.equal(readDevelopmentAdOutcome('?rewardedAd=cancelled'), 'cancelled');
  assert.equal(readDevelopmentAdOutcome('?rewardedAd=invalid'), undefined);
  const production = createRewardedAdsService({ development: false });
  assert.equal(production.available, false);
  assert.equal((await production.showRewarded(request)).status, 'unavailable');
  production.destroy();

  const grantedOpportunities = new Set();
  let bonusCoins = 0;
  const rewardedDoubler = new RunCoinDoubler(
    createRewardedAdsService({
      development: true,
      simulationOutcome: 'rewarded',
      simulationDelayMs: 0,
    }),
    (opportunityId, amount) => {
      if (grantedOpportunities.has(opportunityId)) return false;
      grantedOpportunities.add(opportunityId);
      bonusCoins += amount;
      return true;
    },
  );
  const doublingRequest = { opportunityId: 'run:9:abc', rewardCoins: 125 };
  assert.equal(await rewardedDoubler.double(doublingRequest), 'rewarded');
  assert.equal(bonusCoins, 125);
  assert.equal(await rewardedDoubler.double(doublingRequest), 'already-granted');
  assert.equal(bonusCoins, 125);

  for (const outcome of ['cancelled', 'unavailable', 'error']) {
    let incorrectlyGranted = false;
    const doubler = new RunCoinDoubler(
      createRewardedAdsService({
        development: true,
        simulationOutcome: outcome,
        simulationDelayMs: 0,
      }),
      () => { incorrectlyGranted = true; return true; },
    );
    assert.equal(await doubler.double(doublingRequest), outcome);
    assert.equal(incorrectlyGranted, false);
  }

  console.log('Rewarded ads contract, lifecycle, grant guard and coin doubling: OK');
} finally {
  await server.close();
}
