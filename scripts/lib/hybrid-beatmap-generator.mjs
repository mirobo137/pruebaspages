import { createHash } from 'node:crypto';

export const HYBRID_GENERATOR_VERSION = 'hybrid-analysis-m4-bands-v1';

const MINIMUM_GAP = { easy: 0.48, medium: 0.28, hard: 0.16 };
const PHASE_SAFE_START = 2.1;
const FIRST_PHASE_SAFE_START = 1.5;
const PHASE_SAFE_END = 1.35;
const DRAG_REST = 1.05;

const MOTIFS = [
  [[.28,.32],[.42,.25],[.58,.25],[.72,.34],[.64,.48],[.5,.58],[.36,.5],[.48,.4]],
  [[.26,.55],[.38,.4],[.52,.3],[.68,.38],[.74,.55],[.6,.66],[.44,.62],[.32,.7]],
  [[.3,.3],[.44,.38],[.58,.3],[.7,.42],[.58,.54],[.7,.66],[.5,.72],[.34,.62]],
  [[.5,.22],[.62,.34],[.76,.44],[.62,.52],[.5,.68],[.38,.54],[.24,.44],[.4,.34]],
  [[.3,.42],[.42,.3],[.56,.4],[.7,.28],[.66,.5],[.54,.66],[.4,.56],[.28,.7]],
  [[.24,.5],[.36,.34],[.52,.46],[.68,.3],[.76,.5],[.64,.68],[.48,.56],[.32,.7]],
];

export function analysisSha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export function inferPreviewPhases(analysis) {
  const duration = analysis.duration;
  const boundaries = [duration / 3, duration * 2 / 3].map((target) => {
    const nearest = analysis.beats.reduce((best, beat) => (
      Math.abs(beat - target) < Math.abs(best - target) ? beat : best
    ), target);
    return rounded(nearest);
  });
  const safeFirst = Math.max(6, Math.min(duration - 12, boundaries[0]));
  const safeSecond = Math.max(safeFirst + 6, Math.min(duration - 6, boundaries[1]));
  return [
    { id: 'read', name: 'LECTURA', startTime: 0, endTime: rounded(safeFirst) },
    { id: 'drive', name: 'IMPULSO', startTime: rounded(safeFirst), endTime: rounded(safeSecond) },
    { id: 'climax', name: 'CLIMAX', startTime: rounded(safeSecond), endTime: rounded(duration) },
  ];
}

export function inferMusicalGrammar(analysis) {
  const phaseScores = [0, 1, 2, 3].map((phase) => analysis.beats.reduce(
    (score, time, beatIndex) => {
      if (beatIndex % 4 !== phase) return score;
      const energy = energyAt(analysis.energyFrames, time);
      const onset = strongestOnsetNear(analysis.onsets, time, .09);
      return score + energy.low * .45 + energy.volume * .2 + onset * .35;
    },
    0,
  ));
  const ranked = phaseScores
    .map((score, phase) => ({ phase, score }))
    .sort((left, right) => right.score - left.score || left.phase - right.phase);
  const best = ranked[0] ?? { phase: 0, score: 0 };
  const second = ranked[1]?.score ?? 0;
  return {
    meter: '4/4-inferred',
    beatsPerBar: 4,
    phraseBeats: 16,
    downbeatRemainder: best.phase,
    confidence: rounded(best.score > 0 ? (best.score - second) / best.score : 0),
    phaseScores: phaseScores.map(rounded),
  };
}

