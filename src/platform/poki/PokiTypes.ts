export type PokiRewardSize = 'small' | 'medium' | 'large';

export interface PokiRewardedBreakOptions {
  size?: PokiRewardSize;
  onStart?: () => void;
}

export interface PokiSdk {
  init(): Promise<void>;
  gameLoadingFinished(): void;
  gameplayStart(): void;
  gameplayStop(): void;
  rewardedBreak(options?: PokiRewardedBreakOptions | (() => void)): Promise<boolean>;
  measure(category: string, what: string, action: string): void;
}

declare global {
  interface Window {
    PokiSDK?: PokiSdk;
  }
}
