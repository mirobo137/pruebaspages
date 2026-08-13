export type GamePlatformEnvironment =
  | 'development'
  | 'crazygames-local'
  | 'crazygames'
  | 'poki-local'
  | 'poki'
  | 'disabled';

export interface GamePlatformService {
  readonly environment: GamePlatformEnvironment;
  loadingStart(): void;
  loadingStop(): void;
  gameplayStart(): void;
  gameplayStop(): void;
  destroy(): void;
}

export class NoopGamePlatformService implements GamePlatformService {
  readonly environment: GamePlatformEnvironment;

  constructor(environment: GamePlatformEnvironment = 'disabled') {
    this.environment = environment;
  }

  loadingStart(): void {}
  loadingStop(): void {}
  gameplayStart(): void {}
  gameplayStop(): void {}
  destroy(): void {}
}
