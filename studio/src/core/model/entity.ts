import { z } from 'zod';
import { IdSchema, PositionSchema, TickSchema } from './primitives';

export const EntityKindSchema = z.enum(['unit', 'marker', 'structure', 'zone', 'label']);
export type EntityKind = z.infer<typeof EntityKindSchema>;

export const SideSchema = z.enum(['a', 'b', 'neutral']);
export type Side = z.infer<typeof SideSchema>;

export const EntitySchema = z.strictObject({
  id: IdSchema,
  kind: EntityKindSchema,
  assetId: z.string().min(1).max(128),
  side: SideSchema,
  position: PositionSchema,
  scale: z.number().positive().max(10),
  spawnTick: TickSchema.optional(),
  despawnTick: TickSchema.optional(),
});
export type Entity = z.infer<typeof EntitySchema>;
