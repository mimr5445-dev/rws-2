import { DT, parseStrictSec } from '../engine/engine';
import { ActorPack, ScenarioStep, ValidationIssue } from '../core/types';
import {
  AfterEvent,
  CreationRecord,
  MotionRecord,
  RemovalRecord,
  StepTrigger,
  isPlainObj,
  isValidEntityId,
  parseStepTrigger,
  setsEqual
} from './validatorHelpers';

export type LifecycleCheckOp = 'after' | 'move' | 'resize' | 'remove' | 'callout' | 'strike_attacker';

export interface LifecycleAnalyzer {
  checkEntityLifecycle: (
    stepIdx: number,
    field: string,
    targetId: unknown,
    op: LifecycleCheckOp,
    afterEvent?: AfterEvent
  ) => void;
}

export function buildLifecycleAnalyzer(
  timeline: ScenarioStep[],
  actors: Record<string, ActorPack>,
  issues: ValidationIssue[]
): LifecycleAnalyzer {
  // Pass 1: Index all entity creations, removals, and timed moves for lifecycle causality analysis.
  const stepTriggers: StepTrigger[] = [];
  const creationsById = new Map<string, CreationRecord[]>();
  const removalsById = new Map<string, RemovalRecord[]>();
  const earliestAtMoveById = new Map<string, number>();
  const motionsById = new Map<string, MotionRecord[]>();

  timeline.forEach((rawStep, idx) => {
    if (!isPlainObj(rawStep)) {
      stepTriggers.push({ type: 'invalid' });
      return;
    }
    const step = rawStep as unknown as ScenarioStep;
    const trigger = parseStepTrigger(step);
    stepTriggers.push(trigger);

    if (Array.isArray(step.spawn)) {
      for (const s of step.spawn) {
        if (isPlainObj(s) && isValidEntityId(s.id)) {
          const list = creationsById.get(s.id) ?? [];
          list.push({
            id: s.id,
            stepIndex: idx,
            kind: 'spawn',
            actorId: typeof s.actor === 'string' ? s.actor : '',
            constructDurationSec: 0,
            trigger
          });
          creationsById.set(s.id, list);
        }
      }
    }
    if (isPlainObj(step.construct) && isValidEntityId(step.construct.id)) {
      const dur = parseStrictSec(step.construct.duration);
      const list = creationsById.get(step.construct.id) ?? [];
      list.push({
        id: step.construct.id,
        stepIndex: idx,
        kind: 'construct',
        actorId: typeof step.construct.actor === 'string' ? step.construct.actor : '',
        constructDurationSec: Math.max(0.2, dur ?? 2),
        trigger
      });
      creationsById.set(step.construct.id, list);
    }
    if (isPlainObj(step.remove) && isValidEntityId(step.remove.entity)) {
      const list = removalsById.get(step.remove.entity) ?? [];
      list.push({ id: step.remove.entity, stepIndex: idx, trigger });
      removalsById.set(step.remove.entity, list);
    }
    if (isPlainObj(step.move) && isValidEntityId(step.move.entity)) {
      const list = motionsById.get(step.move.entity) ?? [];
      list.push({ id: step.move.entity, stepIndex: idx, kind: 'move', trigger });
      motionsById.set(step.move.entity, list);
      if (trigger.type === 'at') {
        const prev = earliestAtMoveById.get(step.move.entity);
        if (prev === undefined || trigger.atSec < prev) {
          earliestAtMoveById.set(step.move.entity, trigger.atSec);
        }
      }
    }
    if (isPlainObj(step.strike) && step.strike.mode === 'airstrike' && isValidEntityId(step.strike.attacker)) {
      const list = motionsById.get(step.strike.attacker) ?? [];
      list.push({ id: step.strike.attacker, stepIndex: idx, kind: 'airstrike', trigger });
      motionsById.set(step.strike.attacker, list);
    }
  });

  // Detect indirect circular `after` dependency chains among entity creations.
  const creatorTriggerCycleIds = new Set<string>();
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const detectCycle = (id: string, stack: Set<string>): boolean => {
    if (stack.has(id)) return true;
    if (visited.has(id)) return false;
    visited.add(id);
    stack.add(id);
    const primary = creationsById.get(id)?.[0];
    if (primary?.trigger.type === 'after') {
      if (detectCycle(primary.trigger.targetId, stack)) {
        creatorTriggerCycleIds.add(id);
        stack.delete(id);
        return true;
      }
    }
    stack.delete(id);
    return false;
  };
  for (const id of creationsById.keys()) {
    visiting.clear();
    detectCycle(id, visiting);
  }

  const isTriggerProvablyAfterRemoval = (refTrigger: StepTrigger, refIdx: number, rem: RemovalRecord): boolean => {
    if (rem.stepIndex === refIdx) return false;
    if (refTrigger.type === 'at' && rem.trigger.type === 'at') {
      return refTrigger.atSec > rem.trigger.atSec || (refTrigger.atSec === rem.trigger.atSec && refIdx > rem.stepIndex);
    }
    if (refTrigger.type === 'after' && rem.trigger.type === 'after' && refTrigger.targetId === rem.trigger.targetId && refTrigger.event === rem.trigger.event) {
      return refIdx > rem.stepIndex;
    }
    if (refTrigger.type === 'after' && rem.trigger.type === 'at') {
      const depCreator = creationsById.get(refTrigger.targetId)?.[0];
      if (depCreator?.trigger.type === 'at' && depCreator.trigger.atSec > rem.trigger.atSec) {
        return true;
      }
      if (refTrigger.event === 'arrived') {
        const depMove = earliestAtMoveById.get(refTrigger.targetId);
        if (depCreator?.trigger.type === 'at' && depMove !== undefined && depMove >= rem.trigger.atSec) {
          return true;
        }
      } else if (refTrigger.event === 'built' && depCreator?.trigger.type === 'at') {
        if (depCreator.trigger.atSec + depCreator.constructDurationSec >= rem.trigger.atSec) {
          return true;
        }
      }
    }
    return false;
  };

  // Fixed-point causal reachability for `<entityId>.built` and `<entityId>.arrived`:
  const DT_APPROX = DT;
  const achievableBuilt = new Set<string>();
  const achievableArrived = new Set<string>();
  const builtMinSec = new Map<string, number>();
  const builtMaxSec = new Map<string, number>();
  const arrivedMinFinishSec = new Map<string, number>();
  const builtAncestors = new Map<string, Set<string>>();
  const arrivedAncestors = new Map<string, Set<string>>();

  const triggerEventKey = (t: StepTrigger): string | null =>
    t.type === 'after' ? `${t.targetId}.${t.event}` : null;

  const getTriggerMinSec = (t: StepTrigger): number | null => {
    if (t.type === 'at') return t.atSec;
    if (t.type === 'after') {
      return t.event === 'built'
        ? (builtMinSec.get(t.targetId) ?? null)
        : (arrivedMinFinishSec.get(t.targetId) ?? null);
    }
    return null;
  };

  const getTriggerMaxSec = (t: StepTrigger): number => {
    if (t.type === 'at') return t.atSec;
    if (t.type === 'after') {
      return t.event === 'built' ? (builtMaxSec.get(t.targetId) ?? Infinity) : Infinity;
    }
    return Infinity;
  };

  const getStepPredecessorTriggers = (t: StepTrigger): Set<string> => {
    const out = new Set<string>();
    if (t.type === 'after') {
      const k = `${t.targetId}.${t.event}`;
      out.add(k);
      const anc = t.event === 'built' ? builtAncestors.get(t.targetId) : arrivedAncestors.get(t.targetId);
      if (anc) for (const a of anc) out.add(a);
    }
    return out;
  };

  const isTriggerAchievable = (t: StepTrigger): boolean => {
    if (t.type === 'at') return true;
    if (t.type === 'after') {
      return t.event === 'built' ? achievableBuilt.has(t.targetId) : achievableArrived.has(t.targetId);
    }
    return false;
  };

  const isCreatorProvablyBeforeTrigger = (
    creatorTrigger: StepTrigger,
    creatorStepIdx: number,
    creatorKind: 'spawn' | 'construct',
    refTrigger: StepTrigger,
    refStepIdx: number
  ): boolean => {
    if (!isTriggerAchievable(creatorTrigger) || !isTriggerAchievable(refTrigger)) return false;

    if (refStepIdx === creatorStepIdx) {
      return creatorKind === 'spawn';
    }

    if (
      refTrigger.type === 'after' &&
      creatorTrigger.type === 'after' &&
      refTrigger.targetId === creatorTrigger.targetId &&
      refTrigger.event === creatorTrigger.event
    ) {
      return refStepIdx > creatorStepIdx;
    }

    if (refTrigger.type === 'at' && creatorTrigger.type === 'at') {
      return (
        refTrigger.atSec > creatorTrigger.atSec ||
        (refTrigger.atSec === creatorTrigger.atSec && refStepIdx > creatorStepIdx)
      );
    }

    const creatorKey = triggerEventKey(creatorTrigger);
    if (creatorKey && refTrigger.type === 'after') {
      const refPreds = getStepPredecessorTriggers(refTrigger);
      if (refPreds.has(creatorKey)) {
        return true;
      }
    }

    const cMax = getTriggerMaxSec(creatorTrigger);
    const rMin = getTriggerMinSec(refTrigger);
    if (Number.isFinite(cMax) && rMin !== null && cMax < rMin) {
      return true;
    }

    return false;
  };

  const canMotionExecuteAfterCreation = (m: MotionRecord, creator: CreationRecord): boolean =>
    isCreatorProvablyBeforeTrigger(creator.trigger, creator.stepIndex, creator.kind, m.trigger, m.stepIndex);

  const isMotionBlockedByRemoval = (m: MotionRecord, removals: RemovalRecord[]): boolean => {
    for (const rem of removals) {
      if (rem.stepIndex === m.stepIndex) return true;
      if (isTriggerProvablyAfterRemoval(m.trigger, m.stepIndex, rem)) return true;
    }
    return false;
  };

  let changed = true;
  let fixedPointIters = 0;
  const maxFixedPointIters = (creationsById.size + 1) * 8 + 32;
  while (changed && fixedPointIters++ < maxFixedPointIters) {
    changed = false;

    for (const [id, creations] of creationsById) {
      const creator = creations[0];
      if (!creator || creator.kind !== 'construct') continue;
      const removals = removalsById.get(id) ?? [];
      if (!isTriggerAchievable(creator.trigger) || removals.some((r) => r.stepIndex === creator.stepIndex)) {
        if (achievableBuilt.has(id)) {
          achievableBuilt.delete(id);
          builtMinSec.delete(id);
          builtMaxSec.delete(id);
          builtAncestors.delete(id);
          changed = true;
        }
        continue;
      }

      const cMin = getTriggerMinSec(creator.trigger);
      const cMax = getTriggerMaxSec(creator.trigger);
      const nextMin = cMin !== null ? cMin + creator.constructDurationSec : null;
      const nextMax = Number.isFinite(cMax) ? cMax + creator.constructDurationSec + DT_APPROX * 2 : Infinity;
      const nextAnc = getStepPredecessorTriggers(creator.trigger);

      if (!achievableBuilt.has(id)) {
        achievableBuilt.add(id);
        if (nextMin !== null) builtMinSec.set(id, nextMin);
        builtMaxSec.set(id, nextMax);
        builtAncestors.set(id, nextAnc);
        changed = true;
      } else {
        const prevMin = builtMinSec.get(id);
        const prevMax = builtMaxSec.get(id) ?? Infinity;
        if (
          (nextMin !== null && (prevMin === undefined || nextMin < prevMin)) ||
          nextMax < prevMax ||
          !setsEqual(builtAncestors.get(id), nextAnc)
        ) {
          if (nextMin !== null) builtMinSec.set(id, nextMin);
          builtMaxSec.set(id, nextMax);
          builtAncestors.set(id, nextAnc);
          changed = true;
        }
      }
    }

    for (const [id, creations] of creationsById) {
      const creator = creations[0];
      if (!creator || creator.kind !== 'spawn') continue;
      if (!isTriggerAchievable(creator.trigger)) {
        if (achievableArrived.has(id)) {
          achievableArrived.delete(id);
          arrivedMinFinishSec.delete(id);
          arrivedAncestors.delete(id);
          changed = true;
        }
        continue;
      }

      const actor = actors[creator.actorId];
      if (actor && (actor.kind === 'building' || actor.speed <= 0)) continue;

      const motions = motionsById.get(id) ?? [];
      const removals = removalsById.get(id) ?? [];
      let bestMinFinish: number | null = null;
      let intersectAnc: Set<string> | null = null;
      let canArrive = false;

      for (const m of motions) {
        if (m.kind === 'airstrike' && actor?.kind !== 'air') continue;
        if (m.trigger.type === 'after' && m.trigger.event === 'arrived' && m.trigger.targetId === id) continue;
        if (!canMotionExecuteAfterCreation(m, creator)) continue;
        if (isMotionBlockedByRemoval(m, removals)) continue;
        canArrive = true;
        const mStartMin = getTriggerMinSec(m.trigger);
        if (mStartMin !== null) {
          const finishMin = mStartMin + DT_APPROX;
          if (bestMinFinish === null || finishMin < bestMinFinish) {
            bestMinFinish = finishMin;
          }
        }
        const mPreds = getStepPredecessorTriggers(m.trigger);
        if (intersectAnc === null) {
          intersectAnc = mPreds;
        } else {
          const narrowed = new Set<string>();
          for (const a of intersectAnc) if (mPreds.has(a)) narrowed.add(a);
          intersectAnc = narrowed;
        }
      }

      if (canArrive) {
        const finalAnc = getStepPredecessorTriggers(creator.trigger);
        if (intersectAnc) {
          for (const a of intersectAnc) finalAnc.add(a);
        }
        if (!achievableArrived.has(id)) {
          achievableArrived.add(id);
          if (bestMinFinish !== null) arrivedMinFinishSec.set(id, bestMinFinish);
          arrivedAncestors.set(id, finalAnc);
          changed = true;
        } else {
          const prevMin = arrivedMinFinishSec.get(id);
          if (
            (bestMinFinish !== null && (prevMin === undefined || bestMinFinish < prevMin)) ||
            !setsEqual(arrivedAncestors.get(id), finalAnc)
          ) {
            if (bestMinFinish !== null) arrivedMinFinishSec.set(id, bestMinFinish);
            arrivedAncestors.set(id, finalAnc);
            changed = true;
          }
        }
      } else if (achievableArrived.has(id)) {
        achievableArrived.delete(id);
        arrivedMinFinishSec.delete(id);
        arrivedAncestors.delete(id);
        changed = true;
      }
    }
  }

  const checkEntityLifecycle = (
    stepIdx: number,
    field: string,
    targetId: unknown,
    op: LifecycleCheckOp,
    afterEvent?: AfterEvent
  ) => {
    if (!isValidEntityId(targetId)) {
      issues.push({
        stepIndex: stepIdx,
        field,
        message: op === 'after'
          ? `محفز after غير صالح لوحدة فارغة أو غير صالحة`
          : `معرّف الوحدة في ${field} مفقود أو غير صالح`
      });
      return;
    }

    const creations = creationsById.get(targetId);
    if (!creations || creations.length === 0) {
      if (op === 'callout') {
        issues.push({
          stepIndex: stepIdx,
          field,
          message: `الهدف "${targetId}" ليس مرسى في الخريطة ولا وحدة منشأة`
        });
      } else if (op === 'after') {
        issues.push({
          stepIndex: stepIdx,
          field: 'after',
          message: `محفز after "${targetId}.${afterEvent ?? 'arrived'}" يشير إلى وحدة غير منشأة في السيناريو`
        });
      } else {
        issues.push({
          stepIndex: stepIdx,
          field,
          message: `الوحدة "${targetId}" لم تُنشأ في السيناريو`
        });
      }
      return;
    }

    const creator = creations[0];
    const refTrigger = stepTriggers[stepIdx];

    if (op === 'after' && creator.stepIndex === stepIdx) {
      issues.push({
        stepIndex: stepIdx,
        field: 'after',
        message: `الخطوة لا يمكنها انتظار ${afterEvent ?? 'arrived'} للوحدة "${targetId}" التي تُنشأ في نفس الخطوة`
      });
      return;
    }

    if (op === 'after' && creatorTriggerCycleIds.has(targetId)) {
      issues.push({
        stepIndex: stepIdx,
        field: 'after',
        message: `دورة اعتماد شرطية (after cycle) تمنع إنشاء الوحدة "${targetId}"`
      });
      return;
    }

    if (op === 'after') {
      const actor = actors[creator.actorId];
      if (afterEvent === 'built') {
        if (creator.kind !== 'construct') {
          issues.push({
            stepIndex: stepIdx,
            field: 'after',
            message: `محفز "${targetId}.built" صالح فقط للمنشآت التي تُنشأ بأمر construct`
          });
          return;
        }
      } else {
        if (creator.kind === 'construct') {
          issues.push({
            stepIndex: stepIdx,
            field: 'after',
            message: `المنشأة "${targetId}" ثابتة ولا تتحرك؛ استخدم "${targetId}.built" لاكتمال البناء بدلاً من ".arrived"`
          });
          return;
        }
        if (actor && (actor.kind === 'building' || actor.speed <= 0)) {
          issues.push({
            stepIndex: stepIdx,
            field: 'after',
            message: `الوحدة الثابتة "${targetId}" (${actor.kind}) لا يمكنها الحركة ولا تحقيق محفز arrived`
          });
          return;
        }
        const canMove = achievableArrived.has(targetId);
        if (!canMove) {
          const motions = motionsById.get(targetId) ?? [];
          const hasAnyValidKindMotion = motions.some(
            (m) => m.kind === 'move' || (m.kind === 'airstrike' && actor?.kind === 'air')
          );
          issues.push({
            stepIndex: stepIdx,
            field: 'after',
            message: hasAnyValidKindMotion
              ? `محفز "${targetId}.arrived" غير قابل للتحقق لأن أمر الحركة سابق للإنشاء أو محذوف أو في دورة اعتماد غير قابلة للتنفيذ`
              : `الوحدة "${targetId}" لا تملك أمر حركة قابل للتنفيذ لتحقيق محفز arrived`
          });
          return;
        }
      }
    }

    if (creator.stepIndex === stepIdx && creator.kind === 'construct' && (op === 'move' || op === 'resize' || op === 'remove')) {
      issues.push({
        stepIndex: stepIdx,
        field,
        message: `لا يمكن تنفيذ ${op} على "${targetId}" في نفس خطوة construct قبل اكتمال إنشائها`
      });
      return;
    }

    if (refTrigger.type === 'at' && creator.trigger.type === 'at') {
      if (
        refTrigger.atSec < creator.trigger.atSec ||
        (refTrigger.atSec === creator.trigger.atSec && stepIdx < creator.stepIndex)
      ) {
        issues.push({
          stepIndex: stepIdx,
          field,
          message: `الوحدة "${targetId}" تُستخدم في ت=${refTrigger.atSec}s قبل إنشائها في ت=${creator.trigger.atSec}s`
        });
        return;
      }
    }

    if (refTrigger.type === 'at' && creator.trigger.type === 'after') {
      const cMax = getTriggerMaxSec(creator.trigger);
      if (!Number.isFinite(cMax) || cMax >= refTrigger.atSec) {
        issues.push({
          stepIndex: stepIdx,
          field,
          message: `الوحدة "${targetId}" تُنشأ بعد محفز "${creator.trigger.targetId}.${creator.trigger.event}" ولا يمكن إثبات اكتمال إنشائها قبل ت=${refTrigger.atSec}s`
        });
        return;
      }
    }

    if (op !== 'after' && refTrigger.type === 'after' && isTriggerAchievable(refTrigger)) {
      const sameEntityEvent = refTrigger.targetId === targetId;
      if (!sameEntityEvent && !isCreatorProvablyBeforeTrigger(creator.trigger, creator.stepIndex, creator.kind, refTrigger, stepIdx)) {
        issues.push({
          stepIndex: stepIdx,
          field,
          message: `لا يمكن إثبات إنشاء الوحدة "${targetId}" قبل تنفيذ المحفز "${refTrigger.targetId}.${refTrigger.event}"`
        });
        return;
      }
    }

    const removals = removalsById.get(targetId) ?? [];
    for (const rem of removals) {
      if (rem.stepIndex === stepIdx) {
        if (op === 'remove') continue;
        if (op === 'callout' || op === 'strike_attacker' || op === 'after' || op === 'move' || op === 'resize') {
          issues.push({
            stepIndex: stepIdx,
            field,
            message: `لا يمكن استخدام الوحدة "${targetId}" في نفس الخطوة التي يتم حذفها فيها`
          });
          return;
        }
      } else if (isTriggerProvablyAfterRemoval(refTrigger, stepIdx, rem)) {
        issues.push({
          stepIndex: stepIdx,
          field,
          message: op === 'remove'
            ? `الوحدة "${targetId}" تم حذفها مسبقًا ولا يمكن حذفها مرة أخرى`
            : `الوحدة "${targetId}" تم حذفها مسبقًا ولا يمكن استخدامها بعد الإزالة`
        });
        return;
      }
    }
  };

  return { checkEntityLifecycle };
}
