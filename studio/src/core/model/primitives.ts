import { z } from 'zod';

/** معرّفات صريحة: حروف وأرقام و`._:-` فقط، بلا مسافات. */
export const IdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/, 'معرّف غير صالح: استخدم حروفاً وأرقاماً و._:- فقط');

export const TickSchema = z.number().int().min(0);

export const LonSchema = z.number().min(-180).max(180);
export const LatSchema = z.number().min(-90).max(90);

export const PositionSchema = z.strictObject({ lon: LonSchema, lat: LatSchema });
export type Position = z.infer<typeof PositionSchema>;

export const EasingSchema = z.enum(['linear', 'easeIn', 'easeOut', 'easeInOut', 'step']);
export type Easing = z.infer<typeof EasingSchema>;

/** مرجع حدث لاحق: "<id>.arrived" أو "<id>.done". */
export const AfterRefSchema = z
  .string()
  .regex(/^[A-Za-z0-9_.:-]+\.(arrived|done)$/, 'مرجع after يجب أن ينتهي بـ .arrived أو .done');
export type AfterRef = z.infer<typeof AfterRefSchema>;

/** وقت الحدث: tick صريح أو بعد حدث سابق. */
export const WhenSchema = z.union([
  z.strictObject({ tick: TickSchema }),
  z.strictObject({ after: AfterRefSchema }),
]);
export type When = z.infer<typeof WhenSchema>;

export function whenTick(when: When): number | null {
  return 'tick' in when ? when.tick : null;
}

export function whenAfter(when: When): AfterRef | null {
  return 'after' in when ? when.after : null;
}
