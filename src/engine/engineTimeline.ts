import {
  ActorPack,
  ArrowState,
  CalloutState,
  CameraTarget,
  EntityState,
  MapPack,
  Order,
  PulseState,
  ScenarioFile,
  ScenarioStep,
  SoundEventMeta,
  SoundId,
  ZoneVisualState
} from '../core/types';
import { TICK_RATE, parseSec, resolvePoint } from './engineTime';

export interface StepExecutionTarget {
  map: MapPack;
  actors: Record<string, ActorPack>;
  entities: Map<string, EntityState>;
  arrows: Map<string, ArrowState>;
  zones: Map<string, ZoneVisualState>;
  callouts: Map<string, CalloutState>;
  pulses: PulseState[];
  reservedExplicitIds: Set<string>;
  usedAutoIds: Set<string>;
  nextConstructId: () => string;
  setCaption: (caption: string) => void;
  advanceCameraTarget: (x: number, y: number, zoom: number, durationSec: number) => void;
  dispatchOrder: (order: Order) => void;
  emitSound: (id: SoundId, meta?: SoundEventMeta) => void;
}

export function collectReservedExplicitIds(scenario: ScenarioFile): Set<string> {
  const reserved = new Set<string>();
  const steps = Array.isArray(scenario.timeline) ? scenario.timeline : [];
  for (const st of steps) {
    if (!st || typeof st !== 'object') continue;
    if (Array.isArray(st.spawn)) {
      for (const s of st.spawn) {
        if (s && typeof s.id === 'string' && s.id.trim()) {
          reserved.add(s.id.trim());
        }
      }
    }
    if (st.construct && typeof st.construct.id === 'string' && st.construct.id.trim()) {
      reserved.add(st.construct.id.trim());
    }
  }
  return reserved;
}

export function executeScenarioStep(target: StepExecutionTarget, st: ScenarioStep): void {
  if (st.caption) target.setCaption(st.caption.text);
  if (st.sound) target.emitSound(st.sound, { eventKind: 'script' });

  if (st.camera) {
    const anchor = resolvePoint(target.map, st.camera.focus);
    if (anchor) {
      target.advanceCameraTarget(anchor.x, anchor.y, st.camera.zoom ?? 1.4, parseSec(st.camera.duration, 1.2));
    }
  }

  if (st.spawn) {
    for (const s of st.spawn) {
      const pt = resolvePoint(target.map, s.at);
      if (pt) {
        target.dispatchOrder({
          type: 'spawn',
          id: s.id,
          actorId: s.actor,
          at: pt,
          faction: s.faction ?? 'blue',
          scale: s.scale
        });
      }
    }
  }

  if (st.move) {
    const pt = resolvePoint(target.map, st.move.to);
    if (pt) target.dispatchOrder({ type: 'move', entityId: st.move.entity, to: pt });
  }

  if (st.resize) {
    target.dispatchOrder({ type: 'resize', entityId: st.resize.entity, scale: st.resize.scale });
  }

  if (st.remove) {
    target.dispatchOrder({ type: 'remove', entityId: st.remove.entity });
  }

  if (st.construct) {
    const pt = resolvePoint(target.map, st.construct.at);
    if (pt) {
      const constructId = st.construct.id ?? target.nextConstructId();
      target.dispatchOrder({
        type: 'construct',
        id: constructId,
        actorId: st.construct.actor,
        at: pt,
        faction: st.construct.faction ?? 'blue',
        durationSec: parseSec(st.construct.duration, 2),
        scale: st.construct.scale
      });
    }
  }

  if (st.strike) {
    const to = resolvePoint(target.map, st.strike.to);
    const from = resolvePoint(target.map, st.strike.from);
    if (to) {
      target.dispatchOrder({
        type: 'strike',
        attackerId: st.strike.attacker,
        mode: st.strike.mode ?? 'missile',
        from,
        to,
        radius: st.strike.radius,
        color: st.strike.color
      });
    }
  }

  if (st.draw_arrow) {
    const from = resolvePoint(target.map, st.draw_arrow.from);
    const to = resolvePoint(target.map, st.draw_arrow.to);
    if (from && to) {
      const dur = Math.max(0.1, parseSec(st.draw_arrow.duration, 1.5));
      target.arrows.set(st.draw_arrow.id, {
        id: st.draw_arrow.id,
        from: { ...from },
        to: { ...to },
        color: st.draw_arrow.color ?? '#ef4444',
        dashed: st.draw_arrow.dashed ?? true,
        progress: 0,
        prevProgress: 0,
        rate: 1 / dur
      });
    }
  }

  if (st.zone) {
    const z = target.zones.get(st.zone.id);
    if (z) {
      const dur = Math.max(0.1, parseSec(st.zone.duration, 1.2));
      z.color = st.zone.color;
      z.targetOpacity = st.zone.opacity ?? 0.35;
      z.rate = Math.abs(z.targetOpacity - z.opacity) / dur || 1;
    }
  }

  if (st.callout) {
    const dur = st.callout.duration ? Math.round(parseSec(st.callout.duration) * TICK_RATE) : null;
    target.callouts.set(st.callout.id, {
      id: st.callout.id,
      target: st.callout.target,
      text: st.callout.text,
      color: st.callout.color ?? '#0ea5e9',
      remainingTicks: dur
    });
  }

  if (st.pulse) {
    const pt = resolvePoint(target.map, st.pulse.at);
    if (pt) {
      target.pulses.push({
        x: pt.x,
        y: pt.y,
        color: st.pulse.color ?? '#ef4444',
        maxRadius: st.pulse.radius ?? 75,
        progress: 0,
        prevProgress: 0
      });
    }
  }
}

export function createCameraTarget(prev: CameraTarget | null, x: number, y: number, zoom: number, durationSec: number): CameraTarget {
  return {
    x,
    y,
    zoom,
    durationSec,
    seq: (prev?.seq ?? 0) + 1
  };
}
