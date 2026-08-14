import type { TimingGrade } from '../../game/timing/TimingGrade';
import type { PointerTuning } from '../GameplayInteractionProfile';
import type { DragInteractionPolicy } from './DragPolicyCatalog';

export interface DragInteractionState<TTarget> {
  pointerId: number;
  target: TTarget;
  grade: Exclude<TimingGrade, 'miss'>;
  deadline: number;
  completed: boolean;
  released: boolean;
  progress: number;
  checkpointsPassed: number;
  lastSparkX: number;
  lastSparkY: number;
  tuning: PointerTuning;
  policy: DragInteractionPolicy;
}

export class DragInteractionController<TTarget> {
  private gesture: DragInteractionState<TTarget> | null = null;

  get active(): DragInteractionState<TTarget> | null {
    return this.gesture;
  }

  start(
    state: Omit<DragInteractionState<TTarget>, 'policy'>,
    policy: DragInteractionPolicy,
  ): void {
    this.gesture = { ...state, policy };
  }

  clear(): DragInteractionState<TTarget> | null {
    const previous = this.gesture;
    this.gesture = null;
    return previous;
  }
}
