import type {
  GamePlatformEnvironment,
  GamePlatformService,
} from '../GamePlatformService';
import type { PokiSdk } from './PokiTypes';

export class PokiPlatformService implements GamePlatformService {
  readonly environment: GamePlatformEnvironment;
  private gameplayActive = false;
  private loadingFinished = false;
  private destroyed = false;

  constructor(
    private readonly sdk: PokiSdk,
    development: boolean,
  ) {
    this.environment = development ? 'poki-local' : 'poki';
  }

  loadingStart(): void {
    // Poki v2 solo requiere notificar cuando la carga del juego termina.
  }

  loadingStop(): void {
    if (this.destroyed || this.loadingFinished) return;
    this.loadingFinished = true;
    this.safeCall(() => this.sdk.gameLoadingFinished());
  }

  gameplayStart(): void {
    if (this.destroyed || this.gameplayActive) return;
    this.gameplayActive = true;
    this.safeCall(() => this.sdk.gameplayStart());
  }

  gameplayStop(): void {
    if (this.destroyed || !this.gameplayActive) return;
    this.gameplayActive = false;
    this.safeCall(() => this.sdk.gameplayStop());
  }

  destroy(): void {
    if (this.destroyed) return;
    this.gameplayStop();
    this.destroyed = true;
  }

  private safeCall(call: () => void): void {
    try {
      call();
    } catch (error) {
      console.warn('Poki no acepto un evento de plataforma.', error);
    }
  }
}
