import {
  ArrowState,
  CalloutState,
  CraterDecal,
  EntityState,
  ExplosionState,
  Faction,
  MapPack,
  MuzzleFlashState,
  Order,
  ProjectileState,
  PulseState,
  SoundEventMeta,
  SoundId,
  StrikeMode,
  ZoneVisualState
} from '../core/types';
import { DT } from './engineTime';

export interface CombatContext {
  map: MapPack;
  entities: Map<string, EntityState>;
  arrows: Map<string, ArrowState>;
  zones: Map<string, ZoneVisualState>;
  callouts: Map<string, CalloutState>;
  pulses: PulseState[];
  projectiles: ProjectileState[];
  muzzleFlashes: MuzzleFlashState[];
  explosions: ExplosionState[];
  craters: CraterDecal[];
  nextAutoId: (prefix: string) => string;
  emitSound: (id: SoundId, meta?: SoundEventMeta) => void;
  removeEntityWithCallouts: (entityId: string) => void;
}

export function triggerExplosionEffect(
  ctx: CombatContext,
  x: number,
  y: number,
  maxRadius: number,
  kind: ExplosionState['kind'],
  color: string,
  attackerFaction: Faction,
  dealDamage = true
): void {
  ctx.explosions.push({
    id: ctx.nextAutoId('exp'),
    x,
    y,
    maxRadius,
    progress: 0,
    prevProgress: 0,
    color,
    kind
  });

  if (kind !== 'bullet') {
    ctx.pulses.push({ x, y, color, maxRadius: maxRadius * 1.25, progress: 0, prevProgress: 0 });
  }

  if (kind !== 'bullet' && kind !== 'torpedo') {
    const craterLife = kind === 'shell' ? 5.0 : 7.5;
    ctx.craters.push({
      x,
      y,
      radius: Math.max(6, Math.min(28, maxRadius * (kind === 'shell' ? 0.25 : 0.34))),
      life: craterLife,
      prevLife: craterLife,
      maxLife: craterLife
    });
    if (ctx.craters.length > 60) ctx.craters.shift();
  }

  if (kind !== 'bullet') {
    ctx.emitSound('explosion', { eventKind: 'explosion' });
  }

  if (!dealDamage) return;

  const hitIds: string[] = [];
  for (const ent of ctx.entities.values()) {
    if (ent.kind === 'air' && kind !== 'interceptor' && ent.altitude > 0.35) continue;
    if (ent.faction === attackerFaction) continue;
    if (Math.hypot(ent.x - x, ent.y - y) <= maxRadius + ent.radius * 0.6) {
      hitIds.push(ent.id);
    }
  }
  for (const id of hitIds) {
    ctx.removeEntityWithCallouts(id);
  }
}

