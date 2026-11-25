/**
 * مزج دون اتصال في JS نقي (S4.5): الموضع يُحسب بالعينة لا بالثانية،
 * فالمعيار «صفر عينة انحراف» قابل للاختبار بلا متصفح.
 */
import { AUDIO_SAMPLE_RATE, framesForTicks } from './mapping';
import type { ScheduledSound } from './schedule';

export interface ChannelGains {
  readonly a: number;
  readonly b: number;
  readonly master: number;
}

export const DEFAULT_CHANNEL_GAINS: ChannelGains = { a: 0.8, b: 0.8, master: 0.9 };

export interface MixInput {
  readonly durationTicks: number;
  readonly sounds: readonly ScheduledSound[];
  readonly samples: ReadonlyMap<string, Float32Array>;
  readonly gains?: ChannelGains;
  readonly sampleRate?: number;
}

export interface MixResult {
  readonly sampleRate: number;
  readonly frameCount: number;
  readonly left: Float32Array;
  readonly right: Float32Array;
  readonly peak: number;
  readonly peakSample: number;
  readonly missingClips: readonly string[];
}

/** توزيع متساوي القدرة: pan = -1 يسار كامل، +1 يمين كامل، 0 مناصفة. */
export function panGains(pan: number): { left: number; right: number } {
  const angle = ((Math.max(-1, Math.min(1, pan)) + 1) * Math.PI) / 4;
  return { left: Math.cos(angle), right: Math.sin(angle) };
}

export function mixOffline(input: MixInput): MixResult {
  const sampleRate = input.sampleRate ?? AUDIO_SAMPLE_RATE;
  const gains = input.gains ?? DEFAULT_CHANNEL_GAINS;
  const frameCount = framesForTicks(input.durationTicks, sampleRate);
  const left = new Float32Array(frameCount);
  const right = new Float32Array(frameCount);
  const missing = new Set<string>();

  for (const sound of input.sounds) {
    const clip = input.samples.get(sound.clipId);
    if (!clip) {
      missing.add(sound.clipId);
      continue;
    }
    const { left: leftPan, right: rightPan } = panGains(sound.pan);
    const channelGain = sound.channel === 'a' ? gains.a : gains.b;
    const amplitude = sound.gain * channelGain * gains.master;

    for (let index = 0; index < clip.length; index += 1) {
      const target = sound.sample + index;
      if (target >= frameCount) break;
      const value = (clip[index] ?? 0) * amplitude;
      left[target] = (left[target] ?? 0) + value * leftPan;
      right[target] = (right[target] ?? 0) + value * rightPan;
    }
  }

  let peak = 0;
  let peakSample = 0;
  for (let index = 0; index < frameCount; index += 1) {
    const magnitude = Math.max(Math.abs(left[index] ?? 0), Math.abs(right[index] ?? 0));
    if (magnitude > peak) {
      peak = magnitude;
      peakSample = index;
    }
  }

  return {
    sampleRate,
    frameCount,
    left,
    right,
    peak,
    peakSample,
    missingClips: [...missing],
  };
}

/** PCM متشابك ثنائي القناة، جاهز لترميز WAV أو لـAudioBuffer. */
export function interleaveChannels(left: Float32Array, right: Float32Array): Float32Array {
  const out = new Float32Array(Math.min(left.length, right.length) * 2);
  for (let index = 0; index < left.length; index += 1) {
    out[index * 2] = left[index] ?? 0;
    out[index * 2 + 1] = right[index] ?? 0;
  }
  return out;
}
