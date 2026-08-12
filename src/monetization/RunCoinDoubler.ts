import type { RewardedAdsService } from './RewardedAdsService';
import type { RewardedAdLifecycle, RewardedAdStatus } from './RewardTypes';

export type RunCoinDoublingResult = RewardedAdStatus | 'already-granted';

export interface RunCoinDoublingRequest {
  opportunityId: string;
  rewardCoins: number;
}

export class RunCoinDoubler {
  constructor(
    private readonly ads: RewardedAdsService,
    private readonly grantBonus: (opportunityId: string, amount: number) => boolean,
    private readonly lifecycle: RewardedAdLifecycle = {},
  ) {}

  get available(): boolean {
    return this.ads.available;
  }

  async double(request: RunCoinDoublingRequest): Promise<RunCoinDoublingResult> {
    const amount = Math.max(0, Math.floor(request.rewardCoins));
    if (amount <= 0) return 'error';
    const result = await this.ads.showRewarded({
      placement: 'double-run-coins',
      opportunityId: `${request.opportunityId}:double-coins`,
    }, this.lifecycle);
    if (result.status !== 'rewarded') return result.status;
    return this.grantBonus(result.opportunityId, amount)
      ? 'rewarded'
      : 'already-granted';
  }
}
