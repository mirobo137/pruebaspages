import type { MusicTrack } from '../content/MusicCatalog';

export interface AudioFrame {
  volume: number;
  bass: number;
  mids: number;
  highs: number;
}

export class AudioManager {
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private readonly sources: Array<{
    source: AudioBufferSourceNode;
    gain: GainNode;
  }> = [];
  private frequencyData = new Uint8Array(0);
  private readonly trackData = new Map<string, Promise<ArrayBuffer>>();
  private readonly decodedTracks = new Map<string, Promise<AudioBuffer>>();
  private startedAt = 0;
  private timelineOffset = 0;
  private playing = false;
  private paused = false;
  private playbackToken = 0;

  get currentTime(): number {
    if (!this.playing || !this.context) return 0;
    return calculateAudioTimelineTime(
      this.context.currentTime,
      this.startedAt,
      this.timelineOffset,
    );
  }

  get isPlaying(): boolean {
    return this.playing && !this.paused;
  }

  prepare(track: MusicTrack): Promise<void> {
    this.ensureAudioContext();
    const context = this.context!;

    // Both operations start inside the JUGAR gesture. This unlocks Web Audio
    // on mobile while leaving the actual song start for the countdown.
    const resumePromise = context.resume();
    const decodePromise = this.getDecodedTrack(track);
    return Promise.all([resumePromise, decodePromise]).then(() => undefined);
  }

  async preload(tracks: MusicTrack[]): Promise<void> {
    await Promise.all(tracks.map(async (track) => {
      try {
        await this.getTrackData(track);
      } catch {
        // A failed preload is retried when the player starts the song.
      }
    }));
  }

  async play(
    track: MusicTrack,
    options: {
      loop?: boolean;
      loopDuration?: number;
      playbackDuration?: number;
      startOffset?: number;
      clipDuration?: number;
      timelineOffset?: number;
    } = {},
  ): Promise<void> {
    this.stop();
    const token = ++this.playbackToken;
    this.ensureAudioContext();
    const context = this.context!;

    // Resume is intentionally requested before the first await so mobile
    // browsers associate it with the original touch gesture.
    const resumePromise = context.resume();
    const bufferPromise = this.getDecodedTrack(track);
    await resumePromise;
    const buffer = await bufferPromise;
    if (token !== this.playbackToken) return;

    const startAt = context.currentTime + 0.025;
    const canCrossfade = Boolean(
      options.loop
      && options.loopDuration
      && options.playbackDuration,
    );

    if (canCrossfade) {
      const loopDuration = options.loopDuration!;
      const cycleCount = Math.ceil(options.playbackDuration! / loopDuration);
      const crossfade = Math.min(0.45, loopDuration * 0.025);
      const renderedCycleDuration = loopDuration + crossfade;
      const fadeIn = this.createFadeCurve(true);
      const fadeOut = this.createFadeCurve(false);

      for (let cycle = 0; cycle < cycleCount; cycle += 1) {
        const cycleStart = startAt + cycle * loopDuration;
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = buffer;
        source.playbackRate.value = buffer.duration / renderedCycleDuration;
        source.connect(gain);
        gain.connect(this.analyser!);

        gain.gain.setValueAtTime(cycle === 0 ? 1 : 0, cycleStart);
        if (cycle > 0) {
          gain.gain.setValueCurveAtTime(fadeIn, cycleStart, crossfade);
        }
        if (cycle < cycleCount - 1) {
          gain.gain.setValueAtTime(1, cycleStart + loopDuration);
          gain.gain.setValueCurveAtTime(
            fadeOut,
            cycleStart + loopDuration,
            crossfade,
          );
        }

        source.start(cycleStart);
        this.sources.push({ source, gain });
      }
    } else {
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      source.loop = options.loop ?? false;
      source.loopStart = 0;
      source.loopEnd = buffer.duration;
      if (options.loopDuration && options.loopDuration > 0) {
        source.playbackRate.value = buffer.duration / options.loopDuration;
      }
      source.connect(gain);
      gain.connect(this.analyser!);
      const startOffset = Math.max(
        0,
        Math.min(options.startOffset ?? 0, Math.max(0, buffer.duration - 0.01)),
      );
      const clipDuration = options.clipDuration
        ? Math.max(0.01, Math.min(options.clipDuration, buffer.duration - startOffset))
        : null;
      if (clipDuration) source.start(startAt, startOffset, clipDuration);
      else source.start(startAt, startOffset);
      this.sources.push({ source, gain });
    }

    this.startedAt = startAt;
    this.timelineOffset = Math.max(0, options.timelineOffset ?? 0);
    this.playing = true;
    this.paused = false;
  }