export function stepCombatAndEffects(ctx: CombatContext): void {
  for (const c of ctx.craters) {
    c.prevLife = c.life;
    c.life -= DT;
  }
  ctx.craters = ctx.craters.filter((c) => c.life > 0);

  for (const mf of ctx.muzzleFlashes) {
    mf.prevProgress = mf.progress;
    mf.progress += DT * (mf.kind === 'bullet' ? 5.5 : 4.0);
  }
  ctx.muzzleFlashes = ctx.muzzleFlashes.filter((mf) => mf.progress < 1);

  const nextProjectiles: ProjectileState[] = [];
  for (const p of ctx.projectiles) {
    if (p.delaySec && p.delaySec > 0) {
      p.delaySec = Math.max(0, p.delaySec - DT);
      nextProjectiles.push(p);
      continue;
    }
    p.prevX = p.x;
    p.prevY = p.y;
    p.prevProgress = p.progress;
    p.prevAltitude = p.altitude;
    p.progress = Math.min(1, p.progress + DT / Math.max(0.08, p.durationSec));
    p.x = p.startX + (p.targetX - p.startX) * p.progress;
    p.y = p.startY + (p.targetY - p.startY) * p.progress;

    if (p.mode === 'missile') {
      p.altitude = Math.sin(p.progress * Math.PI) * 1.65;
    } else if (p.mode === 'artillery') {
      p.altitude = Math.sin(p.progress * Math.PI) * 0.95;
    } else if (p.mode === 'interceptor') {
      p.altitude = Math.sin(p.progress * Math.PI) * 0.55;
    } else if (p.mode === 'shell') {
      p.altitude = 0.08 * (1 - p.progress * 0.3);
    } else if (p.mode === 'bullet') {
      p.altitude = 0.04;
    } else if (p.mode === 'torpedo') {
      p.altitude = 0;
    } else {
      p.altitude = (1 - p.progress) * 0.9;
    }

    if (p.progress >= 1) {
      const expKind: ExplosionState['kind'] = p.mode === 'bomb' ? 'airstrike' : p.mode;
      triggerExplosionEffect(
        ctx,
        p.targetX,
        p.targetY,
        p.radius,
        expKind,
        p.color,
        p.faction,
        p.impactDamage !== false
      );
    } else {
      nextProjectiles.push(p);
    }
  }
  ctx.projectiles = nextProjectiles;

  for (const ex of ctx.explosions) {
    ex.prevProgress = ex.progress;
    const rate = ex.kind === 'bullet' ? 2.6 : ex.kind === 'shell' ? 1.55 : ex.kind === 'missile' ? 0.95 : 1.15;
    ex.progress += DT * rate;
  }
  ctx.explosions = ctx.explosions.filter((ex) => ex.progress < 1);

  for (const a of ctx.arrows.values()) {
    a.prevProgress = a.progress;
    if (a.progress < 1) a.progress = Math.min(1, a.progress + a.rate * DT);
  }

  for (const z of ctx.zones.values()) {
    z.prevOpacity = z.opacity;
    if (z.opacity !== z.targetOpacity) {
      const diff = z.targetOpacity - z.opacity;
      const step = z.rate * DT;
      z.opacity = Math.abs(diff) <= step ? z.targetOpacity : z.opacity + Math.sign(diff) * step;
    }
  }

  for (const [id, c] of ctx.callouts) {
    if (c.remainingTicks !== null) {
      c.remainingTicks--;
      if (c.remainingTicks <= 0) ctx.callouts.delete(id);
    }
  }

  for (const p of ctx.pulses) {
    p.prevProgress = p.progress;
    p.progress += DT * 0.9;
  }
  ctx.pulses = ctx.pulses.filter((p) => p.progress < 1);
}

