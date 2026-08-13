import type { PokiSdk } from './PokiTypes';

const POKI_SCRIPT_ID = 'poki-sdk-v2';
const POKI_SCRIPT_URL = 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js';

export async function loadPokiSdk(
  documentRef: Document = document,
  windowRef: Window = window,
): Promise<PokiSdk> {
  if (windowRef.PokiSDK) return windowRef.PokiSDK;

  const existing = documentRef.getElementById(POKI_SCRIPT_ID) as HTMLScriptElement | null;
  const script = existing ?? documentRef.createElement('script');
  await new Promise<void>((resolve, reject) => {
    const handleLoad = (): void => resolve();
    const handleError = (): void => reject(new Error('poki-sdk-load-failed'));
    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });
    if (!existing) {
      script.id = POKI_SCRIPT_ID;
      script.src = POKI_SCRIPT_URL;
      script.async = true;
      documentRef.head.appendChild(script);
    }
  });

  const sdk = windowRef.PokiSDK;
  if (!sdk) throw new Error('poki-sdk-missing');
  return sdk;
}
