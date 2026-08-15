export interface AudioFrame {
  volume: number;
  bass: number;
  mids: number;
  highs: number;
  spectrum: number[];
}

export const SILENT_AUDIO_FRAME: AudioFrame = Object.freeze({
  volume: 0,
  bass: 0,
  mids: 0,
  highs: 0,
  spectrum: [],
});

export const MUSIC_FREQUENCY_BANDS = Object.freeze({
  volume: { minimumHz: 45, maximumHz: 8_000 },
  bass: { minimumHz: 45, maximumHz: 250 },
  mids: { minimumHz: 250, maximumHz: 2_000 },
  highs: { minimumHz: 2_000, maximumHz: 8_000 },
});

export function resolveFrequencyBinRange(
  sampleRate: number,
  fftSize: number,
  binCount: number,
  minimumHz: number,
  maximumHz: number,
): { start: number; end: number } {
  const nyquist = sampleRate / 2;
  const binWidth = sampleRate / fftSize;
  const start = Math.max(0, Math.min(binCount - 1, Math.floor(minimumHz / binWidth)));
  const end = Math.max(
    start + 1,
    Math.min(binCount, Math.ceil(Math.min(maximumHz, nyquist) / binWidth)),
  );
  return { start, end };
}

export function averageFrequencyBand(
  data: Uint8Array,
  sampleRate: number,
  fftSize: number,
  minimumHz: number,
  maximumHz: number,
): number {
  if (data.length === 0) return 0;
  const { start, end } = resolveFrequencyBinRange(
    sampleRate,
    fftSize,
    data.length,
    minimumHz,
    maximumHz,
  );
  let sum = 0;
  for (let index = start; index < end; index += 1) sum += data[index] ?? 0;
  return sum / ((end - start) * 255);
}

export function createLogFrequencyBands(
  count: number,
  minimumHz = 60,
  maximumHz = 10_000,
): Array<{ minimumHz: number; maximumHz: number }> {
  const safeCount = Math.max(1, Math.floor(count));
  const ratio = Math.pow(maximumHz / minimumHz, 1 / safeCount);
  return Array.from({ length: safeCount }, (_, index) => ({
    minimumHz: minimumHz * Math.pow(ratio, index),
    maximumHz: minimumHz * Math.pow(ratio, index + 1),
  }));
}

export class AdaptiveSpectrumNormalizer {
  private baseline: AudioFrame = { ...SILENT_AUDIO_FRAME };
  private output: AudioFrame = { ...SILENT_AUDIO_FRAME };
  private outputSpectrum: number[] = [];
  private initialized = false;

  update(raw: AudioFrame, deltaSeconds: number): AudioFrame {
    const safeDelta = Math.max(1 / 240, Math.min(.1, deltaSeconds));
    if (!this.initialized && raw.volume > .002) {
      this.baseline = { ...raw };
      this.outputSpectrum = raw.spectrum.map(() => 0);
      this.initialized = true;
    }
    const next = {} as AudioFrame;
    for (const key of ['volume', 'bass', 'mids', 'highs'] as const) {
      const value = clamp01(raw[key]);
      const baseline = this.baseline[key];
      const baselineRate = value > baseline ? .38 : .16;
      this.baseline[key] += (value - baseline) * Math.min(1, safeDelta * baselineRate);
      const reference = this.baseline[key];
      const transient = Math.max(0, value - reference) / Math.max(.04, reference);
      const target = value < .004
        ? 0
        : clamp01(.24 + transient * .72);
      const responseRate = target > this.output[key] ? 16 : 5;
      next[key] = this.output[key]
        + (target - this.output[key]) * Math.min(1, safeDelta * responseRate);
    }
    const spectrumPeak = Math.max(.003, ...raw.spectrum);
    const visualEnergy = clamp01(.32 + next.volume * 1.55);
    const nextSpectrum = raw.spectrum.map((rawValue, index) => {
      const value = clamp01(rawValue);
      const spectralShape = Math.pow(value / spectrumPeak, .68);
      const target = value < .0025 ? 0 : clamp01(spectralShape * visualEnergy);
      const previous = this.outputSpectrum[index] ?? 0;
      const responseRate = target > previous ? 24 : 4.2;
      return previous + (target - previous) * Math.min(1, safeDelta * responseRate);
    });
    this.outputSpectrum = nextSpectrum;
    this.output = { ...next, spectrum: nextSpectrum };
    return { ...this.output, spectrum: [...nextSpectrum] };
  }

  reset(): void {
    this.baseline = { ...SILENT_AUDIO_FRAME };
    this.output = { ...SILENT_AUDIO_FRAME };
    this.outputSpectrum = [];
    this.initialized = false;
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
