import assert from 'node:assert/strict';
import { createServer } from 'vite';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
}

const server = await createServer({
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});

try {
  const { LocalTelemetrySink, TELEMETRY_STORAGE_KEY } = await server.ssrLoadModule(
    '/src/analytics/LocalTelemetrySink.ts',
  );
  const { TelemetryService } = await server.ssrLoadModule(
    '/src/analytics/TelemetryService.ts',
  );
  const { PokiTelemetrySink } = await server.ssrLoadModule(
    '/src/analytics/PokiTelemetrySink.ts',
  );
  const { resolveReleaseConfig } = await server.ssrLoadModule(
    '/src/platform/ReleaseConfig.ts',
  );

  const storage = new MemoryStorage();
  const local = new LocalTelemetrySink(storage);
  let now = Date.parse('2026-08-12T10:00:00.000Z');
  const captured = [];
  const telemetry = new TelemetryService([
    local,
    { track: (record) => captured.push(record) },
    { track: () => { throw new Error('sink failure'); } },
  ], storage, () => now);
  telemetry.startSession(new Date(now));
  telemetry.trackOnce('event-visible', {
    type: 'weekly_event_visible', eventId: 'neon-ascent',
  });
  telemetry.trackOnce('event-visible', {
    type: 'weekly_event_visible', eventId: 'neon-ascent',
  });
  assert.deepEqual(captured.map((record) => record.event.type), [
    'session_started', 'weekly_event_visible',
  ]);

  now = Date.parse('2026-08-14T09:00:00.000Z');
  const nextSession = new TelemetryService([local], storage, () => now);
  nextSession.startSession(new Date(now));
  const sessionEvents = local.snapshot().slice(-2).map((record) => record.event);
  assert.equal(sessionEvents[0].type, 'session_started');
  assert.equal(sessionEvents[1].type, 'daily_return');
  assert.equal(sessionEvents[1].daysSinceLastVisit, 2);

  for (let index = 0; index < 240; index += 1) {
    nextSession.track({
      type: 'song_started', trackId: `track-${index}`, difficulty: 'easy',
    });
  }
  assert.equal(local.snapshot().length, 200);
  assert.ok(storage.getItem(TELEMETRY_STORAGE_KEY).includes('track-239'));
  assert.ok(TELEMETRY_STORAGE_KEY.startsWith('poki_ignore'));

  const pokiCalls = [];
  const poki = new PokiTelemetrySink({
    measure: (...args) => pokiCalls.push(args),
  });
  const pokiEvents = [
    { type: 'song_started', trackId: 'Neon Song', difficulty: 'hard' },
    { type: 'song_finished', trackId: 'Neon Song', difficulty: 'hard', completed: true, stars: 3, score: 5000 },
    { type: 'rewarded_offer_visible', placement: 'second-chance' },
    { type: 'rewarded_offer_interacted', placement: 'second-chance' },
    { type: 'rewarded_offer_outcome', placement: 'second-chance', outcome: 'rewarded' },
    { type: 'weekly_event_progressed', eventId: 'event', points: 100 },
  ];
  for (const event of pokiEvents) poki.track({ at: now, event });
  assert.deepEqual(pokiCalls, [
    ['song', 'neon-song-hard', 'start'],
    ['song', 'neon-song-hard', 'complete'],
    ['rewarded', 'second-chance', 'visible'],
    ['rewarded', 'second-chance', 'interact'],
  ]);

  assert.deepEqual(resolveReleaseConfig('disabled', '?rewardedAds=on'), {
    channel: 'disabled',
    rewardedAds: false,
    rewardedRevive: false,
    rewardedCoinDouble: false,
    rewardedDailyCosmetic: false,
  });
  assert.deepEqual(resolveReleaseConfig(
    'development',
    '?rewardedRevive=off&rewardedDailyCosmetic=off',
  ), {
    channel: 'development',
    rewardedAds: true,
    rewardedRevive: false,
    rewardedCoinDouble: true,
    rewardedDailyCosmetic: false,
  });
  assert.equal(resolveReleaseConfig('poki-local', '?rewardedAds=off').rewardedAds, false);
  assert.equal(resolveReleaseConfig('poki', '?rewardedAds=off').rewardedAds, true);

  console.log('Bounded local telemetry, daily return, Poki mapping and release flags: OK');
} finally {
  await server.close();
}
