/**
 * منطق المعاينة المتزامنة (S4.4): يحسب أوقات البدء من ساعة الصوت نفسها.
 * لا مؤقتات: كل التأخير يُسلَّم إلى محرّك الصوت كوقت مطلق.
 */
import type { ScheduledSound } from './schedule';

export interface PreviewClock {
  readonly currentTime: number;
}

export interface PreviewSink {
  start(clipId: string, when: number, gain: number, pan: number): void;
  stopAll(): void;
}

export interface PlannedStart {
  readonly id: string;
  readonly clipId: string;
  readonly when: number;
  readonly delay: number;
  readonly gain: number;
  readonly pan: number;
}

/**
 * يخطط كل صوت يقع عند tick ≥ playhead.
 * `when = clock.currentTime + (tick − playhead) / 60` بالثواني، بلا أي مؤقت.
 */
export function planFrom(
  sounds: readonly ScheduledSound[],
  playheadTick: number,
  clock: PreviewClock,
  tickRate = 60,
): PlannedStart[] {
  return sounds
    .filter((sound) => sound.tick >= playheadTick)
    .map((sound) => {
      const delay = (sound.tick - playheadTick) / tickRate;
      return {
        id: sound.id,
        clipId: sound.clipId,
        when: clock.currentTime + delay,
        delay,
        gain: sound.gain,
        pan: sound.pan,
      };
    });
}

export class AudioPreview {
  private plan: PlannedStart[] = [];
  private playing = false;

  constructor(
    private readonly clock: PreviewClock,
    private readonly sink: PreviewSink,
    private readonly tickRate = 60,
  ) {}

  get isPlaying(): boolean {
    return this.playing;
  }

  get planned(): readonly PlannedStart[] {
    return this.plan;
  }

  /** يبدأ من tick معيّن: يوقف كل شيء أولاً ثم يجدول ما تبقّى. */
  play(sounds: readonly ScheduledSound[], fromTick: number): readonly PlannedStart[] {
    this.sink.stopAll();
    this.plan = planFrom(sounds, fromTick, this.clock, this.tickRate);
    for (const item of this.plan) {
      this.sink.start(item.clipId, item.when, item.gain, item.pan);
    }
    this.playing = true;
    return this.plan;
  }

  /** seek: نفس مسار play — إيقاف كامل ثم إعادة جدولة، فلا تراكم انحراف. */
  seek(sounds: readonly ScheduledSound[], tick: number): readonly PlannedStart[] {
    return this.play(sounds, tick);
  }

  stop(): void {
    this.sink.stopAll();
    this.plan = [];
    this.playing = false;
  }
}
