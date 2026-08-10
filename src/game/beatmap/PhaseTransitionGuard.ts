import { PHASE_TRANSITION_DURATION } from '../../content/Beatmap';
import type { BeatEvent } from '../../content/Beatmap';

export class PhaseTransitionGuard {
  private transitionUntil = 0;
  private playableFrom = 0;

  begin(phaseStartTime: number, currentTime: number, targetLeadTime: number): void {
    this.transitionUntil = Math.max(
      phaseStartTime + PHASE_TRANSITION_DURATION,
      currentTime + PHASE_TRANSITION_DURATION,
    );
    this.playableFrom = this.transitionUntil + targetLeadTime;
  }

  isActive(currentTime: number): boolean {
    return currentTime < this.transitionUntil;
  }

  accepts(event: BeatEvent, activePhaseIndex: number): boolean {
    return event.phaseIndex !== activePhaseIndex || event.time >= this.playableFrom;
  }
}
