import { z } from 'zod';
import { EasingSchema, IdSchema, PositionSchema, TickSchema } from './primitives';

export const TrackPropertySchema = z.enum(['position', 'scale', 'opacity', 'rotation']);
export type TrackProperty = z.infer<typeof TrackPropertySchema>;

export const KeyframeSchema = z.strictObject({
  tick: TickSchema,
  value: z.union([z.number(), PositionSchema]),
  easing: EasingSchema,
});
export type Keyframe = z.infer<typeof KeyframeSchema>;

export const PathSchema = z.strictObject({
  points: z.array(PositionSchema).min(2).max(512),
  startTick: TickSchema,
  endTick: TickSchema,
  easing: EasingSchema,
});
export type Path = z.infer<typeof PathSchema>;

export const TrackSchema = z
  .strictObject({
    id: IdSchema,
    targetId: IdSchema,
    property: TrackPropertySchema,
    keyframes: z.array(KeyframeSchema).min(2).max(4096).optional(),
    path: PathSchema.optional(),
  })
  .superRefine((track, ctx) => {
    const hasKeyframes = track.keyframes !== undefined;
    const hasPath = track.path !== undefined;
    if (hasKeyframes === hasPath) {
      ctx.addIssue({
        code: 'custom',
        message: 'المسار يحتاج keyframes أو path، واحداً فقط لا الاثنين ولا أياً منهما',
        path: ['keyframes'],
      });
      return;
    }
    if (track.path) {
      if (track.property !== 'position') {
        ctx.addIssue({
          code: 'custom',
          message: 'path متاح لخاصية position فقط',
          path: ['path'],
        });
      }
      if (track.path.endTick <= track.path.startTick) {
        ctx.addIssue({
          code: 'custom',
          message: 'endTick يجب أن يكون أكبر من startTick',
          path: ['path', 'endTick'],
        });
      }
    }
    if (track.keyframes) {
      const isPosition = track.property === 'position';
      track.keyframes.forEach((keyframe, index) => {
        const valueIsPosition = typeof keyframe.value === 'object';
        if (valueIsPosition !== isPosition) {
          ctx.addIssue({
            code: 'custom',
            message: isPosition
              ? 'قيمة المفتاح يجب أن تكون {lon, lat} لخاصية position'
              : 'قيمة المفتاح يجب أن تكون رقماً لهذه الخاصية',
            path: ['keyframes', index, 'value'],
          });
        }
      });
      for (let index = 1; index < track.keyframes.length; index += 1) {
        const previous = track.keyframes[index - 1];
        const current = track.keyframes[index];
        if (previous && current && current.tick <= previous.tick) {
          ctx.addIssue({
            code: 'custom',
            message: 'مفاتيح المسار يجب أن تتزايد في الزمن',
            path: ['keyframes', index, 'tick'],
          });
        }
      }
    }
  });
export type Track = z.infer<typeof TrackSchema>;
