/**
 * مولّد جدول الأصوات النقي (S4.2): من النموذج إلى أزمنة عينات، بلا أي API صوتي.
 * يعتمد على جدول أحداث المرحلة 03 نفسه، فلا يوجد مصدر حقيقة ثانٍ للتوقيت.
 */
import type { Project } from '../model/project';
import type { When } from '../model/primitives';
import { arrivalTicksOf, scheduleTriggers } from '../sim';
import { AUDIO_SAMPLE_RATE, tickToSample } from './mapping';

export type SoundChannel = 'a' | 'b';
export type SoundOrigin = 'cue' | 'effect';

export interface ScheduledSound {
  readonly id: string;
  readonly clipId: string;
  readonly tick: number;
  readonly sample: number;
  readonly gain: number;
  readonly pan: number;
  readonly channel: SoundChannel;
  readonly origin: SoundOrigin;
}

export interface ScheduleOptions {
  readonly sampleRate?: number;
}

/** يبني خرائط المراجع مرة واحدة: وصول الكيانات، نهايات المسارات، وتوقيتات المشغّلات. */
function buildResolver(project: Project) {
  const arrivals = arrivalTicksOf(project);
  const trackEnds = new Map<string, number>();
  for (const track of project.tracks) {
    if (track.path) trackEnds.set(track.id, track.path.endTick);
    else {
      const last = track.keyframes?.at(-1);
      if (last) trackEnds.set(track.id, last.tick);
    }
  }
  const triggers = scheduleTriggers(project);

  return (when: When): number | null => {
    if ('tick' in when) return when.tick;
    const separator = when.after.lastIndexOf('.');
    const target = when.after.slice(0, separator);
    const kind = when.after.slice(separator + 1);
    if (kind === 'arrived') return arrivals.get(target) ?? null;
    const triggerTick = triggers.ticks.get(target);
    if (triggerTick !== undefined) return triggerTick;
    return trackEnds.get(target) ?? null;
  };
}

/** تحويل موقع جغرافي إلى إزاحة صوتية بسيطة على المحور الأفقي (PRODUCT_SPEC §9). */
export function panFromLon(lon: number): number {
  return Math.max(-1, Math.min(1, (lon / 180) * 0.9));
}

/**
 * جدول الأصوات مرتباً بـ(tick ثم المعرّف).
 * الأصوات التي لا يقع حدثها (مرجع غير منته) تُستبعد ولا تُخترع لها أوقات.
 */
export function buildSchedule(project: Project, options: ScheduleOptions = {}): ScheduledSound[] {
  const sampleRate = options.sampleRate ?? AUDIO_SAMPLE_RATE;
  const resolve = buildResolver(project);
  const sounds: ScheduledSound[] = [];

  for (const cue of project.cues) {
    const tick = resolve(cue.when);
    if (tick === null || tick > project.durationTicks) continue;
    sounds.push({
      id: cue.id,
      clipId: cue.clipId,
      tick,
      sample: tickToSample(tick, sampleRate),
      gain: cue.gain,
      pan: cue.pan,
      channel: 'a',
      origin: 'cue',
    });
  }

  for (const effect of project.effects) {
    if (!effect.soundClipId) continue;
    const tick = resolve(effect.at);
    if (tick === null || tick > project.durationTicks) continue;
    sounds.push({
      id: effect.id,
      clipId: effect.soundClipId,
      tick,
      sample: tickToSample(tick, sampleRate),
      gain: 0.4 + 0.6 * effect.intensity,
      pan: panFromLon(effect.position.lon),
      channel: 'b',
      origin: 'effect',
    });
  }

  sounds.sort((left, right) => {
    if (left.tick !== right.tick) return left.tick - right.tick;
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  });

  return sounds;
}