export function fuseMusicalCandidates(analysis, phases) {
  const onsetMergeSeconds = 0.075;
  const grammar = inferMusicalGrammar(analysis);
  const bandEntries = Object.entries(analysis.onsetsByBand ?? {}).flatMap(([band, onsets]) => (
    onsets.map((onset) => ({
      time: onset.time,
      beat: false,
      beatIndex: null,
      onsetStrength: onset.strength,
      band,
    }))
  ));
  const entries = [
    ...analysis.beats.map((time, beatIndex) => ({
      time,
      beat: true,
      beatIndex,
      onsetStrength: 0,
      band: null,
    })),
    ...analysis.onsets
      .filter((onset) => onset.strength >= 0.12)
      .map((onset) => ({
        time: onset.time,
        beat: false,
        beatIndex: null,
        onsetStrength: onset.strength,
        band: null,
      })),
    ...bandEntries,
  ].sort((left, right) => left.time - right.time || Number(right.beat) - Number(left.beat));
  const fused = [];
  for (const entry of entries) {
    const previous = fused.at(-1);
    if (previous && entry.time - previous.time <= onsetMergeSeconds) {
      if (entry.beat && !previous.beat) {
        previous.time = entry.time;
        previous.beatIndex = entry.beatIndex;
      }
      previous.beat ||= entry.beat;
      previous.onsetStrength = Math.max(previous.onsetStrength, entry.onsetStrength);
      if (entry.band) previous.bandHits = [...new Set([...previous.bandHits, entry.band])];
      continue;
    }
    fused.push({ ...entry, bandHits: entry.band ? [entry.band] : [] });
  }

  return fused.flatMap((candidate) => {
    const phaseIndex = phases.findIndex(
      (phase) => candidate.time >= phase.startTime && candidate.time < phase.endTime,
    );
    if (phaseIndex < 0) return [];
    const phase = phases[phaseIndex];
    const safeStart = phase.startTime + (phaseIndex === 0
      ? FIRST_PHASE_SAFE_START
      : PHASE_SAFE_START);
    if (candidate.time < safeStart || candidate.time >= phase.endTime - PHASE_SAFE_END) {
      return [];
    }
    const energy = energyAt(analysis.energyFrames, candidate.time);
    const intensity = clamp01(
      energy.volume * .3 + energy.low * .28 + energy.mid * .22
      + energy.high * .08 + candidate.onsetStrength * .12,
    );
    const referenceBeatIndex = candidate.beatIndex ?? nearestBeatIndex(analysis.beats, candidate.time);
    const relativeBeat = positiveModulo(referenceBeatIndex - grammar.downbeatRemainder, 4);
    const rhythmicRole = candidate.beat
      ? relativeBeat === 0
        ? 'downbeat'
        : relativeBeat === 1 || relativeBeat === 3
          ? 'backbeat'
          : 'pulse'
      : 'syncopation';
    const phraseBeat = Math.max(0, referenceBeatIndex - grammar.downbeatRemainder);
    const phraseIndex = Math.floor(phraseBeat / grammar.phraseBeats);
    const phraseBoundary = candidate.beat
      && relativeBeat === 0
      && phraseBeat % grammar.phraseBeats === 0;
    const sustain = sustainedEnergyAt(analysis.energyFrames, candidate.time, .8);
    return [{
      ...candidate,
      time: rounded(candidate.time),
      phaseId: phase.id,
      phaseIndex,
      energy,
      intensity,
      rhythmicRole,
      phraseIndex,
      phraseBoundary,
      sustain,
      bandHits: candidate.bandHits,
    }];
  });
}

export function classifyMusicalSegments(candidates, phases) {
  const blocks = [];
  for (const phase of phases) {
    const phaseCandidates = candidates.filter((candidate) => candidate.phaseId === phase.id);
    for (let startTime = phase.startTime; startTime < phase.endTime; startTime += 4) {
      const endTime = Math.min(phase.endTime, startTime + 4);
      const members = phaseCandidates.filter((candidate) => candidate.time >= startTime && candidate.time < endTime);
      if (members.length === 0) continue;
      blocks.push({
        phaseId: phase.id,
        startTime,
        endTime,
        intensity: members.reduce((sum, candidate) => sum + candidate.intensity, 0) / members.length,
      });
    }
  }
  const values = blocks.map((block) => block.intensity).sort((a, b) => a - b);
  const low = quantile(values, .28);
  const high = quantile(values, .72);
  const labelledBlocks = blocks.map((block, index) => {
    const previous = blocks[index - 1]?.phaseId === block.phaseId ? blocks[index - 1] : block;
    const next = blocks[index + 1]?.phaseId === block.phaseId ? blocks[index + 1] : block;
    const slope = next.intensity - previous.intensity;
    let segment = 'steady';
    if (block.intensity >= high) segment = 'peak';
    else if (slope <= -.12) segment = 'break';
    else if (slope >= .12) segment = 'buildup';
    else if (block.intensity <= low) segment = 'quiet';
    return { ...block, segment };
  });
  const labelled = candidates.map((candidate) => {
    const block = labelledBlocks.find((entry) => (
      entry.phaseId === candidate.phaseId
      && candidate.time >= entry.startTime
      && candidate.time < entry.endTime + 1e-6
    ));
    return { ...candidate, segment: block?.segment ?? 'steady' };
  });
  const segments = [];
  for (const block of labelledBlocks) {
    const previous = segments.at(-1);
    if (previous?.type === block.segment && previous.phaseId === block.phaseId) {
      previous.endTime = block.endTime;
      previous.candidateCount += labelled.filter((candidate) => candidate.time >= block.startTime && candidate.time < block.endTime).length;
      previous.averageIntensity = rounded(
        (previous.averageIntensity + block.intensity) * .5,
      );
    } else {
      segments.push({
        type: block.segment,
        phaseId: block.phaseId,
        startTime: block.startTime,
        endTime: block.endTime,
        candidateCount: labelled.filter((candidate) => candidate.time >= block.startTime && candidate.time < block.endTime).length,
        averageIntensity: rounded(block.intensity),
      });
    }
  }
  return { candidates: labelled, segments, thresholds: { low, high }, phases };
}

