const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const FORBIDDEN_DEVICE_KEYS = /^(mouse|touch|pen|mobile|desktop|pixel|pixels|px|dpr|viewport|iframe|device|inputProfile)$/i;

function fail(path, message) {
  throw new Error(`${path}: ${message}`);
}

function object(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(path, 'debe ser un objeto');
  }
}

function exactKeys(value, allowed, path) {
  object(value, path);
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_DEVICE_KEYS.test(key)) {
      fail(`${path}.${key}`, 'no se permiten ramas por dispositivo ni pixeles');
    }
    if (!allowed.includes(key)) fail(`${path}.${key}`, 'propiedad no permitida');
  }
}

function required(value, keys, path) {
  for (const key of keys) {
    if (!(key in value)) fail(path, `falta ${key}`);
  }
}

function id(value, path) {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) fail(path, 'ID invalido');
}

function string(value, path) {
  if (typeof value !== 'string' || value.length === 0) fail(path, 'texto vacio o invalido');
}

function number(value, path, minimum = 0, maximum = Number.POSITIVE_INFINITY) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    fail(path, `numero fuera de ${minimum}..${maximum}`);
  }
}

function position(value, path) {
  exactKeys(value, ['x', 'y'], path);
  required(value, ['x', 'y'], path);
  number(value.x, `${path}.x`, 0, 1);
  number(value.y, `${path}.y`, 0, 1);
}

export function validateBeatmapV2(document) {
  const path = 'beatmap';
  const allowed = [
    'schemaVersion', 'trackId', 'difficulty', 'duration', 'audioMode',
    'loopDuration', 'generatorVersion', 'analysisHash', 'locked',
    'spatialModelVersion', 'interactionContractVersion', 'phases', 'events',
  ];
  exactKeys(document, allowed, path);
  required(document, allowed.filter((key) => key !== 'loopDuration'), path);
  if (document.schemaVersion !== 2) fail(path, 'schemaVersion debe ser 2');
  id(document.trackId, `${path}.trackId`);
  if (!['easy', 'medium', 'hard'].includes(document.difficulty)) fail(path, 'dificultad invalida');
  number(document.duration, `${path}.duration`, Number.EPSILON);
  if (!['single', 'loop'].includes(document.audioMode)) fail(path, 'audioMode invalido');
  if (document.audioMode === 'loop') number(document.loopDuration, `${path}.loopDuration`, Number.EPSILON);
  if (document.audioMode === 'single' && 'loopDuration' in document) fail(path, 'single no admite loopDuration');
  string(document.generatorVersion, `${path}.generatorVersion`);
  if (document.analysisHash !== null && !HASH_PATTERN.test(document.analysisHash)) fail(path, 'analysisHash invalido');
  if (typeof document.locked !== 'boolean') fail(path, 'locked debe ser boolean');
  string(document.spatialModelVersion, `${path}.spatialModelVersion`);
  string(document.interactionContractVersion, `${path}.interactionContractVersion`);
  if (!Array.isArray(document.phases) || document.phases.length === 0) fail(path, 'phases vacio');
  if (!Array.isArray(document.events)) fail(path, 'events debe ser arreglo');

  const phaseIds = new Set();
  let previousEnd = 0;
  document.phases.forEach((phase, index) => {
    const phasePath = `${path}.phases[${index}]`;
    exactKeys(phase, ['id', 'name', 'startTime', 'endTime'], phasePath);
    required(phase, ['id', 'name', 'startTime', 'endTime'], phasePath);
    id(phase.id, `${phasePath}.id`);
    string(phase.name, `${phasePath}.name`);
    number(phase.startTime, `${phasePath}.startTime`);
    number(phase.endTime, `${phasePath}.endTime`, Number.EPSILON, document.duration);
    if (phaseIds.has(phase.id)) fail(phasePath, 'id de fase duplicado');
    if (phase.startTime < previousEnd || phase.endTime <= phase.startTime) fail(phasePath, 'limites de fase invalidos');
    phaseIds.add(phase.id);
    previousEnd = phase.endTime;
  });

  const eventIds = new Set();
  let previousTime = -1;
  document.events.forEach((event, index) => {
    const eventPath = `${path}.events[${index}]`;
    exactKeys(event, ['id', 'time', 'phaseId', 'kind', 'start', 'controls', 'checkpoints', 'end'], eventPath);
    required(event, ['id', 'time', 'phaseId', 'kind', 'start'], eventPath);
    id(event.id, `${eventPath}.id`);
    id(event.phaseId, `${eventPath}.phaseId`);
    number(event.time, `${eventPath}.time`, 0, document.duration);
    if (eventIds.has(event.id)) fail(eventPath, 'id de nota duplicado');
    if (!phaseIds.has(event.phaseId)) fail(eventPath, 'phaseId inexistente');
    if (event.time < previousTime) fail(eventPath, 'eventos fuera de orden');
    if (!['tap', 'drag'].includes(event.kind)) fail(eventPath, 'kind invalido');
    position(event.start, `${eventPath}.start`);
    if (event.kind === 'tap' && ('end' in event || 'controls' in event || 'checkpoints' in event)) {
      fail(eventPath, 'tap no admite trayectoria');
    }
    if (event.kind === 'drag') {
      if (!('end' in event)) fail(eventPath, 'drag requiere end');
      position(event.end, `${eventPath}.end`);
      for (const key of ['controls', 'checkpoints']) {
        if (!(key in event)) continue;
        if (!Array.isArray(event[key]) || event[key].length > (key === 'controls' ? 2 : 4)) fail(eventPath, `${key} invalido`);
        event[key].forEach((point, pointIndex) => position(point, `${eventPath}.${key}[${pointIndex}]`));
      }
    }
    eventIds.add(event.id);
    previousTime = event.time;
  });
  return document;
}

