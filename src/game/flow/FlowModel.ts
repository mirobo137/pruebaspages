import { GAME_CONFIG } from '../config';
import type { TimingGrade } from '../timing/TimingGrade';

export type FlowMode = 'charging' | 'flow' | 'super';

export interface FlowSnapshot {
  charge: number;
  maxCharge: number;
  active: boolean;
  remaining: number;
  duration: number;
  multiplier: number;
  activations: number;
  mode: FlowMode;
  superActive: boolean;
  superPerfects: number;
  superPerfectRequirement: number;
  superActivations: number;
}

export interface FlowChange {
  snapshot: FlowSnapshot;
  activated: boolean;
  ended: boolean;
  superActivated: boolean;
  superDemoted: boolean;
}

export class FlowModel {
  private charge = 0;
  private mode: FlowMode = 'charging';
  private activations = 0;
  private superPerfects = 0;
  private superActivations = 0;

  update(_deltaSeconds: number): FlowChange {
    // Compatibility hook for the scene loop. Time, pauses and phase changes
    // intentionally cannot mutate FLOW; only register() evaluates a note.
    return {
      snapshot: this.snapshot(),
      activated: false,
      ended: false,
      superActivated: false,
      superDemoted: false,
    };
  }

  register(grade: TimingGrade): FlowChange {
    let activated = false;
    let ended = false;
    let superActivated = false;
    let superDemoted = false;

    if (this.mode === 'super') {
      if (grade === 'miss') {
        this.endFlow();
        ended = true;
      } else if (grade === 'good') {
        this.mode = 'flow';
        this.superPerfects = 0;
        superDemoted = true;
      }
    } else if (this.mode === 'flow') {
      if (grade === 'miss') {
        this.endFlow();
        ended = true;
      } else if (grade === 'good') {
        this.superPerfects = 0;
      } else {
        this.superPerfects += 1;
        if (this.superPerfects >= GAME_CONFIG.superFlowPerfectRequirement) {
          this.mode = 'super';
          this.superPerfects = GAME_CONFIG.superFlowPerfectRequirement;
          this.superActivations += 1;
          superActivated = true;
        }
      }
    } else if (grade === 'perfect') {
      this.charge += GAME_CONFIG.flowPerfectGain;
    } else if (grade === 'good') {
      this.charge += GAME_CONFIG.flowGoodGain;
    } else {
      this.charge -= GAME_CONFIG.flowMissPenalty;
    }

    this.charge = Math.max(0, Math.min(GAME_CONFIG.flowMax, this.charge));
    if (this.mode === 'charging' && grade !== 'miss' && this.charge >= GAME_CONFIG.flowMax) {
      this.mode = 'flow';
      this.superPerfects = 0;
      this.activations += 1;
      activated = true;
    }

    return {
      snapshot: this.snapshot(),
      activated,
      ended,
      superActivated,
      superDemoted,
    };
  }

  snapshot(): FlowSnapshot {
    return {
      charge: this.charge,
      maxCharge: GAME_CONFIG.flowMax,
      active: this.mode !== 'charging',
      // Retained for save/API compatibility. Active FLOW no longer has time.
      remaining: 0,
      duration: 0,
      multiplier: this.mode === 'super'
        ? GAME_CONFIG.superFlowScoreMultiplier
        : this.mode === 'flow'
          ? GAME_CONFIG.flowScoreMultiplier
          : 1,
      activations: this.activations,
      mode: this.mode,
      superActive: this.mode === 'super',
      superPerfects: this.superPerfects,
      superPerfectRequirement: GAME_CONFIG.superFlowPerfectRequirement,
      superActivations: this.superActivations,
    };
  }

  restoreAfterRevive(checkpoint: FlowSnapshot): void {
    this.charge = 0;
    this.mode = 'charging';
    this.activations = checkpoint.activations;
    this.superPerfects = 0;
    this.superActivations = checkpoint.superActivations;
  }

  private endFlow(): void {
    this.mode = 'charging';
    this.charge = 0;
    this.superPerfects = 0;
  }
}
