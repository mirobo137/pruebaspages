import type { FlowMode } from '../game/flow/FlowModel';
import type { NoteKind } from '../game/notes/NoteKind';
import type { TimingGrade } from '../game/timing/TimingGrade';
import type { GameplayPointerMode } from './InputGameplayProfile';
import {
  resolveInputProfileId,
  SPATIAL_MODEL_VERSION,
  type GameplayInputProfileId,
} from './GameplayResultContext';

export type GameplayMissReason =
  | 'tap-timeout'
  | 'tap-late-press'
  | 'drag-head-timeout'
  | 'drag-late-press'
  | 'drag-deadline'
  | 'drag-release-early'
  | 'drag-release-outside-destination'
  | 'drag-release-timeout'
  | 'drag-pointer-cancel';

interface FrameSummary {
  samples: number;
  averageMs: number;
  p95Ms: number;
  p99Ms: number;
  estimatedFps: number;
}

export interface TravelSummary {
  samples: number;
  averageDistance: number;
  maximumDistance: number;
  averageAvailableMs: number;
  maximumRequiredSpeed: number;
}

export interface DragDemandSummary {
  samples: number;
  averageLength: number;
  maximumLength: number;
  maximumRequiredSpeed: number;
}

export interface GameplayDiagnosticSnapshot {
  pointer: GameplayPointerMode;
  inputProfileId: GameplayInputProfileId;
  spatialModelVersion: string;
  viewport: string;
  screen: string;
  devicePixelRatio: number;
  renderResolution: number;
  renderedPixels: number;
  playfield: { left: number; top: number; width: number; height: number } | null;
  logicalCores: number | null;
  deviceMemoryGb: number | null;
  pointerDistance: number;
  emptyPresses: number;
  results: Record<TimingGrade, number>;
  misses: Partial<Record<GameplayMissReason, number>>;
  frames: Record<FlowMode, FrameSummary>;
  travel: TravelSummary;
  drags: DragDemandSummary;
}

export interface GameplayTechnicalResult {
  inputProfileId: GameplayInputProfileId;
  spatialModelVersion: string;
  pointerDistance: number;
  emptyPresses: number;
  results: Record<TimingGrade, number>;
  missReasons: Partial<Record<GameplayMissReason, number>>;
  travel: TravelSummary;
  drags: DragDemandSummary;
}

interface NavigatorWithMemory extends Navigator {
  deviceMemory?: number;
}

interface DiagnosticGlobal {
  __superflowDiagnostics?: GameplayDiagnosticSnapshot;
}

const MAX_FRAME_SAMPLES_PER_MODE = 3_600;
const MAX_TRAVEL_SAMPLES = 512;

export class GameplayInputTelemetry {
  private readonly usedModes: Set<GameplayPointerMode>;
  private pointerDistance = 0;
  private lastPoint: { x: number; y: number } | null = null;
  private emptyPresses = 0;
  private publishCountdown = 0;
  private lastFrameTimestamp: number | null = null;
  private results: Record<TimingGrade, number> = {
    perfect: 0,
    good: 0,
    miss: 0,
  };
  private misses: Partial<Record<GameplayMissReason, number>> = {};
  private readonly frameSamples: Record<FlowMode, number[]> = {
    charging: [],
    flow: [],
    super: [],
  };
  private readonly travelSamples: Array<{
    distance: number;
    availableMs: number;
    requiredSpeed: number;
  }> = [];
  private readonly dragDemandSamples: Array<{
    length: number;
    requiredSpeed: number;
  }> = [];

  constructor(
    private mode: GameplayPointerMode,
    private width: number,
    private height: number,
    private playfieldBounds: {
      left: number;
      top: number;
      width: number;
      height: number;
    } | null = null,
  ) {
    this.usedModes = new Set([mode]);
  }

  setProfile(
    mode: GameplayPointerMode,
    width: number,
    height: number,
    playfieldBounds = this.playfieldBounds,
  ): void {
    this.mode = mode;
    this.usedModes.add(mode);
    this.width = width;
    this.height = height;
    this.playfieldBounds = playfieldBounds;
    this.lastPoint = null;
    this.publish();
  }

