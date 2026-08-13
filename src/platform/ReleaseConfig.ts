import type { GamePlatformEnvironment } from './GamePlatformService';

export type ReleaseChannel = 'development' | 'preview' | 'production' | 'disabled';

export interface ReleaseConfig {
  channel: ReleaseChannel;
  rewardedAds: boolean;
  rewardedRevive: boolean;
  rewardedCoinDouble: boolean;
  rewardedDailyCosmetic: boolean;
}

export function resolveReleaseConfig(
  environment: GamePlatformEnvironment,
  search: string,
): ReleaseConfig {
  const enabled = environment !== 'disabled';
  const channel: ReleaseChannel = environment === 'development'
    ? 'development'
    : environment.endsWith('-local')
      ? 'preview'
      : enabled
        ? 'production'
        : 'disabled';
  const config: ReleaseConfig = {
    channel,
    rewardedAds: enabled,
    rewardedRevive: enabled,
    rewardedCoinDouble: enabled,
    rewardedDailyCosmetic: enabled,
  };

  // Los overrides son herramientas de QA; produccion no acepta cambios por URL.
  if (channel !== 'development' && channel !== 'preview') return config;
  const query = new URLSearchParams(search);
  if (query.get('rewardedAds') === 'off') config.rewardedAds = false;
  if (query.get('rewardedRevive') === 'off') config.rewardedRevive = false;
  if (query.get('rewardedCoinDouble') === 'off') config.rewardedCoinDouble = false;
  if (query.get('rewardedDailyCosmetic') === 'off') {
    config.rewardedDailyCosmetic = false;
  }
  if (!config.rewardedAds) {
    config.rewardedRevive = false;
    config.rewardedCoinDouble = false;
    config.rewardedDailyCosmetic = false;
  }
  return config;
}
