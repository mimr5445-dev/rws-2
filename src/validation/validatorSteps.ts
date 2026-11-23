import { parseStrictSec } from '../engine/engine';
import { ActorPack, MapPack, PointRef, ScenarioStep, ValidationIssue } from '../core/types';
import {
  AFTER_TRIGGER_RE,
  AfterEvent,
  VALID_FACTIONS,
  VALID_SOUNDS,
  VALID_STRIKE_MODES,
  closestKey,
  isPlainObj,
  isValidEntityId
} from './validatorHelpers';
import { LifecycleAnalyzer } from './validatorLifecycle';

interface StepCheckContext {
  map: MapPack;
  actors: Record<string, ActorPack>;
  anchorKeys: string[];
  zoneKeys: string[];
  actorKeys: string[];
  maxRadius: number;
  issues: ValidationIssue[];
  lifecycle: LifecycleAnalyzer;
  seenCreatedIds: Set<string>;
}

function checkPointRef(ctx: StepCheckContext, stepIdx: number, field: string, ref: PointRef | undefined) {
  if (!ref) {
    ctx.issues.push({ stepIndex: stepIdx, field, message: 'الموضع مفقود' });
    return;
  }
  if (typeof ref === 'string') {
    if (!ctx.map.anchors[ref]) {
      const hint = closestKey(ref, ctx.anchorKeys);
      ctx.issues.push({
        stepIndex: stepIdx,
        field,
        message: `نقطة غير معروفة "${ref}"${hint ? ` — هل تقصد "${hint}"؟` : ''}`
      });
    }
    return;
  }
  if (!isPlainObj(ref) || typeof ref.x !== 'number' || typeof ref.y !== 'number' || !Number.isFinite(ref.x) || !Number.isFinite(ref.y)) {
    ctx.issues.push({ stepIndex: stepIdx, field, message: 'الإحداثيات {x, y} غير صالحة' });
    return;
  }
  if (ref.x < 0 || ref.x > ctx.map.width || ref.y < 0 || ref.y > ctx.map.height) {
    ctx.issues.push({
      stepIndex: stepIdx,
      field,
      message: `الإحداثيات (${ref.x}, ${ref.y}) خارج حدود الخريطة [0..${ctx.map.width} × 0..${ctx.map.height}]`
    });
  }
}

function checkActor(ctx: StepCheckContext, stepIdx: number, field: string, name: unknown) {
  if (typeof name !== 'string' || !ctx.actors[name]) {
    const hint = typeof name === 'string' ? closestKey(name, ctx.actorKeys) : null;
    ctx.issues.push({
      stepIndex: stepIdx,
      field,
      message: `كيان غير معروف "${String(name ?? '')}"${hint ? ` — هل تقصد "${hint}"؟` : ''}`
    });
  }
}

function checkDurationField(ctx: StepCheckContext, stepIdx: number, field: string, val: unknown, allowZero = false) {
  const parsed = parseStrictSec(val);
  if (parsed === null || (!allowZero && parsed <= 0)) {
    ctx.issues.push({
      stepIndex: stepIdx,
      field,
      message: allowZero
        ? `المدة "${String(val)}" يجب أن تكون رقمًا غير سالب مثل "1.2s"`
        : `المدة "${String(val)}" يجب أن تكون رقمًا موجبًا أكبر من صفر مثل "1.5s"`
    });
  }
}

