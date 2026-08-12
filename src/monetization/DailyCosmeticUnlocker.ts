import type { RewardedAdsService } from './RewardedAdsService';
import type { RewardedAdLifecycle, RewardedAdStatus } from './RewardTypes';

export type DailyCosmeticUnlockResult = RewardedAdStatus | 'already-granted';

export interface DailyCosmeticUnlockRequest {
  themeId: string;
  opportunityId: string;
}

export class DailyCosmeticUnlocker {
  constructor(
    private readonly ads: RewardedAdsService,
    private readonly grantTheme: (
      themeId: string,
      opportunityId: string,
    ) => boolean,
    private readonly lifecycle: RewardedAdLifecycle = {},
  ) {}

  get available(): boolean {
    return this.ads.available;
  }

  async unlock(
    request: DailyCosmeticUnlockRequest,
  ): Promise<DailyCosmeticUnlockResult> {
    const result = await this.ads.showRewarded({
      placement: 'daily-cosmetic',
      opportunityId: request.opportunityId,
    }, this.lifecycle);
    if (result.status !== 'rewarded') return result.status;
    return this.grantTheme(request.themeId, result.opportunityId)
      ? 'rewarded'
      : 'already-granted';
  }
}

