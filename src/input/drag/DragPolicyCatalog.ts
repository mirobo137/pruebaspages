import type {
  DragInteractionPolicyId,
  DragTrackingMode,
} from '../GameplayInteractionProfile';

export interface DragInteractionPolicy {
  id: DragInteractionPolicyId;
  trackingMode: DragTrackingMode;
  resolvesOnDestination: boolean;
  requiresRelease: boolean;
}

const TRACE_DRAG_POLICY: DragInteractionPolicy = {
  id: 'trace',
  trackingMode: 'trace',
  resolvesOnDestination: true,
  requiresRelease: false,
};

const MOUSE_ASSISTED_DRAG_POLICY: DragInteractionPolicy = {
  id: 'mouse-assisted',
  trackingMode: 'directional-assisted',
  resolvesOnDestination: true,
  requiresRelease: false,
};

export function getDragInteractionPolicy(
  id: DragInteractionPolicyId,
): DragInteractionPolicy {
  if (id === 'mouse-assisted') return MOUSE_ASSISTED_DRAG_POLICY;
  if (id === 'trace') return TRACE_DRAG_POLICY;
  return TRACE_DRAG_POLICY;
}
