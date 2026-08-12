import type { RewardedAdsProvider } from './RewardedAdsService';
import { resultFor } from './RewardedAdsService';
import type { RewardedAdRequest, RewardedAdResult } from './RewardTypes';

export class UnavailableAdsService implements RewardedAdsProvider {
  readonly available = false;

  async showRewarded(request: RewardedAdRequest): Promise<RewardedAdResult> {
    return resultFor(request, 'unavailable');
  }
}
