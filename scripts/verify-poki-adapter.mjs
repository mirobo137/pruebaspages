import assert from 'node:assert/strict';
import { createServer } from 'vite';

function createFakeSdk(options = {}) {
  const calls = [];
  const rewardOptions = [];
  const sdk = {
    async init() { calls.push('init'); },
    gameLoadingFinished() { calls.push('gameLoadingFinished'); },
    gameplayStart() { calls.push('gameplayStart'); },
    gameplayStop() { calls.push('gameplayStop'); },
    measure(category, what, action) { calls.push(`measure:${category}:${what}:${action}`); },
    async rewardedBreak(config) {
      calls.push('rewardedBreak');
      rewardOptions.push(config);
      if (options.startAd !== false) config?.onStart?.();
      if (options.error) throw new Error(options.error);
      return options.rewarded ?? true;
    },
  };
  return { sdk, calls, rewardOptions };
}

const server = await createServer({
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});

try {
  const { detectPortalTarget } = await server.ssrLoadModule(
    '/src/platform/PortalTarget.ts',
  );
  const { createPlatformIntegration } = await server.ssrLoadModule(
    '/src/platform/PlatformIntegration.ts',
  );
  const { PokiAdsService } = await server.ssrLoadModule(
    '/src/monetization/PokiAdsService.ts',
  );
  const { SafeRewardedAdsService } = await server.ssrLoadModule(
    '/src/monetization/RewardedAdsService.ts',
  );

  assert.equal(detectPortalTarget({
    hostname: 'localhost', search: '?portal=poki', development: true,
  }), 'poki');
  assert.equal(detectPortalTarget({
    hostname: '192.168.1.5', search: '?useLocalPokiSdk=true', development: true,
  }), 'poki');
  assert.equal(detectPortalTarget({
    hostname: 'game.poki.com', search: '', development: false,
  }), 'poki');
  assert.equal(detectPortalTarget({
    hostname: 'cdn.poki-gdn.com', search: '', development: false,
  }), 'poki');
  assert.equal(detectPortalTarget({
    hostname: 'inspector.poki.dev', search: '', development: false,
  }), 'poki');
  assert.equal(detectPortalTarget({
    hostname: 'mirobo137.github.io', search: '?portal=poki', development: false,
  }), 'disabled');

  const fake = createFakeSdk();
  const integration = await createPlatformIntegration({
    development: true,
    hostname: 'localhost',
    search: '?portal=poki',
    onMuteChanged: () => {},
    loadPoki: async () => fake.sdk,
  });
  assert.equal(integration.game.environment, 'poki-local');
  assert.equal(integration.rewardedAds.available, true);
  integration.game.loadingStart();
  integration.game.loadingStart();
  integration.game.loadingStop();
  integration.game.loadingStop();
  integration.game.gameplayStart();
  integration.game.gameplayStart();
  integration.game.gameplayStop();
  integration.game.gameplayStop();
  assert.deepEqual(fake.calls, [
    'init', 'gameLoadingFinished', 'gameplayStart', 'gameplayStop',
  ]);
  integration.telemetry.track({
    at: Date.now(),
    event: { type: 'rewarded_offer_visible', placement: 'second-chance' },
  });
  assert.equal(fake.calls.at(-1), 'measure:rewarded:second-chance:visible');

  const lifecycle = [];
  const rewarded = await integration.rewardedAds.showRewarded({
    placement: 'second-chance',
    opportunityId: 'game:1:phase:0',
  }, {
    onStarted: () => { lifecycle.push('started'); },
    onFinished: () => { lifecycle.push('finished'); },
  });
  assert.equal(rewarded.status, 'rewarded');
  assert.deepEqual(lifecycle, ['started', 'finished']);
  assert.equal(fake.rewardOptions[0].size, 'large');

  const declined = createFakeSdk({ rewarded: false });
  const declinedLifecycle = [];
  const declinedService = new SafeRewardedAdsService(new PokiAdsService(declined.sdk));
  const declinedResult = await declinedService.showRewarded({
    placement: 'double-run-coins', opportunityId: 'run:1',
  }, {
    onStarted: () => { declinedLifecycle.push('started'); },
    onFinished: () => { declinedLifecycle.push('finished'); },
  });
  assert.equal(declinedResult.status, 'cancelled');
  assert.deepEqual(declinedLifecycle, ['started', 'finished']);
  assert.equal(declined.rewardOptions[0].size, 'medium');

  const unavailable = createFakeSdk({ rewarded: false, startAd: false });
  const unavailableLifecycle = [];
  const unavailableService = new SafeRewardedAdsService(new PokiAdsService(unavailable.sdk));
  const unavailableResult = await unavailableService.showRewarded({
    placement: 'daily-cosmetic', opportunityId: 'daily:1',
  }, {
    onStarted: () => { unavailableLifecycle.push('started'); },
    onFinished: () => { unavailableLifecycle.push('finished'); },
  });
  assert.equal(unavailableResult.status, 'cancelled');
  assert.deepEqual(unavailableLifecycle, []);

  const failed = createFakeSdk({ error: 'simulated-poki-error' });
  const failedLifecycle = [];
  const failedService = new SafeRewardedAdsService(new PokiAdsService(failed.sdk));
  const failedResult = await failedService.showRewarded({
    placement: 'daily-cosmetic', opportunityId: 'daily:2',
  }, {
    onStarted: () => { failedLifecycle.push('started'); },
    onFinished: () => { failedLifecycle.push('finished'); },
  });
  assert.equal(failedResult.status, 'error');
  assert.equal(failedResult.errorCode, 'simulated-poki-error');
  assert.deepEqual(failedLifecycle, ['started', 'finished']);

  let pokiLoaderCalled = false;
  const pages = await createPlatformIntegration({
    development: false,
    hostname: 'mirobo137.github.io',
    search: '?portal=poki',
    onMuteChanged: () => {},
    loadPoki: async () => {
      pokiLoaderCalled = true;
      return fake.sdk;
    },
  });
  assert.equal(pokiLoaderCalled, false);
  assert.equal(pages.rewardedAds.available, false);
  assert.equal(pages.game.environment, 'disabled');

  integration.game.destroy();
  integration.rewardedAds.destroy();
  console.log('Poki v2 detection, lifecycle, rewarded mapping and fallback: OK');
} finally {
  await server.close();
}
