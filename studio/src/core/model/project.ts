import { z } from 'zod';
import { CameraKeyframeSchema } from './camera';
import { CueSchema } from './cue';
import { EffectSchema } from './effect';
import { EntitySchema } from './entity';
import { IdSchema } from './primitives';
import { TrackSchema } from './track';
import { TriggerSchema } from './trigger';

export const SCHEMA_VERSION = 1 as const;
export const MAX_DURATION_TICKS = 60 * 60 * 60; // ساعة واحدة سقفاً

export const VariableValueSchema = z.union([z.string(), z.number(), z.boolean()]);

export const ProjectShape = {
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: IdSchema,
  title: z.string().min(1).max(200),
  locale: z.enum(['ar', 'en']),
  seed: z.number().int().min(0).max(4294967295),
  map: z.string().min(1).max(128),
  durationTicks: z.number().int().min(1).max(MAX_DURATION_TICKS),
  entities: z.array(EntitySchema).max(5000),
  tracks: z.array(TrackSchema).max(5000),
  triggers: z.array(TriggerSchema).max(2000),
  effects: z.array(EffectSchema).max(2000),
  cues: z.array(CueSchema).max(2000),
  camera: z.array(CameraKeyframeSchema).max(500),
  variables: z.record(z.string(), VariableValueSchema),
} as const;

export type ProjectIssues = { path: (string | number)[]; message: string }[];

/**
 * تحقق عبر الحقول: المعرّفات فريدة، الأزمنة داخل المدة، وكل مرجع يشير إلى موجود.
 * (PRODUCT_SPEC §6، قواعد التحقق)
 */
export function collectProjectIssues(
  project: z.infer<z.ZodObject<typeof ProjectShape>>,
): ProjectIssues {
  const issues: ProjectIssues = [];
  const add = (path: (string | number)[], message: string) => issues.push({ path, message });

  const ids = new Map<string, string>();
  const register = (id: string, where: string) => {
    const existing = ids.get(id);
    if (existing) add([where], `معرّف مكرر "${id}" (مستخدم في ${existing})`);
    else ids.set(id, where);
  };

  project.entities.forEach((entity, index) => register(entity.id, `entities.${index}`));
  project.tracks.forEach((track, index) => register(track.id, `tracks.${index}`));
  project.triggers.forEach((trigger, index) => register(trigger.id, `triggers.${index}`));
  project.effects.forEach((effect, index) => register(effect.id, `effects.${index}`));
  project.cues.forEach((cue, index) => register(cue.id, `cues.${index}`));

  const entityIds = new Set(project.entities.map((entity) => entity.id));
  const trackIds = new Set(project.tracks.map((track) => track.id));
  const triggerIds = new Set(project.triggers.map((trigger) => trigger.id));

  const inRange = (tick: number, path: (string | number)[]) => {
    if (tick < 0 || tick > project.durationTicks) {
      add(path, `الزمن ${tick} خارج المدة [0, ${project.durationTicks}]`);
    }
  };

  project.entities.forEach((entity, index) => {
    if (entity.spawnTick !== undefined) {
      inRange(entity.spawnTick, ['entities', index, 'spawnTick']);
      if (entity.despawnTick !== undefined && entity.despawnTick <= entity.spawnTick) {
        add(['entities', index, 'despawnTick'], 'despawnTick يجب أن يكون بعد spawnTick');
      }
    }
    if (entity.despawnTick !== undefined)
      inRange(entity.despawnTick, ['entities', index, 'despawnTick']);
  });

  project.tracks.forEach((track, index) => {
    if (!entityIds.has(track.targetId)) {
      add(['tracks', index, 'targetId'], `المسار يشير إلى كيان غير موجود: ${track.targetId}`);
    }
    if (track.path) {
      inRange(track.path.startTick, ['tracks', index, 'path', 'startTick']);
      inRange(track.path.endTick, ['tracks', index, 'path', 'endTick']);
    }
    track.keyframes?.forEach((keyframe, keyIndex) => {
      inRange(keyframe.tick, ['tracks', index, 'keyframes', keyIndex, 'tick']);
    });
  });

  const checkAfter = (after: string, path: (string | number)[]) => {
    const separator = after.lastIndexOf('.');
    const target = after.slice(0, separator);
    const event = after.slice(separator + 1);
    if (event === 'arrived' && !entityIds.has(target)) {
      add(path, `after يشير إلى كيان غير موجود: ${target}`);
    }
    if (event === 'done' && !trackIds.has(target) && !triggerIds.has(target)) {
      add(path, `after يشير إلى مسار أو مشغّل غير موجود: ${target}`);
    }
  };

  const checkWhen = (when: { tick: number } | { after: string }, path: (string | number)[]) => {
    if ('tick' in when) inRange(when.tick, [...path, 'tick']);
    else checkAfter(when.after, [...path, 'after']);
  };

  project.triggers.forEach((trigger, index) =>
    checkWhen(trigger.when, ['triggers', index, 'when']),
  );
  project.effects.forEach((effect, index) => checkWhen(effect.at, ['effects', index, 'at']));
  project.cues.forEach((cue, index) => checkWhen(cue.when, ['cues', index, 'when']));

  project.camera.forEach((keyframe, index) => {
    if (keyframe.tick > project.durationTicks) {
      add(['camera', index, 'tick'], `مفتاح كاميرا بعد نهاية المشروع: ${keyframe.tick}`);
    }
  });

  // لا دورات في شروط after: الحارس يبني الرسم ويتحقق منه.
  const cycles = findAfterCycles(project.triggers);
  cycles.forEach((cycle) => add(['triggers'], `دورة في شروط after: ${cycle.join(' → ')}`));

  return issues;
}

/** كشف الدورات في رسم شروط after بين المشغّلات. */
export function findAfterCycles(
  triggers: { id: string; when: { tick: number } | { after: string } }[],
): string[][] {
  const edges = new Map<string, string[]>();
  for (const trigger of triggers) {
    if (!('after' in trigger.when)) continue;
    const target = trigger.when.after.slice(0, trigger.when.after.lastIndexOf('.'));
    const list = edges.get(target) ?? [];
    list.push(trigger.id);
    edges.set(target, list);
  }

  const cycles: string[][] = [];
  const visiting = new Set<string>();
  const done = new Set<string>();
  const stack: string[] = [];

  const visit = (node: string) => {
    if (done.has(node)) return;
    if (visiting.has(node)) {
      const start = stack.indexOf(node);
      cycles.push([...stack.slice(start >= 0 ? start : 0), node]);
      return;
    }
    visiting.add(node);
    stack.push(node);
    for (const next of edges.get(node) ?? []) visit(next);
    stack.pop();
    visiting.delete(node);
    done.add(node);
  };

  for (const node of edges.keys()) visit(node);
  return cycles;
}

export const ProjectSchema = z.strictObject(ProjectShape).superRefine((project, ctx) => {
  for (const issue of collectProjectIssues(project)) {
    ctx.addIssue({ code: 'custom', message: issue.message, path: issue.path });
  }
});

export type Project = z.infer<typeof ProjectSchema>;
