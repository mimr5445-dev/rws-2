import { z } from 'zod';
import { IdSchema, WhenSchema } from './primitives';

export const CueSchema = z.strictObject({
  id: IdSchema,
  when: WhenSchema,
  clipId: z.string().min(1).max(128),
  gain: z.number().min(0).max(4),
  pan: z.number().min(-1).max(1),
});
export type Cue = z.infer<typeof CueSchema>;
