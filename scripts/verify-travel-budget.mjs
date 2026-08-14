import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});

try {
  const { TravelBudget, deterministicNormalizedPoint } = await server.ssrLoadModule(
    '/src/input/TravelBudget.ts',
  );
  const { calculateTargetPlayfield, pointInTargetPlayfield } = await server.ssrLoadModule(
    '/src/input/PlayfieldLayout.ts',
  );
  const { DIFFICULTIES, DIFFICULTY_PROFILES } = await server.ssrLoadModule(
    '/src/game/difficulty/Difficulty.ts',
  );

  assert.deepEqual(
    deterministicNormalizedPoint(12.5, 2, 1),
    deterministicNormalizedPoint(12.5, 2, 1),
  );

  const manifest = JSON.parse(await readFile('public/assets/music-manifest.json', 'utf8'));
  const environments = [
    { mode: 'mouse', width: 3102, height: 1440 },
    { mode: 'touch', width: 390, height: 844 },
    { mode: 'pen', width: 430, height: 932 },
  ];
  let validatedMaps = 0;

  for (const track of manifest) {
    for (const difficulty of DIFFICULTIES) {
      const document = JSON.parse(await readFile(path.join(
        'public', 'assets', 'beatmaps', track.id, `${difficulty}.json`,
      ), 'utf8'));
      const events = expandEvents(document);

      for (const environment of environments) {
        const bounds = calculateTargetPlayfield(
          environment.width,
          environment.height,
          environment.mode,
        );
        const budget = new TravelBudget(difficulty);
        let previous = null;
        let previousDirection = null;

        for (const event of events) {
          const desiredStart = pointInTargetPlayfield(event.start, bounds);
          const start = budget.projectHead(
            desiredStart,
            event.time,
            bounds,
            environment.mode,
          );
          if (environment.mode === 'mouse' && previous) {
            const distance = pointDistance(previous.point, start);
            const available = Math.max(0, event.time - previous.readyTime);
            assert.ok(
              distance <= Math.min(
                budget.profile.maximumHeadDistance,
                budget.profile.maximumHeadSpeed * available,
              ) + 0.01,
              `${track.id}/${difficulty}: head travel exceeded`,
            );
            const direction = unit(start.x - previous.point.x, start.y - previous.point.y);
            if (direction && previousDirection) {
              assert.ok(
                angleBetween(previousDirection, direction)
                  <= budget.profile.maximumTurnRadians + 0.01,
                `${track.id}/${difficulty}: turn exceeded`,
              );
            }
          } else if (environment.mode !== 'mouse') {
            assert.deepEqual(start, desiredStart);
          }

          let drag;
          if (event.kind === 'drag') {
            const desiredEnd = pointInTargetPlayfield(event.end, bounds);
            const end = budget.projectDragEnd(
              start,
              desiredEnd,
              bounds,
              environment.mode,
            );
            const relative = budget.limitDragAnchors([
              { x: end.x - start.x, y: end.y - start.y },
            ], environment.mode);
            const final = {
              x: start.x + relative[0].x,
              y: start.y + relative[0].y,
            };
            const length = pointDistance(start, final);
            if (environment.mode === 'mouse') {
              assert.ok(length <= budget.profile.maximumDragLength + 0.01);
            } else {
              assert.deepEqual(final, desiredEnd);
            }
            drag = {
              end: final,
              length,
              completionTimeSeconds: DIFFICULTY_PROFILES[difficulty].dragCompletionTime,
            };
          }

          const nextDirection = drag
            ? unit(drag.end.x - start.x, drag.end.y - start.y)
            : previous
              ? unit(start.x - previous.point.x, start.y - previous.point.y)
              : null;
          budget.commit(event.time, start, environment.mode, drag);
          if (environment.mode === 'mouse') {
            const dragDuration = drag
              ? Math.min(
                  drag.completionTimeSeconds,
                  drag.length / budget.profile.comfortableDragSpeed,
                )
              : 0;
            previous = {
              point: drag?.end ?? start,
              readyTime: event.time + dragDuration
                + (drag ? budget.profile.postDragRestSeconds : 0),
            };
            if (nextDirection) previousDirection = nextDirection;
          }
        }
      }
      validatedMaps += 1;
    }
  }

  console.log(`Travel, turn, drag and recovery budgets across ${validatedMaps} beatmaps: OK`);
} finally {
  await server.close();
}

function expandEvents(document) {
  if (document.schemaVersion === 2) {
    const phaseIndexById = new Map(
      document.phases.map((phase, index) => [phase.id, index]),
    );
    return document.events.map((event) => ({
      ...event,
      phaseIndex: phaseIndexById.get(event.phaseId),
    }));
  }
  const events = [];
  const loopDuration = Math.max(1, document.loopDuration);
  const grid = Math.max(0.05, document.grid);
  document.phases.forEach((phase, phaseIndex) => {
    let localTime = Math.max(phaseIndex === 0 ? 0 : 1.5, phase.offset ?? grid);
    let patternIndex = 0;
    while (localTime < loopDuration - 0.05) {
      const event = phase.pattern[patternIndex % phase.pattern.length];
      events.push({ ...event, phaseIndex, time: phaseIndex * loopDuration + localTime });
      localTime += grid * Math.max(1, event.gap ?? 1);
      patternIndex += 1;
    }
  });
  return events;
}

function pointDistance(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function unit(x, y) {
  const length = Math.hypot(x, y);
  return length > 0.001 ? { x: x / length, y: y / length } : null;
}

function angleBetween(left, right) {
  return Math.acos(Math.max(-1, Math.min(1, left.x * right.x + left.y * right.y)));
}
