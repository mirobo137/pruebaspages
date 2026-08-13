import type {
  GamePlatformEnvironment,
  GamePlatformService,
} from '../GamePlatformService';
import type { CrazyGamesSdk } from './CrazyGamesTypes';

export class CrazyGamesPlatformService implements GamePlatformService {
  readonly environment: GamePlatformEnvironment;
  private gameplayActive = false;
  private loadingActive = false;
  private destroyed = false;
  private readonly settingsListener: (settings: { muteAudio?: boolean }) => void;

  constructor(
    private readonly sdk: CrazyGamesSdk,
    onMuteChanged: (muted: boolean) => void,
  ) {
    this.environment = sdk.environment === 'crazygames'
      ? 'crazygames'
      : 'crazygames-local';
    this.settingsListener = (settings) => onMuteChanged(settings.muteAudio === true);
    this.settingsListener(sdk.game.settings);
    sdk.game.addSettingsChangeListener(this.settingsListener);
  }

  loadingStart(): void {
    if (this.destroyed || this.loadingActive) return;
    this.loadingActive = true;
    this.safeCall(() => this.sdk.game.loadingStart());
  }

  loadingStop(): void {
    if (this.destroyed || !this.loadingActive) return;
    this.loadingActive = false;
    this.safeCall(() => this.sdk.game.loadingStop());
  }

  gameplayStart(): void {
    if (this.destroyed || this.gameplayActive) return;
    this.gameplayActive = true;
    this.safeCall(() => this.sdk.game.gameplayStart());
  }

  gameplayStop(): void {
    if (this.destroyed || !this.gameplayActive) return;
    this.gameplayActive = false;
    this.safeCall(() => this.sdk.game.gameplayStop());
  }

  destroy(): void {
    if (this.destroyed) return;
    this.gameplayStop();
    this.loadingStop();
    this.destroyed = true;
    this.sdk.game.removeSettingsChangeListener(this.settingsListener);
  }

  private safeCall(call: () => void): void {
    try {
      call();
    } catch (error) {
      console.warn('CrazyGames no acepto un evento de plataforma.', error);
    }
  }
}

