import assert from 'node:assert/strict';
import { createServer } from 'vite';

const V2_CONTEXT = 'superflow-local-progress-2026';

function checksum(payload, context) {
  const value = `${context}:${payload}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function createEnvelope(state, context) {
  const payload = encodeBase64(JSON.stringify(state));
  return JSON.stringify({ format: 1, payload, checksum: checksum(payload, context) });
}

function decodeEnvelope(stored) {
  const envelope = JSON.parse(stored);
  const binary = atob(envelope.payload);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    values,
  };
}

const server = await createServer({
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});

try {
  const { LocalProgressStorage } = await server.ssrLoadModule(
    '/src/platform/LocalProgressStorage.ts',
  );
  const { ProgressionStore } = await server.ssrLoadModule(
    '/src/progression/ProgressionStore.ts',
  );
  const { createEmptyProgressState } = await server.ssrLoadModule(
    '/src/progression/ProgressionTypes.ts',
  );

  const v2State = {
    version: 2,
    coins: 875,
    unlockedTrackIds: ['premium-song'],
    totalRuns: 2,
    menuPreferences: { selectedTrackId: 'premium-song', difficulty: 'hard' },
    records: {
      'premium-song': {
        hard: {
          stars: 3,
          highScore: 12345,
          bestCombo: 44,
          bestAccuracy: 0.96,
          bestPerfects: 38,
          fewestMisses: 1,
          attempts: 5,
          completions: 3,
          bestFlowActivations: 2,
          bestSuperFlowActivations: 1,
          lastPlayedAt: 1700000000000,
        },
      },
    },
  };
  const migrationStorage = createMemoryStorage({
    'superflow:progress:v2': createEnvelope(v2State, V2_CONTEXT),
    'superflow:visual-theme:v1': JSON.stringify({
      version: 1,
      themeId: 'cyber-sakura',
    }),
  });
  const migratedStore = new ProgressionStore(new LocalProgressStorage(migrationStorage));
  assert.equal(migratedStore.coins, 875);
  assert.equal(migratedStore.totalRuns, 2);
  assert.equal(migratedStore.menuPreferences.selectedTrackId, 'premium-song');
  assert.equal(migratedStore.menuPreferences.difficulty, 'hard');
  assert.equal(migratedStore.isTrackUnlocked('premium-song', 1400), true);
  assert.equal(migratedStore.getRecord('premium-song', 'hard')?.stars, 3);
  assert.equal(migratedStore.getRecord('premium-song', 'hard')?.highScore, 12345);
  assert.equal(migratedStore.equippedThemeId, 'cyber-sakura');
  assert.equal(migratedStore.isThemeUnlocked('cyber-sakura'), true);
  const migratedRaw = migrationStorage.getItem('superflow:progress:v3');
  assert.ok(migratedRaw);
  const migratedState = decodeEnvelope(migratedRaw);
  assert.equal(migratedState.version, 3);
  assert.deepEqual(migratedState.weeklyEvent.missionProgress, {});
  assert.deepEqual(migratedState.rewardedLimits.usedRewardIds, []);
  assert.deepEqual(migratedState.customization.unlockedCosmeticIds, []);

  const deletedThemeStorage = createMemoryStorage();
  const deletedThemeState = createEmptyProgressState();
  deletedThemeState.customization = {
    unlockedThemeIds: ['removed-theme'],
    unlockedCosmeticIds: ['neon-ascent-2026:target-palette'],
    equippedThemeId: 'removed-theme',
  };
  new LocalProgressStorage(deletedThemeStorage).save(deletedThemeState);
  const repairedStore = new ProgressionStore(new LocalProgressStorage(deletedThemeStorage));
  assert.equal(repairedStore.equippedThemeId, 'neon-pulse');
  assert.equal(repairedStore.isThemeUnlocked('removed-theme'), false);
  assert.equal(repairedStore.isThemeUnlocked('cyber-sakura'), true);
  assert.deepEqual(repairedStore.unlockedCosmeticIds, ['neon-ascent-2026:target-palette']);

  const backupStorage = createMemoryStorage();
  const backupService = new LocalProgressStorage(backupStorage);
  const firstState = createEmptyProgressState();
  firstState.coins = 100;
  backupService.save(firstState);
  const secondState = createEmptyProgressState();
  secondState.coins = 200;
  backupService.save(secondState);
  backupStorage.setItem('superflow:progress:v3', '{corrupt');
  assert.equal(new LocalProgressStorage(backupStorage).load().coins, 100);

  const unlockStorage = createMemoryStorage();
  const unlockState = createEmptyProgressState();
  unlockState.totalRuns = 3;
  new LocalProgressStorage(unlockStorage).save(unlockState);
  const unlockStore = new ProgressionStore(new LocalProgressStorage(unlockStorage));
  assert.equal(unlockStore.isThemeUnlocked('solar-flux'), true);
  assert.equal(unlockStore.equipTheme('solar-flux'), true);
  assert.equal(
    new ProgressionStore(new LocalProgressStorage(unlockStorage)).equippedThemeId,
    'solar-flux',
  );

  console.log('Progress v2 -> v3 migration and recovery: OK');
} finally {
  await server.close();
}
