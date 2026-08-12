import { DevelopmentAdsService } from './DevelopmentAdsService';
import {
  SafeRewardedAdsService,
  type RewardedAdsService,
} from './RewardedAdsService';
import type { DevelopmentAdOutcome } from './RewardTypes';
import { UnavailableAdsService } from './UnavailableAdsService';

export interface RewardedAdsFactoryOptions {
  development: boolean;
  simulationOutcome?: DevelopmentAdOutcome;
  simulationDelayMs?: number;
}

export function createRewardedAdsService(
  options: RewardedAdsFactoryOptions,
): RewardedAdsService {
  const provider = options.development
    ? new DevelopmentAdsService({
      outcome: options.simulationOutcome ?? 'rewarded',
      delayMs: options.simulationDelayMs,
    })
    : new UnavailableAdsService();
  return new SafeRewardedAdsService(provider);
}

export function readDevelopmentAdOutcome(
  search: string,
): DevelopmentAdOutcome | undefined {
  const value = new URLSearchParams(search).get('rewardedAd');
  return value === 'rewarded'
    || value === 'cancelled'
    || value === 'unavailable'
    || value === 'error'
    ? value
    : undefined;
}