export function validateAnalysisV1(document) {
  const path = 'analysis';
  const keys = ['schemaVersion', 'trackId', 'audioHash', 'analyzerVersion', 'duration', 'bpm', 'beatOffset', 'beats', 'onsets', 'energyFrames'];
  exactKeys(document, keys, path);
  required(document, keys, path);
  if (document.schemaVersion !== 1) fail(path, 'schemaVersion debe ser 1');
  id(document.trackId, `${path}.trackId`);
  if (!HASH_PATTERN.test(document.audioHash)) fail(path, 'audioHash invalido');
  string(document.analyzerVersion, `${path}.analyzerVersion`);
  number(document.duration, `${path}.duration`, Number.EPSILON);
  number(document.bpm, `${path}.bpm`, 30, 300);
  number(document.beatOffset, `${path}.beatOffset`, 0, document.duration);
  if (!Array.isArray(document.beats) || !Array.isArray(document.onsets) || !Array.isArray(document.energyFrames)) fail(path, 'series invalidas');
  let lastBeat = -1;
  document.beats.forEach((beat, index) => {
    number(beat, `${path}.beats[${index}]`, 0, document.duration);
    if (beat < lastBeat) fail(path, 'beats fuera de orden');
    lastBeat = beat;
  });
  for (const [key, fields] of [['onsets', ['time', 'strength']], ['energyFrames', ['time', 'volume', 'low', 'mid', 'high']]]) {
    let lastTime = -1;
    document[key].forEach((entry, index) => {
      const entryPath = `${path}.${key}[${index}]`;
      exactKeys(entry, fields, entryPath);
      required(entry, fields, entryPath);
      number(entry.time, `${entryPath}.time`, 0, document.duration);
      if (entry.time < lastTime) fail(entryPath, 'serie fuera de orden');
      fields.slice(1).forEach((field) => number(entry[field], `${entryPath}.${field}`, 0, 1));
      lastTime = entry.time;
    });
  }
  return document;
}

export function validateTrackMetadataV1(document) {
  const path = 'metadata';
  const keys = ['schemaVersion', 'trackId', 'title', 'status', 'audioMode', 'webAudioPath', 'audioHash', 'durationSeconds', 'loopDuration', 'rhythm', 'suggestedSections', 'provenance'];
  exactKeys(document, keys, path);
  required(
    document,
    keys.filter((key) => key !== 'loopDuration' && key !== 'durationSeconds'),
    path,
  );
  if (document.schemaVersion !== 1) fail(path, 'schemaVersion debe ser 1');
  id(document.trackId, `${path}.trackId`);
  string(document.title, `${path}.title`);
  if (!['legacy-active', 'candidate', 'active', 'retired'].includes(document.status)) fail(path, 'status invalido');
  if (!['single', 'loop'].includes(document.audioMode)) fail(path, 'audioMode invalido');
  if (typeof document.webAudioPath !== 'string' || !document.webAudioPath.startsWith('./assets/audio/')) fail(path, 'webAudioPath invalido');
  if (!HASH_PATTERN.test(document.audioHash)) fail(path, 'audioHash invalido');
  if ('durationSeconds' in document) number(document.durationSeconds, `${path}.durationSeconds`, Number.EPSILON);
  if (document.audioMode === 'loop') number(document.loopDuration, `${path}.loopDuration`, Number.EPSILON);
  if (document.audioMode === 'single' && 'loopDuration' in document) fail(path, 'single no admite loopDuration');
  exactKeys(document.rhythm, ['tempoHint', 'bpmOverride', 'beatOffsetOverride'], `${path}.rhythm`);
  required(document.rhythm, ['tempoHint', 'bpmOverride', 'beatOffsetOverride'], `${path}.rhythm`);
  for (const key of ['tempoHint', 'bpmOverride', 'beatOffsetOverride']) {
    if (document.rhythm[key] !== null) number(document.rhythm[key], `${path}.rhythm.${key}`);
  }
  if (!Array.isArray(document.suggestedSections)) fail(path, 'suggestedSections invalido');
  document.suggestedSections.forEach((section, index) => {
    const sectionPath = `${path}.suggestedSections[${index}]`;
    exactKeys(section, ['id', 'name', 'startTime', 'endTime'], sectionPath);
    required(section, ['id', 'name', 'startTime', 'endTime'], sectionPath);
    id(section.id, `${sectionPath}.id`);
    string(section.name, `${sectionPath}.name`);
    number(section.startTime, `${sectionPath}.startTime`);
    number(section.endTime, `${sectionPath}.endTime`, Number.EPSILON);
    if (section.endTime <= section.startTime) fail(sectionPath, 'limites invalidos');
  });
  exactKeys(document.provenance, ['sourceType', 'provider', 'commercialUseStatus', 'privateEvidenceRef'], `${path}.provenance`);
  required(document.provenance, ['sourceType', 'provider', 'commercialUseStatus', 'privateEvidenceRef'], `${path}.provenance`);
  if (!['ai-generated', 'original-recording', 'licensed', 'legacy-unknown'].includes(document.provenance.sourceType)) fail(path, 'sourceType invalido');
  if (document.provenance.provider !== null) string(document.provenance.provider, `${path}.provenance.provider`);
  if (!['verified', 'evidence-required', 'review-required'].includes(document.provenance.commercialUseStatus)) fail(path, 'commercialUseStatus invalido');
  if (document.provenance.privateEvidenceRef !== null) string(document.provenance.privateEvidenceRef, `${path}.provenance.privateEvidenceRef`);
  return document;
}
