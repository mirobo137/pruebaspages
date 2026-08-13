import type { CrazyGamesSdk } from './CrazyGamesTypes';

export type PortalTarget = 'development' | 'crazygames' | 'disabled';

export interface PortalTargetInput {
  hostname: string;
  search: string;
  development: boolean;
}

const CRAZYGAMES_SCRIPT_ID = 'crazygames-sdk-v3';
const CRAZYGAMES_SCRIPT_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';

export function detectPortalTarget(input: PortalTargetInput): PortalTarget {
  const hostname = input.hostname.toLowerCase();
  if (hostname.endsWith('.github.io')) return 'disabled';

  const query = new URLSearchParams(input.search);
  const requestedPortal = query.get('portal');
  if (requestedPortal === 'disabled') return 'disabled';
  if (requestedPortal === 'crazygames' || query.get('useLocalSdk') === 'true') {
    return 'crazygames';
  }
  if (hostname === 'crazygames.com' || hostname.endsWith('.crazygames.com')) {
    return 'crazygames';
  }
  return input.development ? 'development' : 'disabled';
}

export async function loadCrazyGamesSdk(
  documentRef: Document = document,
  windowRef: Window = window,
): Promise<CrazyGamesSdk> {
  if (windowRef.CrazyGames?.SDK) return windowRef.CrazyGames.SDK;

  const existing = documentRef.getElementById(CRAZYGAMES_SCRIPT_ID) as HTMLScriptElement | null;
  const script = existing ?? documentRef.createElement('script');
  await new Promise<void>((resolve, reject) => {
    const handleLoad = (): void => resolve();
    const handleError = (): void => reject(new Error('crazygames-sdk-load-failed'));
    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });
    if (!existing) {
      script.id = CRAZYGAMES_SCRIPT_ID;
      script.src = CRAZYGAMES_SCRIPT_URL;
      script.async = true;
      documentRef.head.appendChild(script);
    }
  });

  const sdk = windowRef.CrazyGames?.SDK;
  if (!sdk) throw new Error('crazygames-sdk-missing');
  return sdk;
}

