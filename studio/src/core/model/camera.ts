import { z } from 'zod';
import { MAX_ZOOM, MIN_ZOOM } from '../camera/limits';
import { EasingSchema, LatSchema, LonSchema, TickSchema } from './primitives';

export { MAX_ZOOM, MIN_ZOOM };

export const CameraKeyframeSchema = z.strictObject({
  tick: TickSchema,
  lon: LonSchema,
  lat: LatSchema,
  zoom: z.number().min(MIN_ZOOM).max(MAX_ZOOM),
  easing: EasingSchema,
});
export type CameraKeyframe = z.infer<typeof CameraKeyframeSchema>;