  recordFrame(flowMode: FlowMode, timestamp = performance.now()): void {
    const previousTimestamp = this.lastFrameTimestamp;
    this.lastFrameTimestamp = timestamp;
    if (previousTimestamp === null) return;
    const milliseconds = timestamp - previousTimestamp;
    if (!Number.isFinite(milliseconds) || milliseconds <= 0 || milliseconds > 250) {
      return;
    }
    const samples = this.frameSamples[flowMode];
    samples.push(milliseconds);
    if (samples.length > MAX_FRAME_SAMPLES_PER_MODE) samples.shift();
    this.publishCountdown -= 1;
    if (this.publishCountdown <= 0) {
      this.publishCountdown = 60;
      this.publish();
    }
  }

  resetFrameClock(): void {
    this.lastFrameTimestamp = null;
  }

  recordPointer(x: number, y: number): void {
    if (this.lastPoint) {
      this.pointerDistance += Math.hypot(x - this.lastPoint.x, y - this.lastPoint.y);
    }
    this.lastPoint = { x, y };
  }

  recordEmptyPress(): void {
    this.emptyPresses += 1;
  }

  recordTargetTravel(
    previous: { x: number; y: number; time: number } | null,
    current: { x: number; y: number; time: number },
  ): void {
    if (!previous) return;
    const availableSeconds = current.time - previous.time;
    if (!Number.isFinite(availableSeconds) || availableSeconds <= 0) return;
    const distance = Math.hypot(current.x - previous.x, current.y - previous.y);
    this.travelSamples.push({
      distance,
      availableMs: availableSeconds * 1_000,
      requiredSpeed: distance / availableSeconds,
    });
    if (this.travelSamples.length > MAX_TRAVEL_SAMPLES) this.travelSamples.shift();
  }

  recordDragDemand(length: number, completionTimeSeconds: number): void {
    if (
      !Number.isFinite(length)
      || !Number.isFinite(completionTimeSeconds)
      || length <= 0
      || completionTimeSeconds <= 0
    ) return;
    this.dragDemandSamples.push({
      length,
      requiredSpeed: length / completionTimeSeconds,
    });
    if (this.dragDemandSamples.length > MAX_TRAVEL_SAMPLES) {
      this.dragDemandSamples.shift();
    }
  }

  recordResult(
    grade: TimingGrade,
    _kind: NoteKind,
    missReason?: GameplayMissReason,
  ): void {
    this.results[grade] += 1;
    if (grade === 'miss' && missReason) {
      this.misses[missReason] = (this.misses[missReason] ?? 0) + 1;
    }
  }

  snapshot(): GameplayDiagnosticSnapshot {
    const resolution = Math.max(1, window.devicePixelRatio || 1);
    const canvas = typeof document === 'undefined'
      ? null
      : document.querySelector('canvas');
    const renderResolution = canvas && this.width > 0
      ? canvas.width / this.width
      : resolution;
    const memory = (navigator as NavigatorWithMemory).deviceMemory;
    return {
      pointer: this.mode,
      inputProfileId: resolveInputProfileId(this.usedModes, this.mode),
      spatialModelVersion: SPATIAL_MODEL_VERSION,
      viewport: `${this.width}x${this.height}`,
      screen: `${window.screen.width}x${window.screen.height}`,
      devicePixelRatio: round(resolution, 2),
      renderResolution: round(renderResolution, 2),
      renderedPixels: canvas
        ? canvas.width * canvas.height
        : Math.round(this.width * this.height * renderResolution * renderResolution),
      playfield: this.playfieldBounds
        ? {
            left: round(this.playfieldBounds.left, 1),
            top: round(this.playfieldBounds.top, 1),
            width: round(this.playfieldBounds.width, 1),
            height: round(this.playfieldBounds.height, 1),
          }
        : null,
      logicalCores: Number.isFinite(navigator.hardwareConcurrency)
        ? navigator.hardwareConcurrency
        : null,
      deviceMemoryGb: Number.isFinite(memory) ? memory! : null,
      pointerDistance: Math.round(this.pointerDistance),
      emptyPresses: this.emptyPresses,
      results: { ...this.results },
      misses: { ...this.misses },
      frames: {
        charging: summarizeFrames(this.frameSamples.charging),
        flow: summarizeFrames(this.frameSamples.flow),
        super: summarizeFrames(this.frameSamples.super),
      },
      travel: summarizeTravel(this.travelSamples),
      drags: summarizeDragDemands(this.dragDemandSamples),
    };
  }

