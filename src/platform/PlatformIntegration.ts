import { DevelopmentAdsService } from '../monetization/DevelopmentAdsService';
import { CrazyGamesAdsService } from '../monetization/CrazyGamesAdsService';
import { PokiAdsService } from '../monetization/PokiAdsService';
import {
  SafeRewardedAdsService,
  type RewardedAdsService,
} from '../monetization/RewardedAdsService';
import type { DevelopmentAdOutcome } from '../monetization/RewardTypes';
import { NoopTelemetrySink, type TelemetrySink } from '../analytics/TelemetryTypes';
import { PokiTelemetrySink } from '../analytics/PokiTelemetrySink';
import { UnavailableAdsService } from '../monetization/UnavailableAdsService';
import {
  NoopGamePlatformService,
  type GamePlatformService,
} from './GamePlatformService';
import { CrazyGamesPlatformService } from './crazygames/CrazyGamesPlatformService';
import {
  loadCrazyGamesSdk,
} from './crazygames/CrazyGamesSdkLoader';
import type { CrazyGamesSdk } from './crazygames/CrazyGamesTypes';
import { detectPortalTarget } from './PortalTarget';
import { PokiPlatformService } from './poki/PokiPlatformService';
import { loadPokiSdk } from './poki/PokiSdkLoader';
import type { PokiSdk } from './poki/PokiTypes';

export interface PlatformIntegration {
  rewardedAds: RewardedAdsService;
  game: GamePlatformService;
  telemetry: TelemetrySink;
}

export interface PlatformIntegrationOptions {
  development: boolean;
  hostname: string;
  search: string;
  simulationOutcome?: DevelopmentAdOutcome;
  simulationDelayMs?: number;
  onMuteChanged: (muted: boolean) => void;
  loadCrazyGames?: () => Promise<CrazyGamesSdk>;
  loadPoki?: () => Promise<PokiSdk>;
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
      telemetry: new NoopTelemetrySink(),
    };
  }
  if (target === 'disabled') return createDisabledIntegration();
  if (target === 'poki') return createPokiIntegration(options);

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
      telemetry: new NoopTelemetrySink(),
    };
  } catch (error) {
    console.warn('CrazyGames SDK no esta disponible; el juego continuara sin anuncios.', error);
    return createDisabledIntegration();
  }
}

async function createPokiIntegration(
  options: PlatformIntegrationOptions,
): Promise<PlatformIntegration> {
  try {
    const sdk = await (options.loadPoki ?? loadPokiSdk)();
    await sdk.init();
    return {
      rewardedAds: new SafeRewardedAdsService(new PokiAdsService(sdk)),
      game: new PokiPlatformService(sdk, options.development),
      telemetry: new PokiTelemetrySink(sdk),
    };
  } catch (error) {
    console.warn('Poki SDK no esta disponible; el juego continuara sin anuncios.', error);
    return createDisabledIntegration();
  }
}

function createDisabledIntegration(): PlatformIntegration {
  return {
    rewardedAds: new SafeRewardedAdsService(new UnavailableAdsService()),
    game: new NoopGamePlatformService('disabled'),
    telemetry: new NoopTelemetrySink(),
  };
}
