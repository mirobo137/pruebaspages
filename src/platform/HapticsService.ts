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

  phaseTransition(): void {
    if ('vibrate' in navigator) navigator.vibrate([10, 35, 16]);
  }
}
