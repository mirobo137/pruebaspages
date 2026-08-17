import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
import { readMp3Duration } from './lib/mp3-duration.mjs';
import { validateBeatmapV2 } from './lib/music-contract-validation.mjs';

const metadataDocuments = await Promise.all(
  (await readdir('content/music/metadata'))
    .filter((fileName) => fileName.endsWith('.json'))
    .map((fileName) => readFile(`content/music/metadata/${fileName}`, 'utf8').then(JSON.parse)),
);
const pilotMetadata = metadataDocuments.find((metadata) => (
  metadata.trackId.endsWith('-0f61f35777')
));
assert.ok(pilotMetadata, 'no se encontró la pista piloto estable para la prueba de playback');
const pilotId = pilotMetadata.trackId;
const pilotDuration = pilotMetadata.durationSeconds;
const manifest = JSON.parse(await readFile('public/assets/music-manifest.json', 'utf8'));
const pilotTrack = manifest.find((track) => track.id === pilotId);
assert.ok(pilotTrack, `el piloto ${pilotId} no aparece en el manifest`);
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
  const { isBeatmapJsonContentType } = await server.ssrLoadModule(
    '/src/content/Beatmap.ts',
  );
  assert.equal(isBeatmapJsonContentType('application/json'), true);
  assert.equal(isBeatmapJsonContentType('application/json; charset=utf-8'), true);
  assert.equal(isBeatmapJsonContentType('text/html'), false);
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
    assert.equal(beatmap.phases[0].startTime, 0);
    assert.equal(beatmap.phases.length, 3);
    maps.push(beatmap);
  }
  assert.ok(maps[0].events.length < maps[1].events.length);
  assert.ok(maps[1].events.length < maps[2].events.length);

  const pilot = maps[1];
  const driveStart = pilot.phases[1].startTime;
  const climaxStart = pilot.phases[2].startTime;
  assert.equal(findPhaseIndexAtTime(pilot.phases, driveStart - 0.001), 0);
  assert.equal(findPhaseIndexAtTime(pilot.phases, driveStart), 1);
  assert.equal(findPhaseIndexAtTime(pilot.phases, climaxStart), 2);
  assert.equal(findPhaseIndexAtTime(pilot.phases, 999), 2);

  const initialPlayback = createBeatmapPlaybackOptions(pilot, 0);
  assert.deepEqual(initialPlayback, {
    loop: false,
    startOffset: 0,
    clipDuration: pilotDuration,
    timelineOffset: 0,
  });
  const revivedPlayback = createBeatmapPlaybackOptions(pilot, climaxStart);
  assert.deepEqual(revivedPlayback, {
    loop: false,
    startOffset: climaxStart,
    clipDuration: pilotDuration - climaxStart,
    timelineOffset: climaxStart,
  });
  assert.equal('loopDuration' in revivedPlayback, false);
  assert.equal('playbackDuration' in revivedPlayback, false);

  const player = new BeatmapPlayer(pilot);
  player.seek(climaxStart);
  const climaxEvents = player.collectUpcomingEvents(climaxStart, 5);
  assert.ok(climaxEvents.length > 0);
  assert.equal(climaxEvents.every((event) => event.phaseIndex === 2), true);

  const legacyDocument = {
    trackId: 'legacy-fixture',
    difficulty: 'easy',
    loopDuration: 30,
    grid: 0.75,
    phases: [
      { name: 'READ', pattern: [{ kind: 'tap', start: { x: .2, y: .2 }, gap: 1 }] },
      { name: 'DRIVE', pattern: [{ kind: 'tap', start: { x: .5, y: .5 }, gap: 1 }] },
      { name: 'CLIMAX', pattern: [{ kind: 'tap', start: { x: .8, y: .8 }, gap: 1 }] },
    ],
  };
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
    `public/assets/audio/${pilotTrack.audioPath.replace('./assets/audio/', '')}`,
  );
  // libsndfile/librosa y las cabeceras de frames MP3 pueden diferir unas pocas frames.
  assert.ok(Math.abs(measured.duration - pilotDuration) < 0.1);

  assert.equal(typeof pilotTrack.title, 'string');
assert.ok(['free', 'economy', 'select', 'premium'].includes(pilotTrack.priceTier));
assert.ok(Number.isSafeInteger(pilotTrack.price) && pilotTrack.price >= 0);

  console.log(
    `Beatmap v2 single: ${pilotDuration}s, fases 34/82, revive, `
    + `${maps.map((map) => map.events.length).join('/')} notas y legado v1: OK`,
  );
} finally {
  await server.close();
}
