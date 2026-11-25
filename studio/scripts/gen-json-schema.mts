/**
 * يولّد JSON Schema من مخططات zod إلى content/schema/ (S1.1).
 * المصدر هو zod وحده؛ الملفات الناتجة مشتقة ولا تُعدَّل يدوياً.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { ProjectSchema } from '../src/core/model/project.ts';
import { EntitySchema } from '../src/core/model/entity.ts';
import { TrackSchema } from '../src/core/model/track.ts';
import { TriggerSchema } from '../src/core/model/trigger.ts';
import { EffectSchema } from '../src/core/model/effect.ts';
import { CueSchema } from '../src/core/model/cue.ts';
import { CameraKeyframeSchema } from '../src/core/model/camera.ts';

const outDir = path.resolve(import.meta.dirname, '..', 'content/schema');
await mkdir(outDir, { recursive: true });

const targets: [string, z.ZodType][] = [
  ['project', ProjectSchema],
  ['entity', EntitySchema],
  ['track', TrackSchema],
  ['trigger', TriggerSchema],
  ['effect', EffectSchema],
  ['cue', CueSchema],
  ['camera-keyframe', CameraKeyframeSchema],
];

for (const [name, schema] of targets) {
  const jsonSchema = z.toJSONSchema(schema, { target: 'draft-2020-12' });
  const file = path.join(outDir, `${name}.schema.json`);
  await writeFile(file, `${JSON.stringify(jsonSchema, null, 2)}\n`, 'utf8');
  console.log(`✓ content/schema/${name}.schema.json`);
}