function checkStepTimingAndMeta(ctx: StepCheckContext, idx: number, step: ScenarioStep) {
  const hasAt = step.at !== undefined;
  const hasAfter = step.after !== undefined;
  if (!hasAt && !hasAfter) {
    ctx.issues.push({ stepIndex: idx, field: 'at/after', message: 'كل خطوة تحتاج توقيت at أو محفز after' });
  } else if (hasAt && hasAfter) {
    ctx.issues.push({ stepIndex: idx, field: 'at/after', message: 'لا يمكن الجمع بين التوقيت at والمحفز الشرطي after في نفس الخطوة' });
  } else if (hasAt) {
    const parsedAt = parseStrictSec(step.at);
    if (parsedAt === null) {
      ctx.issues.push({
        stepIndex: idx,
        field: 'at',
        message: `توقيت at "${String(step.at)}" غير صالح — يجب أن يكون رقمًا غير سالب مثل "0s" أو "2.5s"`
      });
    }
  } else if (hasAfter) {
    const m = typeof step.after === 'string' ? AFTER_TRIGGER_RE.exec(step.after) : null;
    if (!m) {
      ctx.issues.push({
        stepIndex: idx,
        field: 'after',
        message: `محفز after "${String(step.after)}" يجب أن يكون بصيغة "<entityId>.arrived" أو "<entityId>.built"`
      });
    } else {
      ctx.lifecycle.checkEntityLifecycle(idx, 'after', m[1], 'after', m[2] as AfterEvent);
    }
  }

  if (step.sound !== undefined && (typeof step.sound !== 'string' || !VALID_SOUNDS.has(step.sound))) {
    ctx.issues.push({ stepIndex: idx, field: 'sound', message: `صوت غير معروف "${String(step.sound)}"` });
  }

  if (step.caption !== undefined) {
    if (!isPlainObj(step.caption) || typeof step.caption.text !== 'string') {
      ctx.issues.push({ stepIndex: idx, field: 'caption.text', message: 'caption.text يجب أن يكون نصًا' });
    }
  }

  if (step.camera !== undefined) {
    if (!isPlainObj(step.camera)) {
      ctx.issues.push({ stepIndex: idx, field: 'camera', message: 'camera يجب أن يكون كائنًا' });
    } else {
      checkPointRef(ctx, idx, 'camera.focus', step.camera.focus);
      if (typeof step.camera.zoom !== 'number' || !Number.isFinite(step.camera.zoom) || step.camera.zoom < 0.25 || step.camera.zoom > 4) {
        ctx.issues.push({ stepIndex: idx, field: 'camera.zoom', message: 'camera.zoom يجب أن يكون رقمًا بين 0.25 و 4' });
      }
      if (step.camera.duration !== undefined) {
        checkDurationField(ctx, idx, 'camera.duration', step.camera.duration, true);
      }
    }
  }
}