export function generateHybridBeatmaps({ trackId, duration, phases, analysis, analysisHash, versions }) {
  const musicalGrammar = inferMusicalGrammar(analysis);
  const fused = fuseMusicalCandidates(analysis, phases);
  const classified = classifyMusicalSegments(fused, phases);
  const riffCandidates = annotateRiffSequences(classified.candidates, analysis.bpm);
  const hardInitial = selectBySpacing(riffCandidates, MINIMUM_GAP.hard);
  const mediumInitial = selectBySpacing(hardInitial, MINIMUM_GAP.medium);
  const easyInitial = selectBySpacing(mediumInitial, MINIMUM_GAP.easy);
  const dragTimes = chooseDragTimes(easyInitial);
  const hard = removePostDragCandidates(hardInitial, dragTimes);
  const mediumIds = new Set(removePostDragCandidates(mediumInitial, dragTimes).map((item) => item.time));
  const easyIds = new Set(removePostDragCandidates(easyInitial, dragTimes).map((item) => item.time));
  const spatialEvents = assignSpatialMotifs(hard, trackId, dragTimes, {
    easy: easyIds,
    medium: mediumIds,
    hard: new Set(hard.map((item) => item.time)),
  });
  const byDifficulty = {
    hard: spatialEvents,
    medium: spatialEvents.filter((event) => mediumIds.has(event.time)),
    easy: spatialEvents.filter((event) => easyIds.has(event.time)),
  };
  const documents = {};
  for (const difficulty of ['easy', 'medium', 'hard']) {
    documents[difficulty] = {
      schemaVersion: 2,
      trackId,
      difficulty,
      duration,
      audioMode: 'single',
      generatorVersion: HYBRID_GENERATOR_VERSION,
      analysisHash,
      locked: false,
      spatialModelVersion: versions.spatialModelVersion,
      interactionContractVersion: versions.interactionContractVersion,
      phases: phases.map((phase) => ({ ...phase })),
      events: byDifficulty[difficulty].map(stripAnalysisFields),
    };
  }
  return {
    documents,
    diagnostics: {
      fusedCandidates: fused.length,
      selected: Object.fromEntries(Object.entries(documents).map(([key, value]) => [key, value.events.length])),
      drags: Object.fromEntries(Object.entries(documents).map(([key, value]) => [key, value.events.filter((event) => event.kind === 'drag').length])),
      segments: classified.segments,
      thresholds: classified.thresholds,
      musicalGrammar,
      coverage: Object.fromEntries(Object.entries(byDifficulty).map(
        ([difficulty, events]) => [difficulty, summarizeMusicalCoverage(events)],
      )),
    },
  };
}

function annotateRiffSequences(candidates, bpm) {
  const maximumInterval = Math.min(.9, (60 / Math.max(30, bpm)) * 1.75);
  const ordered = [...candidates].sort((left, right) => left.time - right.time);
  const sequences = [];
  let current = [];

  const flush = () => {
    if (current.length >= 3) sequences.push(current);
    current = [];
  };

  for (const candidate of ordered) {
    const isMelodicAttack = !candidate.beat
      && candidate.bandHits.some((band) => band === 'mid' || band === 'high');
    if (!isMelodicAttack) {
      flush();
      continue;
    }
    const previous = current.at(-1);
    if (previous && candidate.time - previous.time > maximumInterval) flush();
    current.push(candidate);
  }
  flush();

  const riffByTime = new Map();
  for (const sequence of sequences) {
    const firstEnergy = sequence[0].energy.mid + sequence[0].energy.high;
    const lastEnergy = sequence.at(-1).energy.mid + sequence.at(-1).energy.high;
    const direction = lastEnergy >= firstEnergy ? 1 : -1;
    sequence.forEach((candidate, riffStep) => {
      riffByTime.set(candidate.time, {
        riffStep,
        riffLength: sequence.length,
        riffDirection: direction,
      });
    });
  }
  return candidates.map((candidate) => {
    const riff = riffByTime.get(candidate.time);
    return riff
      ? { ...candidate, ...riff, rhythmicRole: 'riff' }
      : candidate;
  });
}

