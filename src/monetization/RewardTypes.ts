export type RewardedPlacement =
  | 'double-run-coins'
  | 'second-chance'
  | 'daily-cosmetic'
  | 'custom-theme-slot';

export type RewardedAdStatus =
  | 'rewarded'
  | 'cancelled'
  | 'unavailable'
  | 'error';

export interface RewardedAdRequest {
  placement: RewardedPlacement;
  opportunityId: string;
}

export interface RewardedAdResult {
  status: RewardedAdStatus;
  placement: RewardedPlacement;
  opportunityId: string;
  errorCode?: string;
}

export interface RewardedAdLifecycle {
  onStarted?: () => void | Promise<void>;
  onFinished?: () => void | Promise<void>;
}

export type DevelopmentAdOutcome = RewardedAdStatus;
