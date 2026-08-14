import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
import { readMp3Duration } from './lib/mp3-duration.mjs';
import { validateBeatmapV2 } from './lib/music-contract-validation.mjs';

const pilotId = 'untitled-0f61f35777';
const pilotDuration = 124.872;
const server = await createServer({
  configFile: false,
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});

try {
  const { adaptBeatmapV1 } = await server.ssrLoadModule(
    '/src/content/beatmap/BeatmapV1Adapter.ts',
  );
  const { adaptBeatmapV2 } = await server.ssrLoadModule(
    '/src/content/beatmap/BeatmapV2Adapter.ts',
  );
  const { findPhaseIndexAtTime } = await server.ssrLoadModule(
    '/src/game/beatmap/PhaseTimeline.ts',
  );
  const { createBeatmapPlaybackOptions } = await server.ssrLoadModule(
    '/src/audio/BeatmapPlaybackPlan.ts',
  );
  const { BeatmapPlayer } = await server.ssrLoadModule(
    '/src/game/beatmap/BeatmapPlayer.ts',
  );

  const maps = [];
  for (const difficulty of ['easy', 'medium', 'hard']) {
    const document = JSON.parse(await readFile(path.join(
      'public', 'assets', 'beatmaps', pilotId, `${difficulty}.json`,
    ), 'utf8'));
    validateBeatmapV2(document);
    const beatmap = adaptBeatmapV2(document);
    assert.equal(beatmap.audioMode, 'single');
    assert.equal(beatmap.loopDuration, null);
    assert.equal(beatmap.duration, pilotDuration);
    assert.deepEqual(beatmap.phases.map((phase) => phase.startTime), [0, 34, 82]);
    maps.push(beatmap);
  }
  assert.ok(maps[0].events.length < maps[1].events.length);
  assert.ok(maps[1].events.length < maps[2].events.length);

  const pilot = maps[1];
  assert.equal(findPhaseIndexAtTime(pilot.phases, 33.999), 0);
  assert.equal(findPhaseIndexAtTime(pilot.phases, 34), 1);
  assert.equal(findPhaseIndexAtTime(pilot.phases, 82), 2);
  assert.equal(findPhaseIndexAtTime(pilot.phases, 999), 2);

  const initialPlayback = createBeatmapPlaybackOptions(pilot, 0);
  assert.deepEqual(initialPlayback, {
    loop: false,
    startOffset: 0,
    clipDuration: pilotDuration,
    timelineOffset: 0,
  });
  const revivedPlayback = createBeatmapPlaybackOptions(pilot, 82);
  assert.deepEqual(revivedPlayback, {
    loop: false,
    startOffset: 82,
    clipDuration: 42.872,
    timelineOffset: 82,
  });
  assert.equal('loopDuration' in revivedPlayback, false);
  assert.equal('playbackDuration' in revivedPlayback, false);

  const player = new BeatmapPlayer(pilot);
  player.seek(82);
  const climaxEvents = player.collectUpcomingEvents(82, 5);
  assert.ok(climaxEvents.length > 0);
  assert.equal(climaxEvents.every((event) => event.phaseIndex === 2), true);

  const legacyDocument = JSON.parse(await readFile(
    'public/assets/beatmaps/chrono-echo-bloom/easy.json',
    'utf8',
  ));
  const legacy = adaptBeatmapV1(legacyDocument);
  assert.equal(legacy.audioMode, 'loop');
  assert.equal(legacy.duration, 90);
  assert.deepEqual(createBeatmapPlaybackOptions(legacy, 60), {
    loop: true,
    loopDuration: 30,
    playbackDuration: 30,
    startOffset: 0,
    timelineOffset: 60,
  });

  const measured = await readMp3Duration(
    'public/assets/audio/selectas/untitled-0f61f35777.mp3',
  );
  assert.ok(Math.abs(measured.duration - pilotDuration) < 0.001);

  const manifest = JSON.parse(await readFile('public/assets/music-manifest.json', 'utf8'));
  const pilotTrack = manifest.find((track) => track.id === pilotId);
  assert.equal(pilotTrack.title, 'Suno Pilot 01');
  assert.equal(pilotTrack.priceTier, 'select');
  assert.equal(pilotTrack.price, 800);

  console.log(
    `Beatmap v2 single: ${pilotDuration}s, fases 34/82, revive, `
    + `${maps.map((map) => map.events.length).join('/')} notas y legado v1: OK`,
  );
} finally {
  await server.close();
}
