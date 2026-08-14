import type { PointerTuning } from './GameplayInteractionProfile';
import { normalizePointerMode } from './InputModeDetector';
import { resolvePointerTuning } from './InteractionProfileCatalog';
import type { Difficulty } from '../game/difficulty/Difficulty';

export class PointerAssistance {
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

  forPointer(pointerType: string, difficulty?: Difficulty): PointerTuning {
    const resolvedType = pointerType
      || (navigator.maxTouchPoints > 0 ? 'touch' : 'mouse');
    const mode = normalizePointerMode(resolvedType);
    const tuning = resolvePointerTuning(
      mode,
      this.compactScreenBonus,
    );
    if (mode !== 'mouse' || difficulty !== 'hard') return tuning;
    return {
      ...tuning,
      hitRadiusBonus: tuning.hitRadiusBonus + 20,
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
