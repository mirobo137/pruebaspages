import type { TimingGrade } from '../game/timing/TimingGrade';

export type GameplayAudioCue = TimingGrade
  | 'combo-break'
  | 'defeat'
  | 'flow-activation'
  | 'super-flow-activation';

export interface FeedbackVoicePlan {
  type: OscillatorType;
  startFrequency: number;
  endFrequency: number;
  delay: number;
  duration: number;
  gain: number;
}

export interface MusicReactionPlan {
  duration: number;
  filterFrequency: number;
  dryGain: number;
}

export interface ErrorNoisePlan {
  duration: number;
  gain: number;
  highpassFrequency: number;
}

export function createFeedbackVoicePlan(cue: GameplayAudioCue): FeedbackVoicePlan[] {
  if (cue === 'perfect') return [
    { type: 'triangle', startFrequency: 880, endFrequency: 1320, delay: 0, duration: 0.115, gain: 0.17 },
    { type: 'sine', startFrequency: 1320, endFrequency: 1760, delay: 0.03, duration: 0.125, gain: 0.11 },
  ];
  if (cue === 'good') return [
    { type: 'triangle', startFrequency: 587, endFrequency: 740, delay: 0, duration: 0.11, gain: 0.14 },
  ];
  if (cue === 'flow-activation') return [
    { type: 'triangle', startFrequency: 659, endFrequency: 880, delay: 0, duration: 0.18, gain: 0.2 },
    { type: 'triangle', startFrequency: 880, endFrequency: 1175, delay: 0.07, duration: 0.22, gain: 0.16 },
    { type: 'sine', startFrequency: 1175, endFrequency: 1568, delay: 0.14, duration: 0.2, gain: 0.1 },
  ];
  if (cue === 'super-flow-activation') return [
    { type: 'triangle', startFrequency: 784, endFrequency: 1047, delay: 0, duration: 0.19, gain: 0.22 },
    { type: 'triangle', startFrequency: 1047, endFrequency: 1397, delay: 0.065, duration: 0.23, gain: 0.18 },
    { type: 'triangle', startFrequency: 1397, endFrequency: 2093, delay: 0.13, duration: 0.27, gain: 0.14 },
    { type: 'sine', startFrequency: 2093, endFrequency: 2637, delay: 0.205, duration: 0.24, gain: 0.085 },
  ];
  if (cue === 'defeat') return [
    { type: 'sawtooth', startFrequency: 145, endFrequency: 42, delay: 0, duration: 0.38, gain: 0.082 },
    { type: 'square', startFrequency: 82, endFrequency: 38, delay: 0.035, duration: 0.34, gain: 0.038 },
    { type: 'sine', startFrequency: 58, endFrequency: 34, delay: 0.06, duration: 0.42, gain: 0.065 },
  ];
  if (cue === 'combo-break') return [
    { type: 'sawtooth', startFrequency: 165, endFrequency: 68, delay: 0, duration: 0.24, gain: 0.07 },
    { type: 'square', startFrequency: 92, endFrequency: 54, delay: 0.025, duration: 0.19, gain: 0.035 },
  ];
  return [
    { type: 'sawtooth', startFrequency: 210, endFrequency: 86, delay: 0, duration: 0.15, gain: 0.068 },
  ];
}

export function createErrorNoisePlan(cue: GameplayAudioCue): ErrorNoisePlan | null {
  if (cue === 'defeat') return { duration: 0.14, gain: 0.075, highpassFrequency: 520 };
  if (cue === 'combo-break') return { duration: 0.085, gain: 0.062, highpassFrequency: 900 };
  if (cue === 'miss') return { duration: 0.055, gain: 0.05, highpassFrequency: 1450 };
  return null;
}

export function createMusicReactionPlan(
  comboBroken: boolean,
  fatal = false,
): MusicReactionPlan {
  if (fatal) {
    return { duration: 0.32, filterFrequency: 2600, dryGain: 0.68 };
  }
  return comboBroken
    ? { duration: 0.18, filterFrequency: 4200, dryGain: 0.78 }
    : { duration: 0.13, filterFrequency: 6200, dryGain: 0.86 };
}

export class ReactiveAudioFeedback {
  readonly musicInput: GainNode;
  private readonly feedbackBus: GainNode;
  private readonly filter: BiquadFilterNode;
  private readonly dryMusic: GainNode;
  private readonly voices = new Set<OscillatorNode>();
  private readonly noises = new Set<AudioBufferSourceNode>();
  private readonly samples = new Set<AudioBufferSourceNode>();
  private readonly noiseBuffer: AudioBuffer;
  private missSample: AudioBuffer | null = null;

  constructor(private readonly context: AudioContext, destination: AudioNode) {
    this.musicInput = context.createGain();
    this.feedbackBus = context.createGain();
    this.filter = context.createBiquadFilter();
    this.dryMusic = context.createGain();
    this.noiseBuffer = createNoiseBuffer(context, 0.16);
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 22000;
    this.filter.Q.value = 0.7;
    this.dryMusic.gain.value = 1;
    this.musicInput.connect(this.filter);
    this.filter.connect(this.dryMusic);
    this.dryMusic.connect(destination);
    this.feedbackBus.connect(destination);
  }

