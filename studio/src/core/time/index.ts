/**
 * الزمن في المحاكاة: tick صحيح فقط. لا ساعة حائط هنا (الحتمية، ADR-0003).
 */
export const TICK_RATE = 60 as const;
export const DT = 1 / TICK_RATE;
export const TICKS_PER_SECOND = TICK_RATE;

export function tickToSeconds(tick: number): number {
  return tick / TICK_RATE;
}

export function secondsToTick(seconds: number): number {
  return Math.round(seconds * TICK_RATE);
}

/**
 * تحويل رقم الإطار في التصدير إلى tick المحاكاة.
 * الإطار f عند fps معطى يمثل الزمن f/fps، والـ tick هو التقريب لأقرب 1/60.
 */
export function frameToTick(frame: number, fps: number): number {
  if (!Number.isFinite(fps) || fps <= 0) throw new Error(`fps غير صالح: ${fps}`);
  if (!Number.isFinite(frame) || frame < 0) throw new Error(`رقم إطار غير صالح: ${frame}`);
  return Math.round((frame * TICK_RATE) / fps);
}

export function totalFrames(durationTicks: number, fps: number): number {
  if (!Number.isFinite(fps) || fps <= 0) throw new Error(`fps غير صالح: ${fps}`);
  return Math.round((durationTicks / TICK_RATE) * fps);
}

export function clampTick(tick: number, durationTicks: number): number {
  if (tick < 0) return 0;
  if (tick > durationTicks) return durationTicks;
  return Math.trunc(tick);
}
