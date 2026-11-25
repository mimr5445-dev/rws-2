import { z } from 'zod';
import { EasingSchema, LatSchema, LonSchema, TickSchema } from './primitives';

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;

export const CameraKeyframeSchema = z.strictObject({
  tick: TickSchema,
  lon: LonSchema,
  lat: LatSchema,
  zoom: z.number().min(MIN_ZOOM).max(MAX_ZOOM),
  easing: EasingSchema,
});
export type CameraKeyframe = z.infer<typeof CameraKeyframeSchema>;