  async pause(): Promise<void> {
    if (!this.playing || this.paused || !this.context) return;

    this.paused = true;
    try {
      await this.context.suspend();
    } catch (error) {
      this.paused = false;
      throw error;
    }
  }

  async resume(): Promise<void> {
    if (!this.playing || !this.context) return;

    await this.context.resume();
    this.paused = false;
  }

  stop(): void {
    this.playbackToken += 1;
    for (const entry of this.sources) {
      try {
        entry.source.stop();
      } catch {
        // A source that already ended cannot be stopped again.
      }
      entry.source.disconnect();
      entry.gain.disconnect();
    }
    this.sources.length = 0;
    this.startedAt = 0;
    this.timelineOffset = 0;
    this.playing = false;
    this.paused = false;
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
    this.analyser?.disconnect();
    void this.context?.close();
    this.analyser = null;
    this.context = null;
    this.frequencyData = new Uint8Array(0);
    this.trackData.clear();
    this.decodedTracks.clear();
  }

  private ensureAudioContext(): void {
    if (this.context) return;

    this.context = new AudioContext({ latencyHint: 'interactive' });
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.75;
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.connect(this.context.destination);
  }

  private getTrackData(track: MusicTrack): Promise<ArrayBuffer> {
    const cached = this.trackData.get(track.id);
    if (cached) return cached;

    const request = fetch(new URL(track.audioPath, document.baseURI))
      .then((response) => {
        if (!response.ok) {
          throw new Error('No se pudo cargar el audio: ' + response.status);
        }
        return response.arrayBuffer();
      })
      .catch((error: unknown) => {
        this.trackData.delete(track.id);
        throw error;
      });
    this.trackData.set(track.id, request);
    return request;
  }

  private getDecodedTrack(track: MusicTrack): Promise<AudioBuffer> {
    const cached = this.decodedTracks.get(track.id);
    if (cached) return cached;
    if (!this.context) throw new Error('AudioContext no disponible.');

    const context = this.context;
    const request = this.getTrackData(track)
      .then((data) => context.decodeAudioData(data.slice(0)))
      .catch((error: unknown) => {
        this.decodedTracks.delete(track.id);
        throw error;
      });
    this.decodedTracks.set(track.id, request);
    return request;
  }

  private average(start: number, end: number): number {
    const safeEnd = Math.max(start + 1, end);
    let sum = 0;

    for (let index = start; index < safeEnd; index += 1) {
      sum += this.frequencyData[index] ?? 0;
    }

    return sum / ((safeEnd - start) * 255);
  }

  private createFadeCurve(fadeIn: boolean): Float32Array<ArrayBuffer> {
    const curve = new Float32Array(32);
    for (let index = 0; index < curve.length; index += 1) {
      const progress = index / (curve.length - 1);
      curve[index] = fadeIn
        ? Math.sin(progress * Math.PI * 0.5)
        : Math.cos(progress * Math.PI * 0.5);
    }
    return curve;
  }
}

export function calculateAudioTimelineTime(
  contextTime: number,
  startedAt: number,
  timelineOffset: number,
): number {
  return Math.max(0, timelineOffset) + Math.max(0, contextTime - startedAt);
}