function checkStepEntityActions(ctx: StepCheckContext, idx: number, step: ScenarioStep) {
  if (step.spawn !== undefined) {
    if (!Array.isArray(step.spawn)) {
      ctx.issues.push({ stepIndex: idx, field: 'spawn', message: 'spawn يجب أن يكون قائمة وحدات' });
    } else {
      for (const s of step.spawn) {
        if (!isPlainObj(s)) {
          ctx.issues.push({ stepIndex: idx, field: 'spawn', message: 'عنصر spawn يجب أن يكون كائنًا صالحًا' });
          continue;
        }
        if (!isValidEntityId(s.id)) {
          ctx.issues.push({ stepIndex: idx, field: 'spawn.id', message: 'معرّف الوحدة في spawn.id مطلوب ولا يقبل فراغات أو نقاط' });
        } else if (ctx.seenCreatedIds.has(s.id)) {
          ctx.issues.push({ stepIndex: idx, field: 'spawn.id', message: `معرّف الوحدة "${s.id}" مكرر — يجب أن يكون فريدًا في السيناريو` });
        } else {
          ctx.seenCreatedIds.add(s.id);
        }
        checkActor(ctx, idx, 'spawn.actor', s.actor);
        checkPointRef(ctx, idx, 'spawn.at', s.at as PointRef | undefined);
        if (s.faction !== undefined && (typeof s.faction !== 'string' || !VALID_FACTIONS.has(s.faction))) {
          ctx.issues.push({ stepIndex: idx, field: 'spawn.faction', message: `فصيل غير معروف "${String(s.faction)}"` });
        }
        if (s.scale !== undefined && (typeof s.scale !== 'number' || !Number.isFinite(s.scale) || s.scale < 0.2 || s.scale > 4)) {
          ctx.issues.push({ stepIndex: idx, field: 'spawn.scale', message: 'معامل الحجم scale يجب أن يكون رقمًا بين 0.2 و 4' });
        }
      }
    }
  }

  if (step.pulse !== undefined) {
    if (!isPlainObj(step.pulse)) {
      ctx.issues.push({ stepIndex: idx, field: 'pulse', message: 'pulse يجب أن يكون كائنًا' });
    } else {
      checkPointRef(ctx, idx, 'pulse.at', step.pulse.at as PointRef | undefined);
      if (step.pulse.radius !== undefined && (typeof step.pulse.radius !== 'number' || !Number.isFinite(step.pulse.radius) || step.pulse.radius <= 0 || step.pulse.radius > ctx.maxRadius)) {
        ctx.issues.push({ stepIndex: idx, field: 'pulse.radius', message: `pulse.radius يجب أن يكون رقمًا موجبًا ضمن 0..${ctx.maxRadius}` });
      }
    }
  }

  if (step.move !== undefined) {
    if (!isPlainObj(step.move)) {
      ctx.issues.push({ stepIndex: idx, field: 'move', message: 'move يجب أن يكون كائنًا' });
    } else {
      ctx.lifecycle.checkEntityLifecycle(idx, 'move.entity', step.move.entity, 'move');
      checkPointRef(ctx, idx, 'move.to', step.move.to as PointRef | undefined);
    }
  }

  if (step.resize !== undefined) {
    if (!isPlainObj(step.resize)) {
      ctx.issues.push({ stepIndex: idx, field: 'resize', message: 'resize يجب أن يكون كائنًا' });
    } else {
      ctx.lifecycle.checkEntityLifecycle(idx, 'resize.entity', step.resize.entity, 'resize');
      if (typeof step.resize.scale !== 'number' || !Number.isFinite(step.resize.scale) || step.resize.scale < 0.2 || step.resize.scale > 4) {
        ctx.issues.push({ stepIndex: idx, field: 'resize.scale', message: 'معامل الحجم scale يجب أن يكون رقمًا بين 0.2 و 4' });
      }
    }
  }

  if (step.remove !== undefined) {
    if (!isPlainObj(step.remove)) {
      ctx.issues.push({ stepIndex: idx, field: 'remove', message: 'remove يجب أن يكون كائنًا' });
    } else {
      ctx.lifecycle.checkEntityLifecycle(idx, 'remove.entity', step.remove.entity, 'remove');
    }
  }

  if (step.construct !== undefined) {
    if (!isPlainObj(step.construct)) {
      ctx.issues.push({ stepIndex: idx, field: 'construct', message: 'construct يجب أن يكون كائنًا' });
    } else {
      if (step.construct.id !== undefined) {
        if (!isValidEntityId(step.construct.id)) {
          ctx.issues.push({ stepIndex: idx, field: 'construct.id', message: 'معرّف construct.id غير صالح (لا يقبل فراغات أو نقاط أو نصًا فارغًا)' });
        } else if (ctx.seenCreatedIds.has(step.construct.id)) {
          ctx.issues.push({ stepIndex: idx, field: 'construct.id', message: `معرّف المنشأة "${step.construct.id}" مكرر مع كيان آخر في السيناريو` });
        } else {
          ctx.seenCreatedIds.add(step.construct.id);
        }
      }
      checkActor(ctx, idx, 'construct.actor', step.construct.actor);
      checkPointRef(ctx, idx, 'construct.at', step.construct.at as PointRef | undefined);
      if (step.construct.faction !== undefined && (typeof step.construct.faction !== 'string' || !VALID_FACTIONS.has(step.construct.faction))) {
        ctx.issues.push({ stepIndex: idx, field: 'construct.faction', message: `فصيل غير معروف "${String(step.construct.faction)}"` });
      }
      if (step.construct.duration !== undefined) {
        checkDurationField(ctx, idx, 'construct.duration', step.construct.duration, false);
      }
      if (step.construct.scale !== undefined && (typeof step.construct.scale !== 'number' || !Number.isFinite(step.construct.scale) || step.construct.scale < 0.2 || step.construct.scale > 4)) {
        ctx.issues.push({ stepIndex: idx, field: 'construct.scale', message: 'معامل الحجم scale يجب أن يكون رقمًا بين 0.2 و 4' });
      }
    }
  }
}

