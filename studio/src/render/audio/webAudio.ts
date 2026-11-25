/**
 * واجهة الصوت في المتصفح (S4.4، S4.5): AudioContext واحد للمعاينة،
 * وOfflineAudioContext للمزج الحتمي القابل للاختبار.
 */
import {
  AUDIO_SAMPLE_RATE,
  framesForTicks,
  type PreviewSink,
  type SoundCatalog,
} from '@/core/audio';

export class WebAudioSink implements PreviewSink {
  private readonly context: AudioContext;
  private readonly master: GainNode;
  private sources: AudioBufferSourceNode[] = [];
  private readonly buffers = new Map<string, AudioBuffer>();

  constructor(context: AudioContext, catalog: SoundCatalog) {
    this.context = context;
    this.master = context.createGain();
    this.master.gain.value = catalog.masterGain;
    this.master.connect(context.destination);
    for (const [clipId, samples] of catalog.samples) {
      const buffer = context.createBuffer(1, samples.length, catalog.sampleRate);
      buffer.copyToChannel(new Float32Array(samples), 0);
      this.buffers.set(clipId, buffer);
    }
  }

  get clock(): { currentTime: number } {
    return { currentTime: this.context.currentTime };
  }

  start(clipId: string, when: number, gain: number, pan: number): void {
    const buffer = this.buffers.get(clipId);
    if (!buffer) return;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const gainNode = this.context.createGain();
    gainNode.gain.value = gain;
    const panner = this.context.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    source.connect(gainNode).connect(panner).connect(this.master);
    source.start(Math.max(when, this.context.currentTime));
    this.sources.push(source);
  }

  stopAll(): void {
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        // المصدر قد يكون انتهى بالفعل: لا شيء لإيقافه.
      }
      source.disconnect();
    }
    this.sources = [];
  }

  async resume(): Promise<void> {
    if (this.context.state === 'suspended') await this.context.resume();
  }

  destroy(): void {
    this.stopAll();
    void this.context.close();
  }
}

export interface OfflineBounce {
  readonly frameCount: number;
  readonly sampleRate: number;
  readonly durationSeconds: number;
  readonly peak: number;
  readonly onsetSample: number;
  readonly left: Float32Array;
  readonly right: Float32Array;
}

/**
 * مزج عبر OfflineAudioContext بطول المشروع بالضبط (S4.5).
 * كل مصدر يبدأ عند `sample / sampleRate` بالضبط، فلا تقريب بالميلي ثانية.
 */
export async function bounceOffline(
  catalog: SoundCatalog,
  sounds: readonly { clipId: string; sample: number; gain: number; pan: number }[],
  durationTicks: number,
  sampleRate = AUDIO_SAMPLE_RATE,
): Promise<OfflineBounce> {
  const frameCount = framesForTicks(durationTicks, sampleRate);
  const context = new OfflineAudioContext({ numberOfChannels: 2, length: frameCount, sampleRate });
  const master = context.createGain();
  master.gain.value = catalog.masterGain;
  master.connect(context.destination);

  for (const sound of sounds) {
    const samples = catalog.samples.get(sound.clipId);
    if (!samples) continue;
    const buffer = context.createBuffer(1, samples.length, sampleRate);
    buffer.copyToChannel(new Float32Array(samples), 0);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const gain = context.createGain();
    gain.gain.value = sound.gain;
    const panner = context.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, sound.pan));
    source.connect(gain).connect(panner).connect(master);
    source.start(sound.sample / sampleRate);
  }

  const rendered = await context.startRendering();
  const left = rendered.getChannelData(0).slice();
  const right = rendered.numberOfChannels > 1 ? rendered.getChannelData(1).slice() : left.slice();

  let peak = 0;
  let onsetSample = -1;
  for (let index = 0; index < frameCount; index += 1) {
    const magnitude = Math.max(Math.abs(left[index] ?? 0), Math.abs(right[index] ?? 0));
    if (magnitude > peak) peak = magnitude;
    if (onsetSample < 0 && magnitude > 1e-4) onsetSample = index;
  }

  return {
    frameCount,
    sampleRate,
    durationSeconds: frameCount / sampleRate,
    peak,
    onsetSample,
    left,
    right,
  };
}
