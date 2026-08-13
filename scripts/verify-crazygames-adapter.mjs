import assert from 'node:assert/strict';
import { createServer } from 'vite';

function createFakeSdk(options = {}) {
  const calls = [];
  const listeners = new Set();
  const data = new Map();
  const sdk = {
    environment: options.environment ?? 'local',
    async init() { calls.push('init'); },
    ad: {
      async hasAdblock() { return options.adblock ?? false; },
      requestAd(type, callbacks) {
        calls.push(`ad:${type}`);
        if (options.startAd !== false) callbacks.adStarted?.();
        if (options.adError) callbacks.adError?.({
          code: options.adError,
          message: 'simulated',
        });
        else callbacks.adFinished?.();
      },
    },
    game: {
      settings: { muteAudio: options.muteAudio ?? false },
      addSettingsChangeListener(listener) { listeners.add(listener); },
      removeSettingsChangeListener(listener) { listeners.delete(listener); },
      loadingStart() { calls.push('loadingStart'); },
      loadingStop() { calls.push('loadingStop'); },
      gameplayStart() { calls.push('gameplayStart'); },
      gameplayStop() { calls.push('gameplayStop'); },
    },
    data: {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, value),
    },
  };
  return {
    sdk,
    calls,
    data,
    emitSettings: (settings) => {
      sdk.game.settings = settings;
      for (const listener of listeners) listener(settings);
    },
    listenerCount: () => listeners.size,
  };
}

const server = await createServer({
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});

try {
  const { detectPortalTarget } = await server.ssrLoadModule(
    '/src/platform/crazygames/CrazyGamesSdkLoader.ts',
  );
  const { createPlatformIntegration } = await server.ssrLoadModule(
    '/src/platform/PlatformIntegration.ts',
  );
  const { CrazyGamesAdsService } = await server.ssrLoadModule(
    '/src/monetization/CrazyGamesAdsService.ts',
  );
  const { SafeRewardedAdsService } = await server.ssrLoadModule(
    '/src/monetization/RewardedAdsService.ts',
  );
  const {
    CrazyGamesDataStorage,
    migrateLocalKeysToCrazyGamesData,
  } = await server.ssrLoadModule(
    '/src/platform/crazygames/CrazyGamesDataStorage.ts',
  );

  assert.equal(detectPortalTarget({
    hostname: 'localhost', search: '', development: true,
  }), 'development');
  assert.equal(detectPortalTarget({
    hostname: 'localhost', search: '?portal=crazygames', development: true,
  }), 'crazygames');
  assert.equal(detectPortalTarget({
    hostname: '192.168.1.5', search: '?useLocalSdk=true', development: true,
  }), 'crazygames');
  assert.equal(detectPortalTarget({
    hostname: 'games.crazygames.com', search: '', development: false,
  }), 'crazygames');
  assert.equal(detectPortalTarget({
    hostname: 'mirobo137.github.io', search: '?portal=crazygames', development: false,
  }), 'disabled');
  assert.equal(detectPortalTarget({
    hostname: 'example.com', search: '', development: false,
  }), 'disabled');

  const fake = createFakeSdk({ muteAudio: true });
  const muteStates = [];
  const integration = await createPlatformIntegration({
    development: true,
    hostname: 'localhost',
    search: '?portal=crazygames',
    onMuteChanged: (muted) => muteStates.push(muted),
    loadCrazyGames: async () => fake.sdk,
  });
  assert.equal(integration.game.environment, 'crazygames-local');
  assert.equal(integration.rewardedAds.available, true);
  assert.deepEqual(muteStates, [true]);
  fake.emitSettings({ muteAudio: false });
  assert.deepEqual(muteStates, [true, false]);
  integration.game.loadingStart();
  integration.game.loadingStart();
  integration.game.loadingStop();
  integration.game.gameplayStart();
  integration.game.gameplayStart();
  integration.game.gameplayStop();
  assert.deepEqual(fake.calls, [
    'init', 'loadingStart', 'loadingStop', 'gameplayStart', 'gameplayStop',
  ]);

  const lifecycle = [];
  const rewarded = await integration.rewardedAds.showRewarded({
    placement: 'daily-cosmetic',
    opportunityId: 'daily:2026-08-13:ember-beat',
  }, {
    onStarted: async () => { lifecycle.push('started'); },
    onFinished: async () => { lifecycle.push('finished'); },
  });
  assert.equal(rewarded.status, 'rewarded');
  assert.deepEqual(lifecycle, ['started', 'finished']);
  integration.game.destroy();
  assert.equal(fake.listenerCount(), 0);

  for (const code of ['unfilled', 'adCooldown']) {
    const temporary = createFakeSdk({ adError: code, startAd: false });
    const service = new SafeRewardedAdsService(new CrazyGamesAdsService(temporary.sdk));
    const result = await service.showRewarded({
      placement: 'double-run-coins', opportunityId: `run:1:${code}`,
    });
    assert.equal(result.status, 'unavailable');
    assert.equal(result.errorCode, code);
    assert.equal(service.available, true);
  }

  for (const code of ['adblock', 'adsDisabledBasicLaunch']) {
    const terminal = createFakeSdk({ adError: code, startAd: false });
    const service = new SafeRewardedAdsService(new CrazyGamesAdsService(terminal.sdk));
    const result = await service.showRewarded({
      placement: 'second-chance', opportunityId: `game:1:${code}`,
    });
    assert.equal(result.status, 'unavailable');
    assert.equal(result.errorCode, code);
    assert.equal(service.available, false);
  }

  const failed = createFakeSdk({ adError: 'other' });
  const failedLifecycle = [];
  const failedService = new SafeRewardedAdsService(new CrazyGamesAdsService(failed.sdk));
  const failedResult = await failedService.showRewarded({
    placement: 'second-chance', opportunityId: 'game:2:other',
  }, {
    onStarted: () => { failedLifecycle.push('started'); },
    onFinished: () => { failedLifecycle.push('finished'); },
  });
  assert.equal(failedResult.status, 'error');
  assert.deepEqual(failedLifecycle, ['started', 'finished']);

  let crazyLoaderCalled = false;
  const pages = await createPlatformIntegration({
    development: false,
    hostname: 'mirobo137.github.io',
    search: '?portal=crazygames',
    onMuteChanged: () => {},
    loadCrazyGames: async () => {
      crazyLoaderCalled = true;
      return fake.sdk;
    },
  });
  assert.equal(crazyLoaderCalled, false);
  assert.equal(pages.rewardedAds.available, false);
  assert.equal(pages.game.environment, 'disabled');

  const localValues = new Map([
    ['superflow:progress:v3', 'primary'],
    ['superflow:progress:v3:backup', 'backup'],
  ]);
  const local = { getItem: (key) => localValues.get(key) ?? null };
  const remote = createFakeSdk();
  remote.data.set('superflow:progress:v3:backup', 'existing');
  assert.equal(migrateLocalKeysToCrazyGamesData(
    local,
    remote.sdk.data,
    ['superflow:progress:v3', 'superflow:progress:v3:backup'],
  ), 1);
  const dataStorage = new CrazyGamesDataStorage(remote.sdk.data);
  assert.equal(dataStorage.getItem('superflow:progress:v3'), 'primary');
  dataStorage.setItem('test', 'saved');
  assert.equal(remote.data.get('test'), 'saved');

  console.log('CrazyGames v3 environment, rewarded callbacks, errors and data bridge: OK');
} finally {
  await server.close();
}

