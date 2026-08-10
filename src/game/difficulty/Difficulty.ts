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
    maxLives: 7,
    targetHitRadius: 64,
    dragPathTolerance: 84,
    targetLeadTime: 0.82,
    perfectWindow: 0.13,
    goodWindow: 0.3,
    rewardMultiplier: 1,
  },
  medium: {
    label: 'Medio',
    maxLives: 5,
    targetHitRadius: 56,
    dragPathTolerance: 72,
    targetLeadTime: 0.65,
    perfectWindow: 0.1,
    goodWindow: 0.25,
    rewardMultiplier: 1.35,
  },
  hard: {
    label: 'Dificil',
    maxLives: 4,
    targetHitRadius: 52,
    dragPathTolerance: 64,
    targetLeadTime: 0.56,
    perfectWindow: 0.085,
    goodWindow: 0.2,
    rewardMultiplier: 1.75,
  },
};

export function getDifficultyLabel(difficulty: Difficulty): string {
  return DIFFICULTY_PROFILES[difficulty].label;
}
