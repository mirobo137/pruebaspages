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
}
