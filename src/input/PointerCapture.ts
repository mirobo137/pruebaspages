import type { FederatedPointerEvent } from 'pixi.js';

export function capturePointer(event: FederatedPointerEvent): void {
  event.preventDefault();
  const target = event.nativeEvent.target;

  if (
    !(target instanceof Element)
    || !('setPointerCapture' in target)
    || !('hasPointerCapture' in target)
  ) return;

  try {
    if (!target.hasPointerCapture(event.pointerId)) {
      target.setPointerCapture(event.pointerId);
    }
  } catch {
    // Some embedded browsers expose pointer capture but reject the call.
  }
}

export function releasePointer(event: FederatedPointerEvent): void {
  event.preventDefault();
  const target = event.nativeEvent.target;

  if (
    !(target instanceof Element)
    || !('releasePointerCapture' in target)
    || !('hasPointerCapture' in target)
  ) return;

  try {
    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
  } catch {
    // The browser may already have released the pointer after cancellation.
  }
}
