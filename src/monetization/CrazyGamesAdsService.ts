import type { CrazyGamesSdk } from '../platform/crazygames/CrazyGamesTypes';
import type { RewardedAdsProvider } from './RewardedAdsService';
import { resultFor } from './RewardedAdsService';
import type { RewardedAdRequest, RewardedAdResult } from './RewardTypes';

const TEMPORARY_UNAVAILABLE_CODES = new Set([
  'unfilled',
  'adCooldown',
]);
const TERMINAL_UNAVAILABLE_CODES = new Set([
  'adsDisabledBasicLaunch',
  'adblock',
]);

export class CrazyGamesAdsService implements RewardedAdsProvider {
  private adsDisabled = false;

  constructor(
    private readonly sdk: CrazyGamesSdk,
    adblockDetected = false,
  ) {
    this.adsDisabled = sdk.environment === 'disabled' || adblockDetected;
  }

  get available(): boolean {
    return !this.adsDisabled;
  }

  async showRewarded(
    request: RewardedAdRequest,
    lifecycle: { onStarted: () => Promise<void> },
  ): Promise<RewardedAdResult> {
    if (!this.available) return resultFor(request, 'unavailable', 'ads-disabled');

    return new Promise<RewardedAdResult>((resolve) => {
      let settled = false;
      let started: Promise<void> = Promise.resolve();
      const settle = (result: RewardedAdResult): void => {
        if (settled) return;
        settled = true;
        void started.then(
          () => resolve(result),
          () => resolve(result),
        );
      };

      try {
        this.sdk.ad.requestAd('rewarded', {
          adStarted: () => {
            started = lifecycle.onStarted();
          },
          adFinished: () => settle(resultFor(request, 'rewarded')),
          adError: (error) => {
            const code = readCrazyGamesErrorCode(error);
            if (TERMINAL_UNAVAILABLE_CODES.has(code)) this.adsDisabled = true;
            const unavailable = TERMINAL_UNAVAILABLE_CODES.has(code)
              || TEMPORARY_UNAVAILABLE_CODES.has(code);
            settle(resultFor(
              request,
              unavailable ? 'unavailable' : 'error',
              code,
            ));
          },
        });
      } catch (error) {
        settle(resultFor(request, 'error', readCrazyGamesErrorCode(error)));
      }
    });
  }
}

export function readCrazyGamesErrorCode(error: unknown): string {
  if (
    typeof error === 'object'
    && error !== null
    && 'code' in error
    && typeof error.code === 'string'
    && error.code.length > 0
  ) return error.code;
  return 'other';
}
