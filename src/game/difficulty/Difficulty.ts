export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DifficultyProfile {
  label: string;
  maxLives: number;
  targetHitRadius: number;
  dragPathTolerance: number;
  targetLeadTime: number;
  perfectWindow: number;
  goodWindow: number;
  rewardMultiplier: number;
}

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

export const DIFFICULTY_PROFILES: Record<Difficulty, DifficultyProfile> = {
  easy: {
    label: 'Facil',
    maxLives: 6,
    targetHitRadius: 60,
    dragPathTolerance: 78,
    targetLeadTime: 0.75,
    perfectWindow: 0.11,
    goodWindow: 0.26,
    rewardMultiplier: 1,
  },
  medium: {
    label: 'Medio',
    maxLives: 4,
    targetHitRadius: 50,
    dragPathTolerance: 62,
    targetLeadTime: 0.55,
    perfectWindow: 0.075,
    goodWindow: 0.18,
    rewardMultiplier: 1.35,
  },
  hard: {
    label: 'Dificil',
    maxLives: 3,
    targetHitRadius: 44,
    dragPathTolerance: 52,
    targetLeadTime: 0.44,
    perfectWindow: 0.055,
    goodWindow: 0.14,
    rewardMultiplier: 1.75,
  },
};

export function getDifficultyLabel(difficulty: Difficulty): string {
  return DIFFICULTY_PROFILES[difficulty].label;
}