  emitJudgement(grade: TimingGrade, comboBroken: boolean, fatal = false): void {
    const cue: GameplayAudioCue = fatal
      ? 'defeat'
      : grade === 'miss' && comboBroken
        ? 'combo-break'
        : grade;
    if (grade === 'miss' && this.missSample) {
      this.playMissSample(fatal ? 1 : comboBroken ? 0.88 : 0.76);
    } else {
      for (const voice of createFeedbackVoicePlan(cue)) this.playVoice(voice);
      const noise = createErrorNoisePlan(cue);
      if (noise) this.playNoise(noise);
    }
    if (grade === 'miss') this.reactMusic(createMusicReactionPlan(comboBroken, fatal));
  }

  emitFlowTransition(superFlow: boolean): void {
    const cue: GameplayAudioCue = superFlow
      ? 'super-flow-activation'
      : 'flow-activation';
    for (const voice of createFeedbackVoicePlan(cue)) this.playVoice(voice);
  }

  setMissSample(buffer: AudioBuffer | null): void {
    this.missSample = buffer;
  }

  reset(): void {
    const now = this.context.currentTime;
    this.restoreMusicAt(now);
    for (const voice of this.voices) {
      try { voice.stop(); } catch { /* The voice may already have ended. */ }
      voice.disconnect();
    }
    this.voices.clear();
    for (const noise of this.noises) {
      try { noise.stop(); } catch { /* The noise may already have ended. */ }
      noise.disconnect();
    }
    this.noises.clear();
    for (const sample of this.samples) {
      try { sample.stop(); } catch { /* The sample may already have ended. */ }
      sample.disconnect();
    }
    this.samples.clear();
  }

  destroy(): void {
    this.reset();
    this.musicInput.disconnect();
    this.feedbackBus.disconnect();
    this.filter.disconnect();
    this.dryMusic.disconnect();
  }

  private playNoise(plan: ErrorNoisePlan): void {
    if (this.context.state !== 'running') return;
    const now = this.context.currentTime;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const envelope = this.context.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = 'highpass';
    filter.frequency.value = plan.highpassFrequency;
    filter.Q.value = 0.8;
    envelope.gain.setValueAtTime(plan.gain, now);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + plan.duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.feedbackBus);
    source.start(now, 0, plan.duration);
    this.noises.add(source);
    source.onended = () => {
      this.noises.delete(source);
      source.disconnect();
      filter.disconnect();
      envelope.disconnect();
    };
  }

  private playMissSample(gainValue: number): void {
    if (this.context.state !== 'running' || !this.missSample) return;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = this.missSample;
    gain.gain.value = gainValue;
    source.connect(gain);
    gain.connect(this.feedbackBus);
    source.start();
    this.samples.add(source);
    source.onended = () => {
      this.samples.delete(source);
      source.disconnect();
      gain.disconnect();
    };
  }

  private playVoice(plan: FeedbackVoicePlan): void {
    if (this.context.state !== 'running') return;
    const start = this.context.currentTime + plan.delay;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = plan.type;
    oscillator.frequency.setValueAtTime(plan.startFrequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, plan.endFrequency), start + plan.duration);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(plan.gain, start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + plan.duration);
    oscillator.connect(envelope);
    envelope.connect(this.feedbackBus);
    oscillator.start(start);
    oscillator.stop(start + plan.duration + 0.015);
    this.voices.add(oscillator);
    oscillator.onended = () => {
      this.voices.delete(oscillator);
      oscillator.disconnect();
      envelope.disconnect();
    };
  }

  private reactMusic(plan: MusicReactionPlan): void {
    const now = this.context.currentTime;
    const attackEnd = now + 0.025;
    const releaseEnd = now + plan.duration;
    this.holdCurrentValues(now);
    this.filter.frequency.exponentialRampToValueAtTime(plan.filterFrequency, attackEnd);
    this.dryMusic.gain.linearRampToValueAtTime(plan.dryGain, attackEnd);
    this.filter.frequency.exponentialRampToValueAtTime(22000, releaseEnd);
    this.dryMusic.gain.linearRampToValueAtTime(1, releaseEnd);
  }

  private holdCurrentValues(now: number): void {
    for (const parameter of [this.filter.frequency, this.dryMusic.gain]) {
      parameter.cancelScheduledValues(now);
      parameter.setValueAtTime(Math.max(0.0001, parameter.value), now);
    }
  }

  private restoreMusicAt(now: number): void {
    this.filter.frequency.cancelScheduledValues(now);
    this.dryMusic.gain.cancelScheduledValues(now);
    this.filter.frequency.setValueAtTime(22000, now);
    this.dryMusic.gain.setValueAtTime(1, now);
  }
}

function createNoiseBuffer(context: AudioContext, duration: number): AudioBuffer {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < channel.length; index += 1) {
    channel[index] = Math.random() * 2 - 1;
  }
  return buffer;
}
