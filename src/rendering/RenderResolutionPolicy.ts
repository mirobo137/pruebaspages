export interface RenderResolutionDecision {
  requestedResolution: number;
  resolution: number;
  renderedPixels: number;
  pixelBudget: number;
  constrained: boolean;
  budgetExceeded: boolean;
}

export const RENDER_PIXEL_BUDGET = 4_200_000;
export const MIN_RENDER_RESOLUTION = 0.5;
export const MAX_RENDER_RESOLUTION = 2;

export function resolveRenderResolution(
  width: number,
  height: number,
  devicePixelRatio: number,
  pixelBudget = RENDER_PIXEL_BUDGET,
): RenderResolutionDecision {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const safeBudget = Math.max(1, pixelBudget);
  const requestedResolution = Math.max(
    MIN_RENDER_RESOLUTION,
    Math.min(MAX_RENDER_RESOLUTION, devicePixelRatio || 1),
  );
  const requestedPixels = safeWidth * safeHeight * requestedResolution ** 2;
  if (requestedPixels <= safeBudget) {
    return {
      requestedResolution,
      resolution: requestedResolution,
      renderedPixels: Math.round(requestedPixels),
      pixelBudget: safeBudget,
      constrained: false,
      budgetExceeded: false,
    };
  }

  const budgetResolution = Math.sqrt(safeBudget / (safeWidth * safeHeight));
  const steppedResolution = Math.floor(budgetResolution * 20) / 20;
  // Nunca escalar un canvas de DPR >= 1 por debajo de un pixel interno por
  // pixel CSS: Pixi tambien dibuja aqui el HUD y el texto.
  const nativeCssResolution = Math.min(1, requestedResolution);
  const resolution = Math.max(
    nativeCssResolution,
    Math.min(requestedResolution, steppedResolution),
  );
  const renderedPixels = Math.round(safeWidth * safeHeight * resolution ** 2);
  return {
    requestedResolution,
    resolution,
    renderedPixels,
    pixelBudget: safeBudget,
    constrained: resolution < requestedResolution,
    budgetExceeded: renderedPixels > safeBudget,
  };
}
