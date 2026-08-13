export type CrazyGamesEnvironment = 'local' | 'crazygames' | 'disabled';

export interface CrazyGamesErrorData {
  code?: string;
  message?: string;
}

export interface CrazyGamesAdCallbacks {
  adStarted?: () => void;
  adFinished?: () => void;
  adError?: (error: CrazyGamesErrorData | unknown) => void;
}

export interface CrazyGamesDataModule {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export interface CrazyGamesSdk {
  environment: CrazyGamesEnvironment;
  init(): Promise<void>;
  ad: {
    requestAd(type: 'rewarded' | 'midgame', callbacks: CrazyGamesAdCallbacks): void;
    hasAdblock(): Promise<boolean>;
  };
  game: {
    settings: { muteAudio?: boolean };
    addSettingsChangeListener(
      listener: (settings: { muteAudio?: boolean }) => void,
    ): void;
    removeSettingsChangeListener(
      listener: (settings: { muteAudio?: boolean }) => void,
    ): void;
    loadingStart(): void;
    loadingStop(): void;
    gameplayStart(): void;
    gameplayStop(): void;
  };
  data: CrazyGamesDataModule;
}

declare global {
  interface Window {
    CrazyGames?: { SDK: CrazyGamesSdk };
  }
}

