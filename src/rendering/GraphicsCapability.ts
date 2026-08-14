const SOFTWARE_RENDERER_PATTERN = /swiftshader|basic render driver|llvmpipe|software rasterizer/i;

export function isSoftwareRendererLabel(label: string | null): boolean {
  return label !== null && SOFTWARE_RENDERER_PATTERN.test(label);
}

export function readWebGlRendererLabel(canvas: HTMLCanvasElement): string | null {
  const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
  if (!gl) return null;
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  if (!debugInfo) return null;
  const label = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
  return typeof label === 'string' ? label : null;
}
