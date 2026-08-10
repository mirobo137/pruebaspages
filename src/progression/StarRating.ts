import type { ScoreSnapshot } from '../game/score/ScoreModel';

const GOOD_ACCURACY_WEIGHT = 0.7;

export function calculateWeightedAccuracy(snapshot: ScoreSnapshot): number {
  const totalNotes = snapshot.perfects + snapshot.goods + snapshot.misses;
  if (totalNotes <= 0) return 0;

  return (
    snapshot.perfects + snapshot.goods * GOOD_ACCURACY_WEIGHT
  ) / totalNotes;
}

export function calculateStarRating(
  snapshot: ScoreSnapshot,
  phaseReached: number,
): number {
  const completed = phaseReached >= 3 && snapshot.lives > 0;
  if (!completed) return 0;

  const accuracy = calculateWeightedAccuracy(snapshot);
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.7) return 2;
  return 1;
}

export function formatStars(stars: number): string {
  const filled = Math.max(0, Math.min(3, Math.floor(stars)));
  return '★'.repeat(filled) + '☆'.repeat(3 - filled);
}
