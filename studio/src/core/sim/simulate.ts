/**
 * محاكاة حتمية: أحداث المشروع وحالة الكيانات عند أي tick (S3.3–S3.5).
 * لا تقرأ الزمن الحقيقي ولا العشوائية غير المبذورة.
 */
import type { Position } from '../model/primitives';
import type { Project } from '../model/project';
import type { EntityKind, Side } from '../model/entity';
import { arrivalTicksOf, scheduleTriggers, type TriggerSchedule } from './triggers';
import { evaluateTrack } from './track';

export type SimEventKind = 'arrived' | 'trigger';

export interface SimEvent {
  readonly tick: number;
  readonly kind: SimEventKind;
  readonly id: string;
}

export interface SimResult {
  readonly durationTicks: number;
  readonly events: readonly SimEvent[];
  readonly arrivals: ReadonlyMap<string, number>;
  readonly triggers: TriggerSchedule;
}

export interface EntityState {
  readonly id: string;
  readonly kind: EntityKind;
  readonly side: Side;
  readonly assetId: string;
  readonly position: Position;
  readonly scale: number;
  readonly rotation: number;
  readonly opacity: number;
}

/** كل الأحداث مرتبة بـ(tick, النوع, المعرّف): نفس المشروع يعطي نفس المصفوفة دائماً. */
export function simulate(project: Project): SimResult {
  const arrivals = arrivalTicksOf(project);
  const triggers = scheduleTriggers(project);

  const events: SimEvent[] = [];
  for (const [id, tick] of arrivals) {
    if (tick <= project.durationTicks) events.push({ tick, kind: 'arrived', id });
  }
  for (const [id, tick] of triggers.ticks) {
    if (tick <= project.durationTicks) events.push({ tick, kind: 'trigger', id });
  }

  events.sort((left, right) => {
    if (left.tick !== right.tick) return left.tick - right.tick;
    if (left.kind !== right.kind) return left.kind === 'arrived' ? -1 : 1;
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  });

  return { durationTicks: project.durationTicks, events, arrivals, triggers };
}

/** حالة الكيانات عند tick: الموقع من المسار، والباقي من المفاتيح، مع spawn/despawn. */
export function entityStatesAt(project: Project, tick: number): EntityState[] {
  const states: EntityState[] = [];
  for (const entity of project.entities) {
    if (entity.spawnTick !== undefined && tick < entity.spawnTick) continue;
    if (entity.despawnTick !== undefined && tick >= entity.despawnTick) continue;

    let position: Position = entity.position;
    let scale = entity.scale;
    let opacity = 1;
    let rotation = 0;

    for (const track of project.tracks) {
      if (track.targetId !== entity.id) continue;
      const sample = evaluateTrack(track, tick);
      switch (sample.property) {
        case 'position':
          if (typeof sample.value === 'object') position = sample.value;
          break;
        case 'scale':
          if (typeof sample.value === 'number') scale = sample.value;
          break;
        case 'opacity':
          if (typeof sample.value === 'number') opacity = Math.min(1, Math.max(0, sample.value));
          break;
        case 'rotation':
          if (typeof sample.value === 'number') rotation = sample.value;
          break;
        default:
          break;
      }
    }

    states.push({
      id: entity.id,
      kind: entity.kind,
      side: entity.side,
      assetId: entity.assetId,
      position,
      scale,
      rotation,
      opacity,
    });
  }
  return states;
}

/** هل وقع حدث arrived لكيان عند tick بالضبط؟ (يُستخدم في اختبارات البوابة) */
export function hasArrivalAt(result: SimResult, entityId: string, tick: number): boolean {
  return result.events.some(
    (event) => event.kind === 'arrived' && event.id === entityId && event.tick === tick,
  );
}
