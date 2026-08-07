import { GAME_CONFIG } from '../config';
import type { TimingGrade } from '../timing/TimingGrade';

export interface FlowSnapshot {
  charge: number;
  maxCharge: number;
  active: boolean;
  remaining: number;
  duration: number;
  multiplier: number;
  activations: number;
}

export interface FlowChange {
  snapshot: FlowSnapshot;
  activated: boolean;
  ended: boolean;
}

export class FlowModel {
  private charge = 0;
  private active = false;
  private remaining = 0;
  private activations = 0;

  update(deltaSeconds: number): FlowChange {
    let ended = false;

    if (this.active) {
      this.remaining = Math.max(0, this.remaining - deltaSeconds);
      if (this.remaining <= 0) {
        this.active = false;
        this.charge = 0;
        ended = true;
      }
    }

    return { snapshot: this.snapshot(), activated: false, ended };
  }

  register(grade: TimingGrade): FlowChange {
    let activated = false;
    let ended = false;

    if (this.active) {
      if (grade === 'miss') {
        this.active = false;
        this.remaining = 0;
        this.charge = 0;
        ended = true;
      }
    } else if (grade === 'perfect') {
      this.charge += GAME_CONFIG.flowPerfectGain;
    } else if (grade === 'good') {
      this.charge += GAME_CONFIG.flowGoodGain;
    } else {
      this.charge -= GAME_CONFIG.flowMissPenalty;
    }

    this.charge = Math.max(0, Math.min(GAME_CONFIG.flowMax, this.charge));
    if (!this.active && grade !== 'miss' && this.charge >= GAME_CONFIG.flowMax) {
      this.active = true;
      this.remaining = GAME_CONFIG.flowDuration;
      this.activations += 1;
      activated = true;
    }

    return { snapshot: this.snapshot(), activated, ended };
  }

  snapshot(): FlowSnapshot {
    return {
      charge: this.charge,
      maxCharge: GAME_CONFIG.flowMax,
      active: this.active,
      remaining: this.remaining,
      duration: GAME_CONFIG.flowDuration,
      multiplier: this.active ? GAME_CONFIG.flowScoreMultiplier : 1,
      activations: this.activations,
    };
  }
}
