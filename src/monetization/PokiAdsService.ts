import type { PokiSdk, PokiRewardSize } from '../platform/poki/PokiTypes';
import type { RewardedAdsProvider } from './RewardedAdsService';
import { resultFor } from './RewardedAdsService';
import type { RewardedAdRequest, RewardedAdResult } from './RewardTypes';

export class PokiAdsService implements RewardedAdsProvider {
  constructor(private readonly sdk: PokiSdk) {}

  get available(): boolean {
    return true;
  }

  async showRewarded(
    request: RewardedAdRequest,
    lifecycle: { onStarted: () => Promise<void> },
  ): Promise<RewardedAdResult> {
    let started: Promise<void> = Promise.resolve();
    try {
      const rewarded = await this.sdk.rewardedBreak({
        size: rewardSizeFor(request),
        onStart: () => {
          started = lifecycle.onStarted();
        },
      });
      await started.catch(() => undefined);
      return resultFor(request, rewarded ? 'rewarded' : 'cancelled');
    } catch (error) {
      await started.catch(() => undefined);
      return resultFor(request, 'error', readPokiErrorCode(error));
    }
  }
}

function rewardSizeFor(request: RewardedAdRequest): PokiRewardSize {
  if (request.placement === 'second-chance') return 'large';
  if (request.placement === 'daily-cosmetic') return 'large';
  if (request.placement === 'custom-theme-slot') return 'large';
  return 'medium';
}

function readPokiErrorCode(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.length > 0) return error;
  return 'poki-rewarded-error';
}
