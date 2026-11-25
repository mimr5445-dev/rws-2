/**
 * ترتيب المشغّلات طوبولوجياً وحساب توقيتاتها (S3.2، S3.5).
 * كل شيء هنا حتمي: نفس المشغلين يعطون نفس الترتيب والتوقيت مهما كان ترتيبهم في الملف.
 */
import type { Project } from '../model/project';
import type { Track } from '../model/track';
import type { Trigger } from '../model/trigger';

export class TriggerCycleError extends Error {
  readonly cycle: readonly string[];

  constructor(cycle: readonly string[]) {
    super(`دورة في شروط after: ${cycle.join(' → ')}`);
    this.name = 'TriggerCycleError';
    this.cycle = cycle;
  }
}

export interface TriggerSchedule {
  /** الترتيب الطوبولوجي (المعتمد على الوقت ثم ترتيب التصريح). */
  readonly order: readonly string[];
  /** التوقيت المحسوب لكل مشغّل (غياب المفتاح = لا يقع أبداً لمرجع غير منته). */
  readonly ticks: ReadonlyMap<string, number>;
  /** مشغّلات تعتمد على حدث لا يقع داخل المدة. */
  readonly unresolved: readonly string[];
}

/** tick وصول كل كيان: آخر نهاية مسار موقعي مرتبط به. */
export function arrivalTicksOf(project: Project): Map<string, number> {
  const arrivals = new Map<string, number>();
  for (const track of project.tracks) {
    if (!track.path || track.property !== 'position') continue;
    const previous = arrivals.get(track.targetId);
    if (previous === undefined || track.path.endTick > previous) {
      arrivals.set(track.targetId, track.path.endTick);
    }
  }
  return arrivals;
}

function trackEndTick(track: Track): number | undefined {
  if (track.path) return track.path.endTick;
  const keyframes = track.keyframes ?? [];
  return keyframes.length === 0 ? undefined : keyframes[keyframes.length - 1]?.tick;
}

/**
 * يحسب توقيت كل مشغّل بدقة: `tick` صريح، أو توقيت الحدث المرجعي.
 * الدورات تُرفض بـ TriggerCycleError، والمراجع غير المنتهية تُدرج في `unresolved`.
 */
export function scheduleTriggers(project: Project): TriggerSchedule {
  const arrivals = arrivalTicksOf(project);
  const trackEnds = new Map<string, number | undefined>();
  for (const track of project.tracks) trackEnds.set(track.id, trackEndTick(track));

  const byId = new Map(project.triggers.map((trigger) => [trigger.id, trigger]));
  const declaredIndex = new Map(project.triggers.map((trigger, index) => [trigger.id, index]));

  /** توقيت ثابت من مرجع خارجي (كيان أو مسار)، وnull إن لم يكن له حدث. */
  const constantTick = (ref: string): number | null => {
    const separator = ref.lastIndexOf('.');
    const target = ref.slice(0, separator);
    const kind = ref.slice(separator + 1);
    if (kind === 'arrived') return arrivals.get(target) ?? null;
    return trackEnds.get(target) ?? null;
  };

  const dependencyOf = (trigger: Trigger): string | null => {
    if (!('after' in trigger.when)) return null;
    const separator = trigger.when.after.lastIndexOf('.');
    const target = trigger.when.after.slice(0, separator);
    const kind = trigger.when.after.slice(separator + 1);
    return kind === 'done' && byId.has(target) ? target : null;
  };

  const dependencies = new Map<string, string>();
  const dependents = new Map<string, string[]>();
  for (const trigger of project.triggers) {
    const dependency = dependencyOf(trigger);
    if (dependency === null) continue;
    if (dependency === trigger.id) throw new TriggerCycleError([trigger.id, trigger.id]);
    dependencies.set(trigger.id, dependency);
    const list = dependents.get(dependency) ?? [];
    list.push(trigger.id);
    dependents.set(dependency, list);
  }

  // Kahn بترتيب تصريح ثابت: الجاهزون يُعالجون حسب فهرس التصريح لا حسب ترتيب الإدراج.
  const remaining = new Map(dependencies);
  const ready: string[] = project.triggers
    .filter((trigger) => !remaining.has(trigger.id))
    .map((trigger) => trigger.id);

  const ticks = new Map<string, number>();
  const order: string[] = [];
  const unresolved: string[] = [];

  const resolveTick = (trigger: Trigger, id: string): number | null => {
    if ('tick' in trigger.when) return trigger.when.tick;
    const dependency = dependencies.get(id);
    const own = constantTick(trigger.when.after);
    const fromDependency = dependency === undefined ? null : (ticks.get(dependency) ?? null);
    if (dependency !== undefined && fromDependency === null) return null;
    if (own === null && fromDependency === null) return null;
    return Math.max(own ?? -Infinity, fromDependency ?? -Infinity);
  };

  const resolve = (id: string): void => {
    const trigger = byId.get(id);
    if (!trigger) return;
    const tick = resolveTick(trigger, id);
    if (tick === null) unresolved.push(id);
    else ticks.set(id, tick);
    order.push(id);
  };

  while (ready.length > 0) {
    ready.sort((a, b) => (declaredIndex.get(a) ?? 0) - (declaredIndex.get(b) ?? 0));
    const id = ready.shift()!;
    resolve(id);
    for (const dependent of dependents.get(id) ?? []) {
      remaining.delete(dependent);
      if (!remaining.has(dependent)) ready.push(dependent);
    }
  }

  if (remaining.size > 0) {
    // ما تبقّى في الرسم دورة: نستخرج حلقة واحدة برسالة مفهومة.
    const first = project.triggers.find((trigger) => remaining.has(trigger.id));
    if (first) {
      const path: string[] = [];
      let current: string | undefined = first.id;
      const seen = new Map<string, number>();
      while (current && !seen.has(current)) {
        seen.set(current, path.length);
        path.push(current);
        current = dependencies.get(current);
      }
      if (current) {
        const start = seen.get(current) ?? 0;
        throw new TriggerCycleError([...path.slice(start), current]);
      }
    }
    throw new TriggerCycleError([...remaining.keys()]);
  }

  return { order, ticks, unresolved };
}
