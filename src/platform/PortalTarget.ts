export type PortalTarget = 'development' | 'crazygames' | 'poki' | 'disabled';

export interface PortalTargetInput {
  hostname: string;
  search: string;
  development: boolean;
}

export function detectPortalTarget(input: PortalTargetInput): PortalTarget {
  const hostname = input.hostname.toLowerCase();
  if (hostname.endsWith('.github.io')) return 'disabled';

  const query = new URLSearchParams(input.search);
  const requestedPortal = query.get('portal');
  if (requestedPortal === 'disabled') return 'disabled';
  if (requestedPortal === 'poki' || query.get('useLocalPokiSdk') === 'true') {
    return 'poki';
  }
  if (requestedPortal === 'crazygames' || query.get('useLocalSdk') === 'true') {
    return 'crazygames';
  }
  if (isPokiHostname(hostname)) return 'poki';
  if (hostname === 'crazygames.com' || hostname.endsWith('.crazygames.com')) {
    return 'crazygames';
  }
  return input.development ? 'development' : 'disabled';
}

function isPokiHostname(hostname: string): boolean {
  return hostname === 'poki.com'
    || hostname.endsWith('.poki.com')
    || hostname === 'poki-gdn.com'
    || hostname.endsWith('.poki-gdn.com')
    || hostname === 'poki.dev'
    || hostname.endsWith('.poki.dev');
}
