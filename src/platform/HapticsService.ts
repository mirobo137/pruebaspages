import type { TimingGrade } from '../game/timing/TimingGrade';

export class HapticsService {
  feedback(grade: TimingGrade): void {
    if (!('vibrate' in navigator)) return;

    if (grade === 'perfect') {
      navigator.vibrate([8, 18, 8]);
    } else if (grade === 'good') {
      navigator.vibrate(9);
    } else {
      navigator.vibrate(24);
    }
  }

  flowActivation(): void {
    if ('vibrate' in navigator) navigator.vibrate([12, 25, 12, 25, 28]);
  }

  flowBreak(): void {
    if ('vibrate' in navigator) navigator.vibrate([35, 18, 45]);
  }

  superFlowActivation(): void {
    if ('vibrate' in navigator) navigator.vibrate([10, 18, 14, 18, 22, 30, 32]);
  }

  superFlowDemotion(): void {
    if ('vibrate' in navigator) navigator.vibrate([22, 16, 12]);
  }

  dragStart(): void {
    if ('vibrate' in navigator) navigator.vibrate(5);
  }
}