function selectBySpacing(candidates, minimumGap) {
  const chosen = [];
  const ranked = [...candidates].sort((left, right) => candidateScore(right) - candidateScore(left) || left.time - right.time);
  for (const candidate of ranked) {
    if (chosen.every((other) => (
      other.phaseId !== candidate.phaseId
      || Math.abs(other.time - candidate.time) >= Math.max(
        effectiveGap(candidate, minimumGap),
        effectiveGap(other, minimumGap),
      ) - 1e-6
    ))) {
      chosen.push(candidate);
    }
  }
  return chosen.sort((left, right) => left.time - right.time);
}

function effectiveGap(candidate, baseGap) {
  const segmentFactor = {
    quiet: 1.25,
    break: 1.15,
    steady: 1,
    buildup: .95,
    peak: .9,
  }[candidate.segment] ?? 1;
  const phaseFactor = { read: 1.08, drive: 1, climax: .93 }[candidate.phaseId] ?? 1;
  return Math.max(.11, baseGap * segmentFactor * phaseFactor);
}

function candidateScore(candidate) {
  const segmentBonus = { peak: .22, buildup: .13, steady: .08, break: .04, quiet: 0 }[candidate.segment];
  const roleBonus = { downbeat: .34, backbeat: .22, pulse: .14, syncopation: .08, riff: .22 }[candidate.rhythmicRole] ?? 0;
  const phraseBonus = candidate.phraseBoundary ? .24 : 0;
  return candidate.intensity + candidate.onsetStrength * .32
    + (candidate.beat ? .2 : 0) + roleBonus + phraseBonus + segmentBonus;
}

function chooseDragTimes(easyCandidates) {
  const selected = [];
  let lastDrag = -10;
  for (let index = 1; index < easyCandidates.length - 1; index += 1) {
    const candidate = easyCandidates[index];
    if (
      candidate.beat
      && candidate.sustain >= .48
      && (candidate.energy.low >= .48 || candidate.energy.mid >= .55)
      && (candidate.rhythmicRole === 'downbeat' || candidate.phraseBoundary)
      && candidate.time - lastDrag >= 6
      && easyCandidates[index + 1].time - candidate.time >= .48
      && candidate.segment !== 'quiet'
    ) {
      selected.push(candidate.time);
      lastDrag = candidate.time;
    }
  }
  return selected;
}

function removePostDragCandidates(candidates, dragTimes) {
  return candidates.filter((candidate) => !dragTimes.some(
    (time) => candidate.time > time && candidate.time < time + DRAG_REST - 1e-6,
  ));
}

function assignSpatialMotifs(candidates, trackId, dragTimes, membershipByDifficulty) {
  const seed = hashText(trackId);
  const lastPointByDifficulty = new Map();
  return candidates.map((candidate, index) => {
    const phrase = candidate.phraseIndex;
    const callResponse = Math.floor(phrase / 2);
    const motifIndex = (seed + candidate.phaseIndex * 3 + callResponse) % MOTIFS.length;
    const motif = MOTIFS[motifIndex];
    const phraseStep = index % 8;
    const directionalShift = candidate.energy.mid >= .62
      ? 1
      : candidate.energy.mid <= .24
        ? -1
        : 0;
    const responseStep = phrase % 2 === 0 ? phraseStep : 7 - phraseStep;
    const riffOffset = (candidate.riffStep ?? 0) * (candidate.riffDirection ?? 1);
    const pointIndex = positiveModulo(responseStep + directionalShift + riffOffset, motif.length);
    const variation = (seed + callResponse + candidate.phaseIndex
      + (candidate.energy.mid >= .55 ? 1 : 0)) % 4;
    const desiredStart = transformPoint(motif[pointIndex], variation);
    const relevantDifficulties = Object.entries(membershipByDifficulty)
      .filter(([, times]) => times.has(candidate.time))
      .map(([difficulty]) => difficulty);
    const start = separateFromPreviousPoints(
      desiredStart,
      relevantDifficulties.map((difficulty) => lastPointByDifficulty.get(difficulty)).filter(Boolean),
      seed + index * 17,
    );
    const id = `${candidate.phaseId}-m4-${String(index).padStart(4, '0')}`;
    const base = { id, time: candidate.time, phaseId: candidate.phaseId, kind: 'tap', start };
    for (const difficulty of relevantDifficulties) lastPointByDifficulty.set(difficulty, start);
    if (!dragTimes.includes(candidate.time)) return { ...base, _analysis: candidate };
    const target = transformPoint(motif[(pointIndex + 3) % motif.length], variation);
    const end = limitNormalizedDistance(start, target, .38);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy) || 1;
    const bend = ((seed + index) % 2 === 0 ? 1 : -1) * .065;
    const control = {
      x: rounded(clamp01((start.x + end.x) * .5 - dy / length * bend)),
      y: rounded(clamp01((start.y + end.y) * .5 + dx / length * bend)),
    };
    return { ...base, kind: 'drag', controls: [control], end, _analysis: candidate };
  });
}