export function processStrikeOrder(ctx: CombatContext, ord: Extract<Order, { type: 'strike' }>): void {
  const mode: StrikeMode = ord.mode ?? 'missile';
  const defaultRadius =
    mode === 'missile'
      ? 82
      : mode === 'airstrike'
        ? 68
        : mode === 'artillery'
          ? 58
          : mode === 'torpedo'
            ? 52
            : mode === 'interceptor'
              ? 42
              : mode === 'shell'
                ? 36
                : mode === 'scan'
                  ? 110
                  : 18;
  const radius = ord.radius ?? defaultRadius;
  const defaultColor =
    mode === 'missile'
      ? '#ef4444'
      : mode === 'shell'
        ? '#f97316'
        : mode === 'bullet'
          ? '#facc15'
          : mode === 'artillery'
            ? '#fb923c'
            : mode === 'interceptor'
              ? '#38bdf8'
              : mode === 'torpedo'
                ? '#22d3ee'
                : mode === 'scan'
                  ? '#38bdf8'
                  : '#38bdf8';
  const color = ord.color ?? defaultColor;
  const attacker = ord.attackerId ? ctx.entities.get(ord.attackerId) : undefined;
  const faction = ord.faction ?? attacker?.faction ?? 'blue';

  if (mode === 'scan') {
    const origin = attacker ? { x: attacker.x, y: attacker.y } : ord.to;
    ctx.pulses.push({ x: origin.x, y: origin.y, color, maxRadius: radius, progress: 0, prevProgress: 0 });
    if (Math.hypot(ord.to.x - origin.x, ord.to.y - origin.y) > 12) {
      ctx.pulses.push({ x: ord.to.x, y: ord.to.y, color, maxRadius: radius * 0.65, progress: 0, prevProgress: 0 });
    }
    ctx.emitSound('radar_ping', { actorId: attacker?.actorId, eventKind: 'strike' });
    return;
  }

  if (mode === 'airstrike' && attacker && attacker.kind === 'air') {
    if (attacker.altitude < 0.15) {
      attacker.homeX = attacker.x;
      attacker.homeY = attacker.y;
    }
    attacker.arrivedTick = null;
    attacker.pendingStrike = {
      to: { ...ord.to },
      radius,
      mode: 'airstrike',
      color,
      returnTo: { x: attacker.homeX, y: attacker.homeY }
    };
    attacker.path = [{ ...ord.to }];
    ctx.emitSound('jet_takeoff', { actorId: attacker.actorId, eventKind: 'strike' });
    return;
  }

  const launchPt =
    ord.from ??
    (attacker ? { x: attacker.x, y: attacker.y } : { x: Math.max(30, ord.to.x - 160), y: Math.min(ctx.map.height - 30, ord.to.y + 110) });
  const dx = ord.to.x - launchPt.x;
  const dy = ord.to.y - launchPt.y;
  const dist = Math.hypot(dx, dy);
  const aimAng = dist > 1 ? Math.atan2(dy, dx) : attacker?.angle ?? 0;

  if (attacker && attacker.kind !== 'person' && attacker.kind !== 'building' && dist > 4) {
    attacker.angle = aimAng;
  }

  if (mode === 'bullet') {
    const muzzleDist = attacker ? Math.min(28, attacker.radius * 0.85) : 0;
    const sx = launchPt.x + Math.cos(aimAng) * muzzleDist;
    const sy = launchPt.y + Math.sin(aimAng) * muzzleDist;
    const burstCount = 5;
    for (let b = 0; b < burstCount; b++) {
      const jitterX = Math.sin(b * 2.3 + ord.to.x) * 6;
      const jitterY = Math.cos(b * 1.9 + ord.to.y) * 6;
      ctx.projectiles.push({
        id: ctx.nextAutoId('proj'),
        mode: 'bullet',
        x: sx,
        y: sy,
        prevX: sx,
        prevY: sy,
        startX: sx,
        startY: sy,
        targetX: ord.to.x + jitterX,
        targetY: ord.to.y + jitterY,
        altitude: 0.04,
        prevAltitude: 0.04,
        progress: 0,
        prevProgress: 0,
        delaySec: b * 0.055,
        durationSec: Math.max(0.11, Math.min(0.36, dist / 1150)),
        radius,
        color,
        faction,
        impactDamage: b === 0 || b === burstCount - 1
      });
    }
    ctx.muzzleFlashes.push({
      x: sx,
      y: sy,
      angle: aimAng,
      kind: 'bullet',
      color: 0xfef08a,
      progress: 0,
      prevProgress: 0
    });
    ctx.emitSound('gunfire_burst', { actorId: attacker?.actorId, eventKind: 'strike' });
  } else if (mode === 'shell') {
    const muzzleDist = attacker ? Math.min(34, attacker.radius * 1.05) : 0;
    const sx = launchPt.x + Math.cos(aimAng) * muzzleDist;
    const sy = launchPt.y + Math.sin(aimAng) * muzzleDist;
    const dur = Math.max(0.16, Math.min(0.55, dist / 780));
    ctx.projectiles.push({
      id: ctx.nextAutoId('proj'),
      mode: 'shell',
      x: sx,
      y: sy,
      prevX: sx,
      prevY: sy,
      startX: sx,
      startY: sy,
      targetX: ord.to.x,
      targetY: ord.to.y,
      altitude: 0.08,
      prevAltitude: 0.08,
      progress: 0,
      prevProgress: 0,
      durationSec: dur,
      radius,
      color,
      faction
    });
    ctx.muzzleFlashes.push({
      x: sx,
      y: sy,
      angle: aimAng,
      kind: 'cannon',
      color: 0xf97316,
      progress: 0,
      prevProgress: 0
    });
    ctx.emitSound('cannon_fire', { actorId: attacker?.actorId, eventKind: 'strike' });
  } else if (mode === 'artillery') {
    const muzzleDist = attacker ? Math.min(34, attacker.radius * 1.05) : 0;
    const sx = launchPt.x + Math.cos(aimAng) * muzzleDist;
    const sy = launchPt.y + Math.sin(aimAng) * muzzleDist;
    const dur = Math.max(0.55, Math.min(1.65, dist / 330));
    ctx.projectiles.push({
      id: ctx.nextAutoId('proj'),
      mode: 'artillery',
      x: sx,
      y: sy,
      prevX: sx,
      prevY: sy,
      startX: sx,
      startY: sy,
      targetX: ord.to.x,
      targetY: ord.to.y,
      altitude: 0.1,
      prevAltitude: 0.1,
      progress: 0,
      prevProgress: 0,
      durationSec: dur,
      radius,
      color,
      faction
    });
    ctx.muzzleFlashes.push({
      x: sx,
      y: sy,
      angle: aimAng,
      kind: 'artillery',
      color: 0xfb923c,
      progress: 0,
      prevProgress: 0
    });
    ctx.emitSound('artillery_fire', { actorId: attacker?.actorId, eventKind: 'strike' });
  } else if (mode === 'torpedo') {
    const dur = Math.max(0.45, Math.min(1.85, dist / 310));
    ctx.projectiles.push({
      id: ctx.nextAutoId('proj'),
      mode: 'torpedo',
      x: launchPt.x,
      y: launchPt.y,
      prevX: launchPt.x,
      prevY: launchPt.y,
      startX: launchPt.x,
      startY: launchPt.y,
      targetX: ord.to.x,
      targetY: ord.to.y,
      altitude: 0,
      prevAltitude: 0,
      progress: 0,
      prevProgress: 0,
      durationSec: dur,
      radius,
      color,
      faction
    });
    ctx.emitSound('torpedo_launch', { actorId: attacker?.actorId, eventKind: 'strike' });
  } else if (mode === 'interceptor') {
    const dur = Math.max(0.28, Math.min(1.15, dist / 580));
    ctx.projectiles.push({
      id: ctx.nextAutoId('proj'),
      mode: 'interceptor',
      x: launchPt.x,
      y: launchPt.y,
      prevX: launchPt.x,
      prevY: launchPt.y,
      startX: launchPt.x,
      startY: launchPt.y,
      targetX: ord.to.x,
      targetY: ord.to.y,
      altitude: 0.1,
      prevAltitude: 0.1,
      progress: 0,
      prevProgress: 0,
      durationSec: dur,
      radius,
      color,
      faction
    });
    ctx.muzzleFlashes.push({
      x: launchPt.x,
      y: launchPt.y,
      angle: aimAng,
      kind: 'cannon',
      color: 0x38bdf8,
      progress: 0,
      prevProgress: 0
    });
    ctx.emitSound('missile_launch', { actorId: attacker?.actorId, eventKind: 'strike' });
  } else {
    const dur =
      mode === 'missile'
        ? Math.max(0.85, Math.min(2.6, dist / 240))
        : Math.max(0.45, Math.min(1.2, dist / 320));
    ctx.projectiles.push({
      id: ctx.nextAutoId('proj'),
      mode: mode === 'missile' ? 'missile' : 'bomb',
      x: launchPt.x,
      y: launchPt.y,
      prevX: launchPt.x,
      prevY: launchPt.y,
      startX: launchPt.x,
      startY: launchPt.y,
      targetX: ord.to.x,
      targetY: ord.to.y,
      altitude: 0.1,
      prevAltitude: 0.1,
      progress: 0,
      prevProgress: 0,
      durationSec: dur,
      radius,
      color,
      faction
    });
    if (mode === 'missile') {
      ctx.muzzleFlashes.push({
        x: launchPt.x,
        y: launchPt.y,
        angle: aimAng,
        kind: 'artillery',
        color: 0xf97316,
        progress: 0,
        prevProgress: 0
      });
    }
    ctx.emitSound(mode === 'missile' ? 'missile_launch' : 'jet_takeoff', {
      actorId: attacker?.actorId,
      eventKind: 'strike'
    });
  }
}
