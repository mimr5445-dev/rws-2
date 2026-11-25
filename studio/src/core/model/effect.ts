import { z } from 'zod';
import { IdSchema, PositionSchema, WhenSchema } from './primitives';

export const EffectKindSchema = z.enum([
  'flash',
  'fireball',
  'shockwave',
  'shards',
  'smoke',
  'ember',
  'crater',
  'pulse',
  'shake',
]);
export type EffectKind = z.infer<typeof EffectKindSchema>;

export const EffectSchema = z.strictObject({
  id: IdSchema,
  kind: EffectKindSchema,
  at: WhenSchema,
  position: PositionSchema,
  intensity: z.number().min(0).max(1),
});
export type Effect = z.infer<typeof EffectSchema>;
