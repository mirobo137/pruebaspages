import type { GameplayPointerMode } from './InputGameplayProfile';
import type { TimingGrade } from '../game/timing/TimingGrade';

export class GameplayInputTelemetry {
  private pointerDistance = 0;
  private lastPoint: { x: number; y: number } | null = null;
  private results: Record<TimingGrade, number> = {
    perfect: 0,
    good: 0,
    miss: 0,
  };

  constructor(
    private mode: GameplayPointerMode,
    private width: number,
    private height: number,
  ) {}

  setProfile(mode: GameplayPointerMode, width: number, height: number): void {
    this.mode = mode;
    this.width = width;
    this.height = height;
    this.lastPoint = null;
  }

  recordPointer(x: number, y: number): void {
    if (this.lastPoint) {
      this.pointerDistance += Math.hypot(x - this.lastPoint.x, y - this.lastPoint.y);
    }
    this.lastPoint = { x, y };
  }

  recordResult(grade: TimingGrade): void {
    this.results[grade] += 1;
  }

  report(): void {
    if (!import.meta.env.DEV) return;
    console.debug('[input-profile]', {
      pointer: this.mode,
      viewport: `${this.width}x${this.height}`,
      pointerDistance: Math.round(this.pointerDistance),
      results: { ...this.results },
    });
  }
}
