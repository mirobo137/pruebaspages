import type {
  GameplayInteractionProfile,
  GameplayPointerMode,
  PointerTuning,
} from './GameplayInteractionProfile';

const PROFILES: Record<GameplayPointerMode, GameplayInteractionProfile> = {
  mouse: {
    id: 'mouse',
    usesGameplayCursor: true,
    playfield: 'desktop-bounded',
    dragPolicyId: 'mouse-assisted',
    compactBonusFactor: 0,
    tuning: {
      hitRadiusBonus: 0,
      dragToleranceBonus: 24,
      dragCompletionThreshold: 0.84,
      earlyInputBuffer: 0.03,
      sparkDistance: 12,
      latencyCompensationLimit: 0.025,
    },
  },
  touch: {
    id: 'touch',
    usesGameplayCursor: false,
    playfield: 'safe-viewport',
    dragPolicyId: 'trace',
    compactBonusFactor: 1,
    tuning: {
      hitRadiusBonus: 12,
      dragToleranceBonus: 14,
      dragCompletionThreshold: 0.94,
      earlyInputBuffer: 0.085,
      sparkDistance: 18,
      latencyCompensationLimit: 0.06,
    },
  },
  pen: {
    id: 'pen',
    usesGameplayCursor: false,
    playfield: 'safe-viewport',
    dragPolicyId: 'trace',
    compactBonusFactor: 0.5,
    tuning: {
      hitRadiusBonus: 6,
      dragToleranceBonus: 8,
      dragCompletionThreshold: 0.955,
      earlyInputBuffer: 0.055,
      sparkDistance: 15,
      latencyCompensationLimit: 0.04,
    },
  },
};

export function getInteractionProfile(
  mode: GameplayPointerMode,
): GameplayInteractionProfile {
  return PROFILES[mode];
}

export function resolvePointerTuning(
  mode: GameplayPointerMode,
  compactScreenBonus: number,
): PointerTuning {
  const profile = getInteractionProfile(mode);
  const bonus = compactScreenBonus * profile.compactBonusFactor;
  return {
    ...profile.tuning,
    hitRadiusBonus: profile.tuning.hitRadiusBonus + bonus,
    dragToleranceBonus: profile.tuning.dragToleranceBonus + bonus,
  };
}
