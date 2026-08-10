export interface PointerTuning {
  hitRadiusBonus: number;
  dragToleranceBonus: number;
  dragCompletionThreshold: number;
  earlyInputBuffer: number;
  sparkDistance: number;
  latencyCompensationLimit: number;
}

export class TouchTuning {
  private compactScreenBonus = 0;

  resize(width: number, height: number): void {
    const shortestSide = Math.min(width, height);
    this.compactScreenBonus = shortestSide < 360
      ? 7
      : shortestSide < 430
        ? 4
        : shortestSide < 600
          ? 2
          : 0;
  }

  forPointer(pointerType: string): PointerTuning {
    const touchLike = pointerType === 'touch'
      || (!pointerType && navigator.maxTouchPoints > 0);
    if (touchLike) {
      return {
        hitRadiusBonus: 12 + this.compactScreenBonus,
        dragToleranceBonus: 14 + this.compactScreenBonus,
        dragCompletionThreshold: 0.94,
        earlyInputBuffer: 0.085,
        sparkDistance: 18,
        latencyCompensationLimit: 0.06,
      };
    }

    if (pointerType === 'pen') {
      return {
        hitRadiusBonus: 6 + this.compactScreenBonus * 0.5,
        dragToleranceBonus: 8 + this.compactScreenBonus * 0.5,
        dragCompletionThreshold: 0.955,
        earlyInputBuffer: 0.055,
        sparkDistance: 15,
        latencyCompensationLimit: 0.04,
      };
    }

    return {
      hitRadiusBonus: 0,
      dragToleranceBonus: 0,
      dragCompletionThreshold: 0.975,
      earlyInputBuffer: 0.03,
      sparkDistance: 12,
      latencyCompensationLimit: 0.025,
    };
  }

  compensateAudioTime(
    audioTime: number,
    eventTimeStamp: number,
    tuning: PointerTuning,
  ): number {
    const dispatchDelay = performance.now() - eventTimeStamp;
    if (!Number.isFinite(dispatchDelay) || dispatchDelay <= 0 || dispatchDelay > 150) {
      return audioTime;
    }

    return Math.max(
      0,
      audioTime - Math.min(dispatchDelay / 1000, tuning.latencyCompensationLimit),
    );
  }
}
