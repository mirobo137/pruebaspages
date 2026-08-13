import { DevelopmentAdsService } from '../monetization/DevelopmentAdsService';
import { CrazyGamesAdsService } from '../monetization/CrazyGamesAdsService';
import {
  SafeRewardedAdsService,
  type RewardedAdsService,
} from '../monetization/RewardedAdsService';
import type { DevelopmentAdOutcome } from '../monetization/RewardTypes';
import { UnavailableAdsService } from '../monetization/UnavailableAdsService';
import {
  NoopGamePlatformService,
  type GamePlatformService,
} from './GamePlatformService';
import { CrazyGamesPlatformService } from './crazygames/CrazyGamesPlatformService';
import {
  detectPortalTarget,
  loadCrazyGamesSdk,
} from './crazygames/CrazyGamesSdkLoader';
import type { CrazyGamesSdk } from './crazygames/CrazyGamesTypes';

export interface PlatformIntegration {
  rewardedAds: RewardedAdsService;
  game: GamePlatformService;
}

export interface PlatformIntegrationOptions {
  development: boolean;
  hostname: string;
  search: string;
  simulationOutcome?: DevelopmentAdOutcome;
  simulationDelayMs?: number;
  onMuteChanged: (muted: boolean) => void;
  loadCrazyGames?: () => Promise<CrazyGamesSdk>;
}

export async function createPlatformIntegration(
  options: PlatformIntegrationOptions,
): Promise<PlatformIntegration> {
  const target = detectPortalTarget(options);
  if (target === 'development') {
    return {
      rewardedAds: new SafeRewardedAdsService(new DevelopmentAdsService({
        outcome: options.simulationOutcome ?? 'rewarded',
        delayMs: options.simulationDelayMs,
      })),
      game: new NoopGamePlatformService('development'),
    };
  }
  if (target === 'disabled') return createDisabledIntegration();

  try {
    const sdk = await (options.loadCrazyGames ?? loadCrazyGamesSdk)();
    await sdk.init();
    if (sdk.environment === 'disabled') return createDisabledIntegration();
    let adblockDetected = false;
    try {
      adblockDetected = await sdk.ad.hasAdblock();
    } catch {
      // La deteccion no es infalible; un fallo no debe bloquear ofertas validas.
    }
    return {
      rewardedAds: new SafeRewardedAdsService(
        new CrazyGamesAdsService(sdk, adblockDetected),
      ),
      game: new CrazyGamesPlatformService(sdk, options.onMuteChanged),
    };
  } catch (error) {
    console.warn('CrazyGames SDK no esta disponible; el juego continuara sin anuncios.', error);
    return createDisabledIntegration();
  }
}

function createDisabledIntegration(): PlatformIntegration {
  return {
    rewardedAds: new SafeRewardedAdsService(new UnavailableAdsService()),
    game: new NoopGamePlatformService('disabled'),
  };
}

