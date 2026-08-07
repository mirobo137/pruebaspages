import type { MusicTrack } from '../content/MusicCatalog';

export interface AudioFrame {
  volume: number;
  bass: number;
  mids: number;
  highs: number;
}

export class AudioManager {
  private readonly element = new Audio();
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private frequencyData = new Uint8Array(0);

  async play(track: MusicTrack): Promise<void> {
    this.element.src = new URL(track.audioPath, document.baseURI).toString();
    this.element.preload = 'auto';

    this.ensureAudioGraph();
    await this.context?.resume();
    await this.element.play();
  }

  stop(): void {
    this.element.pause();
    this.element.currentTime = 0;
  }

  readFrame(): AudioFrame {
    if (!this.analyser || this.frequencyData.length === 0) {
      return { volume: 0, bass: 0, mids: 0, highs: 0 };
    }

    this.analyser.getByteFrequencyData(this.frequencyData);

    return {
      volume: this.average(0, this.frequencyData.length),
      bass: this.average(0, Math.floor(this.frequencyData.length * 0.12)),
      mids: this.average(
        Math.floor(this.frequencyData.length * 0.12),
        Math.floor(this.frequencyData.length * 0.5),
      ),
      highs: this.average(
        Math.floor(this.frequencyData.length * 0.5),
        this.frequencyData.length,
      ),
    };
  }

  destroy(): void {
    this.stop();
    this.source?.disconnect();
    this.analyser?.disconnect();
    void this.context?.close();
  }

  private ensureAudioGraph(): void {
    if (this.context) return;

    this.context = new AudioContext();
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.75;
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.source = this.context.createMediaElementSource(this.element);
    this.source.connect(this.analyser);
    this.analyser.connect(this.context.destination);
  }

  private average(start: number, end: number): number {
    const safeEnd = Math.max(start + 1, end);
    let sum = 0;

    for (let index = start; index < safeEnd; index += 1) {
      sum += this.frequencyData[index] ?? 0;
    }

    return sum / ((safeEnd - start) * 255);
  }
}

