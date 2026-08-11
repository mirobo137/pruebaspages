import type { Difficulty } from '../game/difficulty/Difficulty';
import { DIFFICULTY_PROFILES } from '../game/difficulty/Difficulty';
import type { ScoreSnapshot } from '../game/score/ScoreModel';
import { calculateStarRating, calculateWeightedAccuracy } from './StarRating';

const FAILED_RUN_REWARD = 10;
const COMPLETION_REWARD = 70;
const ACCURACY_REWARD = 50;
const STAR_REWARDS = [0, 10, 25, 45] as const;

/**
 * Evita que el combo cuadratico convierta una sola partida en miles de monedas.
 * El premio ahora representa completar, jugar con precision y asumir dificultad.
 */
export function calculateCoinReward(
  snapshot: ScoreSnapshot,
  difficulty: Difficulty,
  completed: boolean,
): number {
  if (!completed) return FAILED_RUN_REWARD;

  const stars = calculateStarRating(snapshot, true);
  const accuracy = calculateWeightedAccuracy(snapshot);
  const baseReward = COMPLETION_REWARD
    + Math.round(accuracy * ACCURACY_REWARD)
    + STAR_REWARDS[stars];
  return Math.max(
    FAILED_RUN_REWARD,
    Math.round(baseReward * DIFFICULTY_PROFILES[difficulty].rewardMultiplier),
  );
}
