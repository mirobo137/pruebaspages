import type { TimingGrade } from '../game/timing/TimingGrade';

export type GameplayAudioCue = TimingGrade | 'combo-break' | 'defeat';

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
  wetGain: number;
}

export function createFeedbackVoicePlan(cue: GameplayAudioCue): FeedbackVoicePlan[] {
  if (cue === 'perfect') return [
    { type: 'sine', startFrequency: 880, endFrequency: 1320, delay: 0, duration: 0.12, gain: 0.085 },
    { type: 'sine', startFrequency: 1320, endFrequency: 1760, delay: 0.035, duration: 0.13, gain: 0.055 },
  ];
  if (cue === 'good') return [
    { type: 'triangle', startFrequency: 510, endFrequency: 610, delay: 0, duration: 0.105, gain: 0.06 },
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
    { type: 'sawtooth', startFrequency: 190, endFrequency: 92, delay: 0, duration: 0.16, gain: 0.052 },
  ];
}

export function createMusicReactionPlan(
  comboBroken: boolean,
  fatal = false,
): MusicReactionPlan {
  if (fatal) {
    return { duration: 0.46, filterFrequency: 620, dryGain: 0.52, wetGain: 0.32 };
  }
  return comboBroken
    ? { duration: 0.28, filterFrequency: 1050, dryGain: 0.68, wetGain: 0.24 }
    : { duration: 0.19, filterFrequency: 1750, dryGain: 0.78, wetGain: 0.16 };
}

export class ReactiveAudioFeedback {
  readonly musicInput: GainNode;
  private readonly feedbackBus: GainNode;
  private readonly filter: BiquadFilterNode;
  private readonly dryMusic: GainNode;
  private readonly wetMusic: GainNode;
  private readonly distortion: WaveShaperNode;
  private readonly voices = new Set<OscillatorNode>();

  constructor(private readonly context: AudioContext, destination: AudioNode) {
    this.musicInput = context.createGain();
    this.feedbackBus = context.createGain();
    this.filter = context.createBiquadFilter();
    this.dryMusic = context.createGain();
    this.wetMusic = context.createGain();
    this.distortion = context.createWaveShaper();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 22000;
    this.filter.Q.value = 0.7;
    this.dryMusic.gain.value = 1;
    this.wetMusic.gain.value = 0;
    this.distortion.curve = createDistortionCurve(18);
    this.distortion.oversample = '2x';
    this.musicInput.connect(this.filter);
    this.filter.connect(this.dryMusic);
    this.filter.connect(this.distortion);
    this.distortion.connect(this.wetMusic);
    this.dryMusic.connect(destination);
    this.wetMusic.connect(destination);
    this.feedbackBus.connect(destination);
  }

  emitJudgement(grade: TimingGrade, comboBroken: boolean, fatal = false): void {
    const cue: GameplayAudioCue = fatal
      ? 'defeat'
      : grade === 'miss' && comboBroken
        ? 'combo-break'
        : grade;
    for (const voice of createFeedbackVoicePlan(cue)) this.playVoice(voice);
    if (grade === 'miss') this.reactMusic(createMusicReactionPlan(comboBroken, fatal));
  }

  reset(): void {
    const now = this.context.currentTime;
    this.restoreMusicAt(now);
    for (const voice of this.voices) {
      try { voice.stop(); } catch { /* The voice may already have ended. */ }
      voice.disconnect();
    }
    this.voices.clear();
  }

  destroy(): void {
    this.reset();
    this.musicInput.disconnect();
    this.feedbackBus.disconnect();
    this.filter.disconnect();
    this.dryMusic.disconnect();
    this.wetMusic.disconnect();
    this.distortion.disconnect();
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
    this.wetMusic.gain.linearRampToValueAtTime(plan.wetGain, attackEnd);
    this.filter.frequency.exponentialRampToValueAtTime(22000, releaseEnd);
    this.dryMusic.gain.linearRampToValueAtTime(1, releaseEnd);
    this.wetMusic.gain.linearRampToValueAtTime(0, releaseEnd);
  }

  private holdCurrentValues(now: number): void {
    for (const parameter of [this.filter.frequency, this.dryMusic.gain, this.wetMusic.gain]) {
      parameter.cancelScheduledValues(now);
      parameter.setValueAtTime(Math.max(0.0001, parameter.value), now);
    }
  }

  private restoreMusicAt(now: number): void {
    this.filter.frequency.cancelScheduledValues(now);
    this.dryMusic.gain.cancelScheduledValues(now);
    this.wetMusic.gain.cancelScheduledValues(now);
    this.filter.frequency.setValueAtTime(22000, now);
    this.dryMusic.gain.setValueAtTime(1, now);
    this.wetMusic.gain.setValueAtTime(0, now);
  }
}

function createDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(256);
  for (let index = 0; index < curve.length; index += 1) {
    const x = index * 2 / (curve.length - 1) - 1;
    curve[index] = (3 + amount) * x * 20 * Math.PI / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}
