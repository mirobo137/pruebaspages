import type { RewardedAdsProvider } from './RewardedAdsService';
import { resultFor } from './RewardedAdsService';
import type {
  DevelopmentAdOutcome,
  RewardedAdRequest,
  RewardedAdResult,
} from './RewardTypes';

export interface DevelopmentAdsOptions {
  outcome?: DevelopmentAdOutcome;
  delayMs?: number;
}

export class DevelopmentAdsService implements RewardedAdsProvider {
  readonly available = true;
  private outcome: DevelopmentAdOutcome;
  private readonly delayMs: number;

  constructor(options: DevelopmentAdsOptions = {}) {
    this.outcome = options.outcome ?? 'rewarded';
    this.delayMs = Math.max(0, Math.min(10_000, options.delayMs ?? 350));
  }

  setOutcome(outcome: DevelopmentAdOutcome): void {
    this.outcome = outcome;
  }

  async showRewarded(
    request: RewardedAdRequest,
    lifecycle: { onStarted: () => Promise<void> },
  ): Promise<RewardedAdResult> {
    if (this.delayMs > 0) {
      await new Promise<void>((resolve) => globalThis.setTimeout(resolve, this.delayMs));
    }
    if (this.outcome === 'unavailable') return resultFor(request, 'unavailable');
    await lifecycle.onStarted();
    if (this.outcome === 'error') throw new Error('Simulated rewarded ad error.');
    return resultFor(request, this.outcome);
  }
}
