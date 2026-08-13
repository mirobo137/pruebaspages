import type {
  RewardedAdLifecycle,
  RewardedAdRequest,
  RewardedAdResult,
} from './RewardTypes';

export interface RewardedAdsService {
  readonly available: boolean;
  readonly busy: boolean;
  showRewarded(
    request: RewardedAdRequest,
    lifecycle?: RewardedAdLifecycle,
  ): Promise<RewardedAdResult>;
  destroy(): void;
}

export interface RewardedAdsProvider {
  readonly available: boolean;
  showRewarded(
    request: RewardedAdRequest,
    lifecycle: { onStarted: () => Promise<void> },
  ): Promise<RewardedAdResult>;
  destroy?(): void;
}

export class SafeRewardedAdsService implements RewardedAdsService {
  private activeRequest = false;
  private destroyed = false;

  constructor(private readonly provider: RewardedAdsProvider) {}

  get available(): boolean {
    return !this.destroyed && this.provider.available;
  }

  get busy(): boolean {
    return this.activeRequest;
  }

  async showRewarded(
    request: RewardedAdRequest,
    lifecycle: RewardedAdLifecycle = {},
  ): Promise<RewardedAdResult> {
    if (this.destroyed || !this.provider.available) {
      return resultFor(request, 'unavailable');
    }
    if (this.activeRequest) return resultFor(request, 'unavailable', 'request-in-progress');

    this.activeRequest = true;
    let started = false;
    try {
      const result = await this.provider.showRewarded(request, {
        onStarted: async () => {
          if (started) return;
          started = true;
          await lifecycle.onStarted?.();
        },
      });
      return normalizeResult(request, result);
    } catch {
      return resultFor(request, 'error', 'provider-error');
    } finally {
      if (started) {
        try {
          await lifecycle.onFinished?.();
        } catch {
          // Restaurar audio/input no cambia el resultado confirmado por el proveedor.
        }
      }
      this.activeRequest = false;
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.provider.destroy?.();
  }
}

export function resultFor(
  request: RewardedAdRequest,
  status: RewardedAdResult['status'],
  errorCode?: string,
): RewardedAdResult {
  return {
    status,
    placement: request.placement,
    opportunityId: request.opportunityId,
    ...(errorCode ? { errorCode } : {}),
  };
}

function normalizeResult(
  request: RewardedAdRequest,
  result: RewardedAdResult,
): RewardedAdResult {
  if (
    result.placement !== request.placement
    || result.opportunityId !== request.opportunityId
  ) return resultFor(request, 'error', 'mismatched-response');
  return resultFor(request, result.status, result.errorCode);
}
