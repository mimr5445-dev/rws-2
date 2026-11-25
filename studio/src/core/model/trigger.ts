import { z } from 'zod';
import { IdSchema, WhenSchema } from './primitives';

export const TriggerSchema = z.strictObject({
  id: IdSchema,
  when: WhenSchema,
});
export type Trigger = z.infer<typeof TriggerSchema>;