function checkStepOverlaysAndCombat(ctx: StepCheckContext, idx: number, step: ScenarioStep) {
  if (step.draw_arrow !== undefined) {
    if (!isPlainObj(step.draw_arrow)) {
      ctx.issues.push({ stepIndex: idx, field: 'draw_arrow', message: 'draw_arrow يجب أن يكون كائنًا' });
    } else {
      if (typeof step.draw_arrow.id !== 'string' || !step.draw_arrow.id.trim()) {
        ctx.issues.push({ stepIndex: idx, field: 'draw_arrow.id', message: 'معرّف السهم draw_arrow.id مطلوب' });
      }
      checkPointRef(ctx, idx, 'draw_arrow.from', step.draw_arrow.from as PointRef | undefined);
      checkPointRef(ctx, idx, 'draw_arrow.to', step.draw_arrow.to as PointRef | undefined);
      if (step.draw_arrow.duration !== undefined) {
        checkDurationField(ctx, idx, 'draw_arrow.duration', step.draw_arrow.duration, false);
      }
    }
  }

  if (step.zone !== undefined) {
    if (!isPlainObj(step.zone)) {
      ctx.issues.push({ stepIndex: idx, field: 'zone', message: 'zone يجب أن يكون كائنًا' });
    } else {
      if (typeof step.zone.id !== 'string' || !ctx.map.zones[step.zone.id]) {
        const hint = typeof step.zone.id === 'string' ? closestKey(step.zone.id, ctx.zoneKeys) : null;
        ctx.issues.push({
          stepIndex: idx,
          field: 'zone.id',
          message: `منطقة غير معروفة "${String(step.zone.id ?? '')}"${hint ? ` — هل تقصد "${hint}"؟` : ''}`
        });
      }
      if (step.zone.opacity !== undefined && (typeof step.zone.opacity !== 'number' || !Number.isFinite(step.zone.opacity) || step.zone.opacity < 0 || step.zone.opacity > 1)) {
        ctx.issues.push({ stepIndex: idx, field: 'zone.opacity', message: 'zone.opacity يجب أن يكون رقمًا بين 0 و 1' });
      }
      if (step.zone.duration !== undefined) {
        checkDurationField(ctx, idx, 'zone.duration', step.zone.duration, false);
      }
    }
  }

  if (step.callout !== undefined) {
    if (!isPlainObj(step.callout)) {
      ctx.issues.push({ stepIndex: idx, field: 'callout', message: 'callout يجب أن يكون كائنًا' });
    } else {
      if (typeof step.callout.id !== 'string' || !step.callout.id.trim()) {
        ctx.issues.push({ stepIndex: idx, field: 'callout.id', message: 'معرّف البطاقة callout.id مطلوب' });
      }
      const t = step.callout.target;
      if (typeof t !== 'string' || !t.trim()) {
        ctx.issues.push({ stepIndex: idx, field: 'callout.target', message: 'callout.target مطلوب' });
      } else if (!ctx.map.anchors[t]) {
        ctx.lifecycle.checkEntityLifecycle(idx, 'callout.target', t, 'callout');
      }
      if (typeof step.callout.text !== 'string') {
        ctx.issues.push({ stepIndex: idx, field: 'callout.text', message: 'callout.text يجب أن يكون نصًا' });
      }
      if (step.callout.duration !== undefined) {
        checkDurationField(ctx, idx, 'callout.duration', step.callout.duration, false);
      }
    }
  }

  if (step.strike !== undefined) {
    if (!isPlainObj(step.strike)) {
      ctx.issues.push({ stepIndex: idx, field: 'strike', message: 'strike يجب أن يكون كائنًا' });
    } else {
      if (typeof step.strike.mode !== 'string' || !VALID_STRIKE_MODES.has(step.strike.mode)) {
        ctx.issues.push({
          stepIndex: idx,
          field: 'strike.mode',
          message: 'نوع الضربة strike.mode غير صالح'
        });
      }
      if (step.strike.attacker !== undefined) {
        ctx.lifecycle.checkEntityLifecycle(idx, 'strike.attacker', step.strike.attacker, 'strike_attacker');
      }
      if (step.strike.from !== undefined) {
        checkPointRef(ctx, idx, 'strike.from', step.strike.from as PointRef | undefined);
      }
      checkPointRef(ctx, idx, 'strike.to', step.strike.to as PointRef | undefined);
      if (step.strike.radius !== undefined && (typeof step.strike.radius !== 'number' || !Number.isFinite(step.strike.radius) || step.strike.radius <= 0 || step.strike.radius > ctx.maxRadius)) {
        ctx.issues.push({ stepIndex: idx, field: 'strike.radius', message: `strike.radius يجب أن يكون رقمًا موجبًا ضمن 0..${ctx.maxRadius}` });
      }
    }
  }
}

export function validateTimelineSteps(
  timeline: ScenarioStep[],
  map: MapPack,
  actors: Record<string, ActorPack>,
  issues: ValidationIssue[],
  lifecycle: LifecycleAnalyzer
): void {
  const ctx: StepCheckContext = {
    map,
    actors,
    anchorKeys: Object.keys(map.anchors),
    zoneKeys: Object.keys(map.zones),
    actorKeys: Object.keys(actors),
    maxRadius: Math.max(map.width, map.height) * 2,
    issues,
    lifecycle,
    seenCreatedIds: new Set<string>()
  };

  timeline.forEach((rawStep, idx) => {
    if (!isPlainObj(rawStep)) {
      ctx.issues.push({ stepIndex: idx, field: 'step', message: 'الخطوة فارغة أو غير صالحة' });
      return;
    }
    const step = rawStep as unknown as ScenarioStep;
    checkStepTimingAndMeta(ctx, idx, step);
    checkStepEntityActions(ctx, idx, step);
    checkStepOverlaysAndCombat(ctx, idx, step);
  });
}
