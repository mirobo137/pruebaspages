import type { VisualQualityProfile } from '../customization/VisualQuality';

export interface AdaptivePerformanceAdjustment {
  qualityId: VisualQualityProfile['id'] | null;
  resolutionScale: number;
  p95Ms: number;
  reason: 'sustained-slow-frames';
}

const SAMPLE_WINDOW = 60;
const REQUIRED_SLOW_WINDOWS = 2;
const SLOW_FRAME_P95_MS = 28;
const SEVERE_FRAME_P95_MS = 50;

export class AdaptivePerformanceController {
  private readonly samples: number[] = [];
  private consecutiveSlowWindows = 0;

  recordFrame(
    milliseconds: number,
    qualityId: VisualQualityProfile['id'],
    resolutionScale: number,
  ): AdaptivePerformanceAdjustment | null {
    if (!Number.isFinite(milliseconds) || milliseconds <= 0 || milliseconds > 250) {
      return null;
    }
    this.samples.push(milliseconds);
    if (this.samples.length < SAMPLE_WINDOW) return null;

    const sorted = [...this.samples].sort((left, right) => left - right);
    const p95Ms = sorted[Math.ceil(sorted.length * 0.95) - 1] ?? 0;
    this.samples.length = 0;
    if (p95Ms < SLOW_FRAME_P95_MS) {
      this.consecutiveSlowWindows = 0;
      return null;
    }
    this.consecutiveSlowWindows += 1;
    if (this.consecutiveSlowWindows < REQUIRED_SLOW_WINDOWS) return null;
    this.consecutiveSlowWindows = 0;

    if (qualityId === 'full') {
      return this.adjustment(
        p95Ms >= SEVERE_FRAME_P95_MS ? 'minimal' : 'reduced',
        resolutionScale,
        p95Ms,
      );
    }
    if (qualityId === 'reduced') {
      return this.adjustment('minimal', resolutionScale, p95Ms);
    }
    if (resolutionScale > 0.75) {
      return this.adjustment(null, 0.75, p95Ms);
    }
    if (resolutionScale > 0.5) {
      return this.adjustment(null, 0.5, p95Ms);
    }
    return null;
  }

  resetSamples(): void {
    this.samples.length = 0;
    this.consecutiveSlowWindows = 0;
  }

  private adjustment(
    qualityId: VisualQualityProfile['id'] | null,
    resolutionScale: number,
    p95Ms: number,
  ): AdaptivePerformanceAdjustment {
    return {
      qualityId,
      resolutionScale,
      p95Ms: Math.round(p95Ms * 10) / 10,
      reason: 'sustained-slow-frames',
    };
  }
}