function separateFromPreviousPoints(desired, previousPoints, seed) {
  const minimumDistance = .075;
  if (previousPoints.every((point) => normalizedDistance(desired, point) >= minimumDistance)) {
    return desired;
  }
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const angle = ((seed % 360) + attempt * 137.5) * Math.PI / 180;
    const radius = .09 + Math.floor(attempt / 4) * .035;
    const candidate = {
      x: rounded(Math.max(.16, Math.min(.84, desired.x + Math.cos(angle) * radius))),
      y: rounded(Math.max(.16, Math.min(.84, desired.y + Math.sin(angle) * radius))),
    };
    if (previousPoints.every((point) => normalizedDistance(candidate, point) >= minimumDistance)) {
      return candidate;
    }
  }
  return desired;
}

function normalizedDistance(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function summarizeMusicalCoverage(events) {
  const analysisEvents = events.map((event) => event._analysis);
  const roles = {};
  for (const event of analysisEvents) roles[event.rhythmicRole] = (roles[event.rhythmicRole] ?? 0) + 1;
  const strongEvidence = analysisEvents.filter((event) => (
    event.beat || event.onsetStrength >= .5
  )).length;
  const drags = events.filter((event) => event.kind === 'drag');
  return {
    noteCount: events.length,
    beatOrStrongOnsetRatio: rounded(events.length > 0 ? strongEvidence / events.length : 0),
    averageSalience: rounded(events.length > 0
      ? analysisEvents.reduce((sum, event) => sum + candidateScore(event), 0) / events.length
      : 0),
    phraseBoundariesCaptured: analysisEvents.filter((event) => event.phraseBoundary).length,
    rhythmicRoles: roles,
    sustainedDrags: drags.filter((event) => event._analysis.sustain >= .48).length,
  };
}

function stripAnalysisFields(event) {
  const { _analysis: _ignored, ...documentEvent } = event;
  return documentEvent;
}

function transformPoint(tuple, variation) {
  let [x, y] = tuple;
  if (variation === 1 || variation === 3) x = 1 - x;
  if (variation === 2 || variation === 3) y = 1 - y;
  return { x: rounded(x), y: rounded(y) };
}

function limitNormalizedDistance(start, target, maximum) {
  const dx = target.x - start.x;
  const dy = target.y - start.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= maximum) return target;
  return { x: rounded(start.x + dx / distance * maximum), y: rounded(start.y + dy / distance * maximum) };
}

function energyAt(frames, time) {
  let low = 0;
  let high = frames.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (frames[middle].time < time) low = middle + 1;
    else high = middle;
  }
  const right = frames[low] ?? frames.at(-1);
  const left = frames[Math.max(0, low - 1)] ?? right;
  if (!left || !right || right.time === left.time) return left ?? { volume: 0, low: 0, mid: 0, high: 0 };
  const ratio = clamp01((time - left.time) / (right.time - left.time));
  return Object.fromEntries(['volume', 'low', 'mid', 'high'].map((key) => [key, left[key] + (right[key] - left[key]) * ratio]));
}

function sustainedEnergyAt(frames, time, duration) {
  const selected = frames.filter((frame) => frame.time >= time && frame.time <= time + duration);
  if (selected.length === 0) return 0;
  return rounded(selected.reduce(
    (sum, frame) => sum + frame.low * .58 + frame.volume * .42,
    0,
  ) / selected.length);
}

function strongestOnsetNear(onsets, time, radius) {
  let strongest = 0;
  for (const onset of onsets) {
    if (onset.time < time - radius) continue;
    if (onset.time > time + radius) break;
    strongest = Math.max(strongest, onset.strength);
  }
  return strongest;
}

function nearestBeatIndex(beats, time) {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < beats.length; index += 1) {
    const distance = Math.abs(beats[index] - time);
    if (distance >= bestDistance) continue;
    bestDistance = distance;
    bestIndex = index;
  }
  return bestIndex;
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function quantile(values, position) {
  if (values.length === 0) return 0;
  return values[Math.min(values.length - 1, Math.floor((values.length - 1) * position))];
}

function hashText(value) {
  let hash = 2_166_136_261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }
  return hash;
}

function clamp01(value) { return Math.max(0, Math.min(1, value)); }
function rounded(value) { return Number(value.toFixed(6)); }
