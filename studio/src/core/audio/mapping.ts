/**
 * تحويل tick ↔ عينة بلا انحراف (S4.6).
 * معدل العينات 48000 ومعدل التكات 60: كل tick = 800 عينة بالضبط، فلا كسور.
 */
import { TICK_RATE } from '../time';

export const AUDIO_SAMPLE_RATE = 48_000;
export const SAMPLES_PER_TICK = AUDIO_SAMPLE_RATE / TICK_RATE;

export function tickToSample(tick: number, sampleRate = AUDIO_SAMPLE_RATE): number {
  return Math.round((tick * sampleRate) / TICK_RATE);
}

export function sampleToTick(sample: number, sampleRate = AUDIO_SAMPLE_RATE): number {
  return (sample * TICK_RATE) / sampleRate;
}

export function sampleToSeconds(sample: number, sampleRate = AUDIO_SAMPLE_RATE): number {
  return sample / sampleRate;
}

/** عدد العينات لمدة بالمفاتيح: بلا تقريب كسري عندما يقبل 60 القسمة على معدل العينات. */
export function framesForTicks(ticks: number, sampleRate = AUDIO_SAMPLE_RATE): number {
  return Math.round((ticks * sampleRate) / TICK_RATE);
}