  technicalResult(): GameplayTechnicalResult {
    return {
      inputProfileId: resolveInputProfileId(this.usedModes, this.mode),
      spatialModelVersion: SPATIAL_MODEL_VERSION,
      pointerDistance: Math.round(this.pointerDistance),
      emptyPresses: this.emptyPresses,
      results: { ...this.results },
      missReasons: { ...this.misses },
      travel: summarizeTravel(this.travelSamples),
      drags: summarizeDragDemands(this.dragDemandSamples),
    };
  }

  report(): void {
    if (!import.meta.env.DEV) return;
    const snapshot = this.snapshot();
    this.publish(snapshot);
    console.debug('[desktop-baseline]', snapshot);
  }

  private publish(snapshot = this.snapshot()): void {
    if (!import.meta.env.DEV) return;
    (globalThis as DiagnosticGlobal).__superflowDiagnostics = snapshot;
  }
}

function summarizeFrames(samples: number[]): FrameSummary {
  if (samples.length === 0) {
    return { samples: 0, averageMs: 0, p95Ms: 0, p99Ms: 0, estimatedFps: 0 };
  }
  const sorted = [...samples].sort((left, right) => left - right);
  const averageMs = samples.reduce((total, value) => total + value, 0) / samples.length;
  return {
    samples: samples.length,
    averageMs: round(averageMs, 2),
    p95Ms: round(percentile(sorted, 0.95), 2),
    p99Ms: round(percentile(sorted, 0.99), 2),
    estimatedFps: round(1_000 / Math.max(0.01, averageMs), 1),
  };
}

function summarizeTravel(samples: Array<{
  distance: number;
  availableMs: number;
  requiredSpeed: number;
}>): TravelSummary {
  if (samples.length === 0) {
    return {
      samples: 0,
      averageDistance: 0,
      maximumDistance: 0,
      averageAvailableMs: 0,
      maximumRequiredSpeed: 0,
    };
  }
  const totalDistance = samples.reduce((total, sample) => total + sample.distance, 0);
  const totalAvailableMs = samples.reduce((total, sample) => total + sample.availableMs, 0);
  return {
    samples: samples.length,
    averageDistance: round(totalDistance / samples.length, 1),
    maximumDistance: round(Math.max(...samples.map((sample) => sample.distance)), 1),
    averageAvailableMs: round(totalAvailableMs / samples.length, 1),
    maximumRequiredSpeed: round(
      Math.max(...samples.map((sample) => sample.requiredSpeed)),
      1,
    ),
  };
}

function percentile(sorted: number[], ratio: number): number {
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index] ?? 0;
}

function summarizeDragDemands(samples: Array<{
  length: number;
  requiredSpeed: number;
}>): DragDemandSummary {
  if (samples.length === 0) {
    return { samples: 0, averageLength: 0, maximumLength: 0, maximumRequiredSpeed: 0 };
  }
  const totalLength = samples.reduce((total, sample) => total + sample.length, 0);
  return {
    samples: samples.length,
    averageLength: round(totalLength / samples.length, 1),
    maximumLength: round(Math.max(...samples.map((sample) => sample.length)), 1),
    maximumRequiredSpeed: round(
      Math.max(...samples.map((sample) => sample.requiredSpeed)),
      1,
    ),
  };
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
