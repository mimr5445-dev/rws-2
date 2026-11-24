import { Graphics } from 'pixi.js';
import { frameRateIndependentEase } from '../../core/cameraTransform';
import { ExplosionState, MuzzleFlashState, ProjectileState } from '../../core/types';
import { StudioEngine } from '../../engine/engine';
import { FxParticle, lerp } from './rendererUtils';

function seededRandom(seed: string): () => number {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i++) state = Math.imul(state ^ seed.charCodeAt(i), 16777619);
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function stableRandom(seed: number, index: number): number {
  let value = (seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function spawnImpactParticles(ex: ExplosionState, add: (particle: FxParticle) => void): void {
  const random = seededRandom(ex.id);
  const scale = Math.max(0.65, Math.min(1.55, ex.sourceScale ?? 1));
  const radius = Math.max(8, ex.maxRadius * scale);
  const water = ex.surface === 'water' || ex.kind === 'torpedo';
  const airborne = ex.surface === 'air' || ex.kind === 'interceptor';

  if (ex.kind === 'bullet') {
    const sparks = ex.sourceKind === 'person' ? 5 : 9;
    for (let i = 0; i < sparks; i++) {
      const angle = random() * Math.PI * 2;
      const speed = 24 + random() * 60;
      const life = 0.18 + random() * 0.24;
      add({
        x: ex.x, y: ex.y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        drag: 7, rise: -2, life, maxLife: life,
        startRadius: 1 + random() * 1.8, endRadius: 0.2,
        startAlpha: 0.9, color: i % 2 ? 0xfbbf24 : 0xfff7cc,
        shape: 'spark', rotation: angle, spin: (random() - 0.5) * 8
      });
    }
    return;
  }

  if (water) {
    const count = ex.sourceKind === 'ship' ? 34 : 26;
    for (let i = 0; i < count; i++) {
      const angle = random() * Math.PI * 2;
      const speed = radius * (0.48 + random() * 1.45);
      const life = 0.75 + random() * 0.95;
      const droplet = random() > 0.28;
      add({
        x: ex.x + Math.cos(angle) * radius * 0.08,
        y: ex.y + Math.sin(angle) * radius * 0.04,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.34 - radius * (0.25 + random() * 0.45),
        drag: 2.5, rise: 6, life, maxLife: life,
        startRadius: (2.2 + random() * 4.2) * scale,
        endRadius: 0.5,
        startAlpha: 0.75,
        color: i % 4 === 0 ? 0xf8fafc : i % 3 === 0 ? 0x7dd3fc : 0x38bdf8,
        shape: droplet ? 'droplet' : 'smoke',
        rotation: angle, spin: (random() - 0.5) * 10,
        aspect: 0.6 + random() * 0.5
      });
    }
    return;
  }

  if (airborne) {
    const count = ex.kind === 'interceptor' ? 8 : 12;
    for (let i = 0; i < count; i++) {
      const angle = random() * Math.PI * 2;
      const speed = radius * (0.45 + random() * 1.15);
      const life = 0.75 + random() * 0.8;
      add({
        x: ex.x, y: ex.y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - radius * 0.22,
        drag: 2.8, rise: -10, life, maxLife: life,
        startRadius: 2 + random() * 3, endRadius: 10 + random() * 10,
        startAlpha: 0.48,
        color: i % 2 ? 0x94a3b8 : 0xdbeafe,
        shape: 'smoke', aspect: 1.35 + random() * 0.65
      });
    }
    for (let i = 0; i < 26; i++) {
      const angle = random() * Math.PI * 2;
      const speed = radius * (1.1 + random() * 2.2);
      const life = 0.25 + random() * 0.5;
      add({
        x: ex.x, y: ex.y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        drag: 4.8, rise: -4, life, maxLife: life,
        startRadius: 1 + random() * 2.2, endRadius: 0.15,
        startAlpha: 1,
        color: i % 3 ? 0x7dd3fc : 0xffffff,
        shape: 'spark', rotation: angle, spin: (random() - 0.5) * 16
      });
    }
    return;
  }

  const airstrike = ex.kind === 'airstrike';
  const missile = ex.kind === 'missile';
  const artillery = ex.kind === 'artillery';
  const smokeCount = Math.round((airstrike ? 42 : missile ? 32 : artillery ? 25 : 18) * (ex.sourceKind === 'person' ? 0.65 : 1));
  const smokeColors = [0x26343a, 0x3b4548, 0x57534e, 0x71665b, 0x8a7b6d];
  for (let i = 0; i < smokeCount; i++) {
    const plumeT = i / Math.max(1, smokeCount - 1);
    const angle = random() * Math.PI * 2;
    const radial = random() * radius * (airstrike ? 0.32 : 0.48);
    const life = (airstrike ? 2.25 : missile ? 1.8 : artillery ? 1.45 : 1.2) + random() * (airstrike ? 1.15 : 0.75);
    const puff = (8 + random() * 12) * scale;
    add({
      x: ex.x + Math.cos(angle) * radial + (airstrike ? (random() - 0.5) * radius * 0.5 : 0),
      y: ex.y + Math.sin(angle) * radial * 0.35 - (airstrike ? plumeT * radius * 1.15 : 0),
      vx: Math.cos(angle) * (airstrike ? 8 : 16) + (random() - 0.5) * 20,
      vy: -radius * (airstrike ? 0.2 + plumeT * 0.28 : artillery ? 0.1 : 0.16) - random() * 18,
      drag: 1.65, rise: -(airstrike ? 22 : missile ? 17 : 13), life, maxLife: life,
      startRadius: puff * 0.5,
      endRadius: puff * (airstrike ? 3.0 : missile ? 2.5 : artillery ? 2.0 : 1.7),
      startAlpha: 0.42 + random() * 0.18,
      color: smokeColors[Math.floor(random() * smokeColors.length)],
      shape: artillery ? 'dust' : 'smoke',
      aspect: 1.1 + random() * 1.0
    });
  }

  const debrisCount = artillery ? 30 : airstrike ? 24 : missile ? 20 : 16;
  const debrisColors = artillery || ex.kind === 'shell'
    ? [0x5b4a3e, 0x736052, 0x302b28]
    : [0x292a29, 0x47413b, 0x9a4b22];
  for (let i = 0; i < debrisCount; i++) {
    const angle = random() * Math.PI * 2;
    const speed = radius * (0.75 + random() * 2.1);
    const life = 0.42 + random() * 0.86;
    add({
      x: ex.x, y: ex.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * 0.55 - radius * (0.3 + random() * 0.55),
      drag: 2.3, rise: 0, life, maxLife: life,
      startRadius: 1.5 + random() * 3.6, endRadius: 0.25,
      startAlpha: 0.88,
      color: debrisColors[Math.floor(random() * debrisColors.length)],
      shape: 'debris', rotation: angle, spin: (random() - 0.5) * 16,
      aspect: 1.8 + random() * 2.7
    });
  }

  const emberCount = airstrike || missile ? 34 : artillery ? 24 : 18;
  for (let i = 0; i < emberCount; i++) {
    const angle = random() * Math.PI * 2;
    const speed = radius * (1.0 + random() * 2.3);
    const life = 0.32 + random() * 0.62;
    add({
      x: ex.x, y: ex.y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - radius * 0.32,
      drag: 4.4, rise: -8, life, maxLife: life,
      startRadius: 1.2 + random() * 2.2, endRadius: 0.1,
      startAlpha: 0.96,
      color: i % 4 === 0 ? 0xffffff : i % 3 === 0 ? 0xfef08a : i % 2 ? 0xf97316 : 0xfb923c,
      shape: 'spark', rotation: angle, spin: (random() - 0.5) * 12
    });
  }
}

export interface CombatFxInput {
  engine: StudioEngine;
  alpha: number;
  timeSec: number;
  safeDt: number;
  isPlaying: boolean;
  fxParticles: FxParticle[];
  seenMuzzleFlashes: WeakSet<MuzzleFlashState>;
  seenProjectiles: WeakSet<ProjectileState>;
  seenExplosions: WeakSet<ExplosionState>;
  projectileGraphics: Graphics;
  explosionGraphics: Graphics;
  fxParticleGraphics: Graphics;
}

export function renderCombatFx(input: CombatFxInput): void {
  const {
    engine,
    alpha,
    timeSec,
    safeDt,
    isPlaying,
    fxParticles,
    seenMuzzleFlashes,
    seenProjectiles,
    seenExplosions,
    projectileGraphics,
    explosionGraphics,
    fxParticleGraphics
  } = input;

  projectileGraphics.clear();

  const spawnFxParticle = (item: FxParticle) => {
    if (fxParticles.length < 640) {
      fxParticles.push(item);
    }
  };

  // فلاش الفوهات اللحظي + دخان الإطلاق
  for (const mf of engine.muzzleFlashes) {
    if (!seenMuzzleFlashes.has(mf)) {
      seenMuzzleFlashes.add(mf);
      const puffCount = mf.kind === 'bullet' ? 3 : 8;
      for (let i = 0; i < puffCount; i++) {
        const spread = (Math.random() - 0.5) * (mf.kind === 'bullet' ? 0.55 : 0.95);
        const ang = mf.angle + spread;
        const spd = (mf.kind === 'bullet' ? 28 : 44) * (0.5 + Math.random() * 0.9);
        spawnFxParticle({
          x: mf.x,
          y: mf.y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          drag: 3.4,
          rise: -10,
          life: mf.kind === 'bullet' ? 0.42 : 0.95 + Math.random() * 0.45,
          maxLife: mf.kind === 'bullet' ? 0.42 : 1.4,
          startRadius: mf.kind === 'bullet' ? 2.2 : 4.5,
          endRadius: mf.kind === 'bullet' ? 6 : 16,
          startAlpha: mf.kind === 'bullet' ? 0.45 : 0.65,
          color: i % 3 === 0 ? 0x94a3b8 : 0x475569
        });
      }
      const sparkN = mf.kind === 'bullet' ? 4 : 7;
      for (let i = 0; i < sparkN; i++) {
        const ang = mf.angle + (Math.random() - 0.5) * 0.65;
        const spd = (mf.kind === 'bullet' ? 95 : 130) * (0.6 + Math.random() * 0.7);
        spawnFxParticle({
          x: mf.x,
          y: mf.y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          drag: 5.5,
          rise: 0,
          life: 0.24 + Math.random() * 0.14,
          maxLife: 0.38,
          startRadius: 2.2,
          endRadius: 0.4,
          startAlpha: 0.95,
          color: mf.color === 0x38bdf8 ? 0x7dd3fc : 0xfef08a
        });
      }
    }

    const mfProg = Math.max(0, Math.min(1, lerp(mf.prevProgress, mf.progress, alpha)));
    const fAlpha = Math.max(0, 1 - mfProg);
    const len = (mf.kind === 'cannon' || mf.kind === 'artillery' ? 24 : 14) * (1 - mfProg * 0.3);
    const cos = Math.cos(mf.angle);
    const sin = Math.sin(mf.angle);
    const px = -sin;
    const py = cos;
    const w = mf.kind === 'bullet' ? 3.2 : 6.4;
    projectileGraphics
      .circle(mf.x + cos * 5, mf.y + sin * 5, len * 0.72)
      .fill({ color: mf.color, alpha: fAlpha * 0.34 })
      .poly([
        mf.x + px * w,
        mf.y + py * w,
        mf.x + cos * len,
        mf.y + sin * len,
        mf.x - px * w,
        mf.y - py * w
      ])
      .fill({ color: mf.color, alpha: fAlpha * 0.94 })
      .poly([
        mf.x - px * (w * 1.45),
        mf.y - py * (w * 1.45),
        mf.x + cos * (len * 0.38),
        mf.y + sin * (len * 0.38),
        mf.x + px * (w * 1.45),
        mf.y + py * (w * 1.45),
        mf.x - cos * (len * 0.2),
        mf.y - sin * (len * 0.2)
      ])
      .fill({ color: 0xfef08a, alpha: fAlpha * 0.78 })
      .circle(mf.x + cos * 3.5, mf.y + sin * 3.5, w * 0.92)
      .fill({ color: 0xffffff, alpha: fAlpha });
  }

  for (const p of engine.projectiles) {
    if (p.delaySec && p.delaySec > 0) continue;
    const pProg = Math.max(0, Math.min(1, lerp(p.prevProgress, p.progress, alpha)));
    const gx = lerp(p.prevX, p.x, alpha);
    const gy = lerp(p.prevY, p.y, alpha);
    const smoothAlt = lerp(p.prevAltitude, p.altitude, alpha);
    const arcLift = smoothAlt * 48;
    const vy = gy - arcLift;

    if (!seenProjectiles.has(p)) {
      seenProjectiles.add(p);
      if (p.mode === 'missile' || p.mode === 'artillery' || p.mode === 'interceptor') {
        const isInt = p.mode === 'interceptor';
        for (let i = 0; i < 9; i++) {
          const ang = (i / 9) * Math.PI * 2 + Math.random() * 0.4;
          const spd = 22 + Math.random() * 30;
          spawnFxParticle({
            x: p.startX,
            y: p.startY,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            drag: 2.6,
            rise: -14,
            life: 1.1 + Math.random() * 0.5,
            maxLife: 1.6,
            startRadius: 4.5,
            endRadius: 15,
            startAlpha: 0.65,
            color: isInt ? 0xe0f2fe : i % 2 === 0 ? 0x64748b : 0x94a3b8
          });
        }
      } else if (p.mode === 'torpedo') {
        for (let i = 0; i < 6; i++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 12 + Math.random() * 18;
          spawnFxParticle({
            x: p.startX,
            y: p.startY,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            drag: 3.0,
            rise: 0,
            life: 0.8 + Math.random() * 0.3,
            maxLife: 1.1,
            startRadius: 2.5,
            endRadius: 8,
            startAlpha: 0.6,
            color: 0xe0f2fe
          });
        }
      }
    }

    if (
      isPlaying &&
      (p.mode === 'missile' || p.mode === 'artillery' || p.mode === 'interceptor') &&
      Math.random() < frameRateIndependentEase(38, safeDt)
    ) {
      const isInt = p.mode === 'interceptor';
      spawnFxParticle({
        x: gx + (Math.random() - 0.5) * 2.5,
        y: vy + (Math.random() - 0.5) * 2.5,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        drag: 2.2,
        rise: -11,
        life: p.mode === 'missile' ? 1.35 : 0.9,
        maxLife: p.mode === 'missile' ? 1.35 : 0.9,
        startRadius: p.mode === 'missile' ? 3.8 : 2.6,
        endRadius: p.mode === 'missile' ? 12 : 8,
        startAlpha: 0.52,
        color: isInt ? 0xe0f2fe : Math.random() < 0.3 ? 0xfdba74 : 0x94a3b8
      });
    }

    if (p.mode !== 'bullet') {
      const targetPulse = 0.65 + 0.35 * Math.sin(timeSec * 14);
      const tr = Math.max(9, p.radius * 0.32) * (1 - pProg * 0.4);
      projectileGraphics
        .circle(p.targetX, p.targetY, tr)
        .stroke({ width: 1.4, color: p.color, alpha: 0.6 * targetPulse })
        .moveTo(p.targetX - tr - 3, p.targetY)
        .lineTo(p.targetX - tr + 4, p.targetY)
        .moveTo(p.targetX + tr - 4, p.targetY)
        .lineTo(p.targetX + tr + 3, p.targetY)
        .stroke({ width: 1.4, color: p.color, alpha: 0.7 * targetPulse });
    }

    if (p.mode === 'missile' || p.mode === 'artillery' || p.mode === 'interceptor') {
      const arcPeak = p.mode === 'missile' ? 1.65 : p.mode === 'artillery' ? 0.95 : 0.55;
      const steps = p.mode === 'missile' ? 10 : p.mode === 'artillery' ? 7 : 6;
      for (let s = 1; s <= steps; s++) {
        const bt = Math.max(0, pProg - s * 0.028);
        const bx = p.startX + (p.targetX - p.startX) * bt;
        const bAlt = Math.sin(bt * Math.PI) * arcPeak * 48;
        const by = p.startY + (p.targetY - p.startY) * bt - bAlt;
        const trailCol =
          p.mode === 'interceptor'
            ? s <= 2
              ? 0x38bdf8
              : 0xe0f2fe
            : s <= 2
              ? 0xfbbf24
              : 0xcbd5e1;
        projectileGraphics
          .circle(bx, by, Math.max(1.2, (p.mode === 'missile' ? 4.2 : 3.0) - s * 0.32))
          .fill({ color: trailCol, alpha: Math.max(0.12, 0.72 - s * 0.07) });
      }

      const nextT = Math.min(1, pProg + 0.02);
      const nx = p.startX + (p.targetX - p.startX) * nextT;
      const ny = p.startY + (p.targetY - p.startY) * nextT - Math.sin(nextT * Math.PI) * arcPeak * 48;
      const mAng = Math.atan2(ny - vy, nx - gx);
      const cos = Math.cos(mAng);
      const sin = Math.sin(mAng);
      const px = -sin;
      const py = cos;

      if (p.mode === 'artillery') {
        projectileGraphics
          .ellipse(gx, gy, 3.5, 2)
          .fill({ color: 0x000000, alpha: 0.25 })
          .poly([
            gx - cos * 6 + px * 2,
            vy - sin * 6 + py * 2,
            gx + cos * 7,
            vy + sin * 7,
            gx - cos * 6 - px * 2,
            vy - sin * 6 - py * 2
          ])
          .fill({ color: 0xf97316 })
          .circle(gx - cos * 6, vy - sin * 6, 2.4)
          .fill({ color: 0xfef08a });
      } else {
        const isInt = p.mode === 'interceptor';
        const lenScale = isInt ? 0.72 : 1;
        projectileGraphics
          .ellipse(gx, gy, 8 * lenScale, 2.2)
          .fill({ color: 0x000000, alpha: 0.25 });

        projectileGraphics
          .circle(gx - cos * 11 * lenScale, vy - sin * 11 * lenScale, 6.5 * lenScale)
          .fill({ color: isInt ? 0x38bdf8 : 0xf97316, alpha: 0.34 })
          .poly([
            gx - cos * 9 * lenScale + px * 2,
            vy - sin * 9 * lenScale + py * 2,
            gx - cos * 18 * lenScale,
            vy - sin * 18 * lenScale,
            gx - cos * 9 * lenScale - px * 2,
            vy - sin * 9 * lenScale - py * 2
          ])
          .fill({ color: isInt ? 0x38bdf8 : 0xf97316, alpha: 0.94 })
          .circle(gx - cos * 10 * lenScale, vy - sin * 10 * lenScale, 2.2)
          .fill({ color: 0xfef08a, alpha: 0.98 });

        projectileGraphics
          .poly([
            gx - cos * 9 * lenScale + px * 2.1,
            vy - sin * 9 * lenScale + py * 2.1,
            gx + cos * 6 * lenScale + px * 2.1,
            vy + sin * 6 * lenScale + py * 2.1,
            gx + cos * 12 * lenScale,
            vy + sin * 12 * lenScale,
            gx + cos * 6 * lenScale - px * 2.1,
            vy + sin * 6 * lenScale - py * 2.1,
            gx - cos * 9 * lenScale - px * 2.1,
            vy - sin * 9 * lenScale - py * 2.1
          ])
          .fill({ color: isInt ? 0xe0f2fe : 0xf1f5f9 })
          .stroke({ width: 0.8, color: 0x334155 })
          .poly([
            gx + cos * 5 * lenScale + px * 2.1,
            vy + sin * 5 * lenScale + py * 2.1,
            gx + cos * 12 * lenScale,
            vy + sin * 12 * lenScale,
            gx + cos * 5 * lenScale - px * 2.1,
            vy + sin * 5 * lenScale - py * 2.1
          ])
          .fill({ color: isInt ? 0x0284c7 : 0xdc2626 });
      }
    } else if (p.mode === 'shell') {
      const sAng = Math.atan2(p.targetY - p.startY, p.targetX - p.startX);
      const cos = Math.cos(sAng);
      const sin = Math.sin(sAng);
      const px = -sin;
      const py = cos;
      projectileGraphics
        .moveTo(gx - cos * 28, vy - sin * 28)
        .lineTo(gx, vy)
        .stroke({ width: 3.0, color: 0xf97316, alpha: 0.7 })
        .moveTo(gx - cos * 15, vy - sin * 15)
        .lineTo(gx, vy)
        .stroke({ width: 1.9, color: 0xfef08a, alpha: 0.96 })
        .poly([
          gx - cos * 4 + px * 1.9,
          vy - sin * 4 + py * 1.9,
          gx + cos * 7.5,
          vy + sin * 7.5,
          gx - cos * 4 - px * 1.9,
          vy - sin * 4 - py * 1.9
        ])
        .fill({ color: 0xffffff });
    } else if (p.mode === 'bullet') {
      const bAng = Math.atan2(p.targetY - p.startY, p.targetX - p.startX);
      const cos = Math.cos(bAng);
      const sin = Math.sin(bAng);
      projectileGraphics
        .moveTo(gx - cos * 18, vy - sin * 18)
        .lineTo(gx, vy)
        .stroke({ width: 1.8, color: 0xfacc15, alpha: 0.9 })
        .circle(gx, vy, 1.8)
        .fill({ color: 0xffffff });
    } else if (p.mode === 'torpedo') {
      const tAng = Math.atan2(p.targetY - p.startY, p.targetX - p.startX);
      const cos = Math.cos(tAng);
      const sin = Math.sin(tAng);
      const px = -sin;
      const py = cos;
      for (let s = 1; s <= 7; s++) {
        const bt = Math.max(0, pProg - s * 0.032);
        const bx = p.startX + (p.targetX - p.startX) * bt;
        const by = p.startY + (p.targetY - p.startY) * bt;
        projectileGraphics
          .circle(bx, by, 1.4 + s * 0.35)
          .fill({ color: 0xe0f2fe, alpha: Math.max(0.1, 0.55 - s * 0.07) });
      }
      projectileGraphics
        .poly([
          gx - cos * 6 + px * 1.6,
          gy - sin * 6 + py * 1.6,
          gx + cos * 8,
          gy + sin * 8,
          gx - cos * 6 - px * 1.6,
          gy - sin * 6 - py * 1.6
        ])
        .fill({ color: 0x22d3ee })
        .stroke({ width: 0.8, color: 0x0f172a });
    } else {
      const dropDx = p.targetX - p.startX;
      const dropDy = p.targetY - p.startY + 55;
      const bAng = Math.atan2(dropDy, dropDx);
      const cos = Math.cos(bAng);
      const sin = Math.sin(bAng);
      const px = -sin;
      const py = cos;

      projectileGraphics.ellipse(gx, gy, 4, 2).fill({ color: 0x000000, alpha: 0.28 });
      projectileGraphics
        .poly([
          gx - cos * 6 + px * 3.5,
          vy - sin * 6 + py * 3.5,
          gx - cos * 2 + px * 1.6,
          vy - sin * 2 + py * 1.6,
          gx - cos * 2 - px * 1.6,
          vy - sin * 2 - py * 1.6,
          gx - cos * 6 - px * 3.5,
          vy - sin * 6 - py * 3.5
        ])
        .fill({ color: 0x475569 });
      projectileGraphics
        .poly([
          gx - cos * 4 + px * 1.8,
          vy - sin * 4 + py * 1.8,
          gx + cos * 3 + px * 1.8,
          vy + sin * 3 + py * 1.8,
          gx + cos * 6.5,
          vy + sin * 6.5,
          gx + cos * 3 - px * 1.8,
          vy + sin * 3 - py * 1.8,
          gx - cos * 4 - px * 1.8,
          vy - sin * 4 - py * 1.8
        ])
        .fill({ color: 0x334155 })
        .stroke({ width: 0.9, color: 0x94a3b8 });
      projectileGraphics
        .moveTo(gx + cos * 1.5 + px * 1.8, vy + sin * 1.5 + py * 1.8)
        .lineTo(gx + cos * 1.5 - px * 1.8, vy + sin * 1.5 - py * 1.8)
        .stroke({ width: 1.5, color: 0xfbbf24 });
    }
  }

  // الانفجارات السينمائية متعددة الطبقات
  explosionGraphics.clear();
  for (const ex of engine.explosions) {
    if (!seenExplosions.has(ex)) {
      seenExplosions.add(ex);
      spawnImpactParticles(ex, spawnFxParticle);
    }

    const p = clamp01(lerp(ex.prevProgress, ex.progress, alpha));
    const seed = ex.id.split('').reduce((value, char) => Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0, 2166136261);
    const platformScale = ex.sourceKind === 'air' ? 1.18 : ex.sourceKind === 'ship' ? 1.08 : ex.sourceKind === 'vehicle' ? 1.04 : ex.sourceKind === 'person' ? 0.72 : 1;
    const size = Math.max(7, ex.maxRadius * Math.max(0.65, Math.min(1.5, ex.sourceScale ?? 1)) * platformScale);
    const expansion = 1 - Math.pow(1 - p, 2.6);
    const isWater = ex.surface === 'water' || ex.kind === 'torpedo';
    const isAir = ex.surface === 'air' || ex.kind === 'interceptor';

    if (ex.kind === 'bullet') {
      const flash = Math.exp(-p * 18);
      const radius = size * (0.12 + expansion * 0.42);
      if (flash > 0.04) {
        explosionGraphics
          .circle(ex.x, ex.y, size * (0.08 + flash * 0.08))
          .fill({ color: 0xfff4c2, alpha: flash * 0.86 })
          .circle(ex.x, ex.y, size * (0.035 + flash * 0.035))
          .fill({ color: 0xffffff, alpha: flash });
      }
      explosionGraphics
        .circle(ex.x, ex.y, radius)
        .stroke({ width: Math.max(0.6, size * 0.018) * (1 - p), color: 0xffd66b, alpha: (1 - p) * 0.54 });
      continue;
    }

    if (isWater) {
      const ringRadius = size * (0.18 + expansion * 1.08);
      const waterFade = Math.pow(1 - p, 1.5);
      explosionGraphics
        .ellipse(ex.x, ex.y + size * 0.06, ringRadius * 1.22, ringRadius * 0.42)
        .stroke({ width: Math.max(1.2, size * 0.055 * (1 - p)), color: 0xe0f7ff, alpha: waterFade * 0.78 })
        .ellipse(ex.x, ex.y + size * 0.06, ringRadius * 0.78, ringRadius * 0.27)
        .stroke({ width: Math.max(0.8, size * 0.026 * (1 - p)), color: 0x38bdf8, alpha: waterFade * 0.62 });
      if (p < 0.28) {
        const column = size * (0.16 + expansion * 0.28);
        explosionGraphics
          .ellipse(ex.x, ex.y - column * 0.18, column * 0.64, column * 1.05)
          .fill({ color: 0x93e7ff, alpha: (1 - p / 0.28) * 0.28 })
          .ellipse(ex.x, ex.y - column * 0.46, column * 0.34, column * 0.68)
          .fill({ color: 0xf2fbff, alpha: (1 - p / 0.28) * 0.48 });
      }
      continue;
    }

    if (isAir) {
      const flash = Math.exp(-p * 12);
      const ringRadius = size * (0.15 + expansion * 1.02);
      explosionGraphics
        .circle(ex.x, ex.y, ringRadius)
        .stroke({ width: Math.max(1, size * 0.045 * (1 - p)), color: 0x7dd3fc, alpha: (1 - p) * 0.72 })
        .circle(ex.x, ex.y, ringRadius * 0.72)
        .stroke({ width: 1.1 * (1 - p), color: 0xe0f2fe, alpha: (1 - p) * 0.5 });
      if (flash > 0.04) {
        explosionGraphics.circle(ex.x, ex.y, size * 0.15 * flash).fill({ color: 0xf0f9ff, alpha: flash * 0.78 });
      }
      for (let i = 0; i < 7; i++) {
        const angle = stableRandom(seed, i + 71) * Math.PI * 2;
        const length = size * (0.18 + stableRandom(seed, i + 81) * 0.36) * (1 - p);
        explosionGraphics
          .moveTo(ex.x + Math.cos(angle) * size * 0.06, ex.y + Math.sin(angle) * size * 0.06)
          .lineTo(ex.x + Math.cos(angle) * length, ex.y + Math.sin(angle) * length)
          .stroke({ width: 1.5 * (1 - p), color: i % 2 ? 0x38bdf8 : 0xdbeafe, alpha: (1 - p) * 0.85 });
      }
      continue;
    }

    const airstrike = ex.kind === 'airstrike';
    const missile = ex.kind === 'missile';
    const artillery = ex.kind === 'artillery';
    const fireFade = clamp01(1 - Math.max(0, p - 0.18) / (airstrike || missile ? 0.52 : 0.36));
    const fireRadius = size * (airstrike ? 0.78 : missile ? 0.62 : artillery ? 0.44 : 0.38) * (0.18 + Math.min(1, p / 0.22) * 0.82);
    const flash = Math.exp(-p * 11);
    const shockRadius = size * (0.18 + expansion * 1.06);
    const shockAlpha = Math.pow(1 - p, 1.45);

    // Uneven pressure ring and a very brief hot flash at the impact point.
    explosionGraphics
      .circle(ex.x, ex.y, shockRadius)
      .stroke({ width: Math.max(1, size * (airstrike ? 0.045 : 0.032) * (1 - p)), color: 0xffd8a1, alpha: shockAlpha * 0.6 });
    if (flash > 0.035) {
      explosionGraphics
        .circle(ex.x, ex.y, size * (airstrike ? 0.25 : 0.16) * flash)
        .fill({ color: 0xffa33b, alpha: flash * 0.42 })
        .circle(ex.x, ex.y, size * (airstrike ? 0.12 : 0.085) * flash)
        .fill({ color: 0xfff6d4, alpha: flash * 0.92 });
    }

    if (fireFade > 0.02) {
      const lobes = airstrike || missile ? 14 : 10;
      for (let i = 0; i < lobes; i++) {
        const angle = stableRandom(seed, i * 3 + 1) * Math.PI * 2;
        const offset = fireRadius * (0.15 + stableRandom(seed, i * 3 + 2) * 0.53);
        const lobeRadius = fireRadius * (0.16 + stableRandom(seed, i * 3 + 3) * 0.18);
        const x = ex.x + Math.cos(angle) * offset;
        const y = ex.y + Math.sin(angle) * offset * 0.82 - p * size * 0.08;
        explosionGraphics
          .circle(x, y, lobeRadius * 1.35)
          .fill({ color: artillery ? 0x8a573a : 0x9e3518, alpha: fireFade * 0.48 })
          .circle(x, y, lobeRadius)
          .fill({ color: i % 3 === 0 ? 0xffbb4d : 0xf97316, alpha: fireFade * 0.76 });
      }
      explosionGraphics
        .circle(ex.x, ex.y - p * size * 0.04, fireRadius * 0.5)
        .fill({ color: 0xffad42, alpha: fireFade * 0.78 })
        .circle(ex.x, ex.y - p * size * 0.04, fireRadius * 0.23)
        .fill({ color: 0xfff0b3, alpha: fireFade * (0.68 + flash * 0.3) });
    }

    // A low, irregular ground-hugging dust skirt separates the hot core from the rising smoke.
    const dustFade = Math.pow(1 - p, 1.3) * (artillery || ex.kind === 'shell' ? 0.46 : 0.24);
    if (dustFade > 0.015) {
      const dustRadius = size * (0.2 + expansion * 0.92);
      for (let i = 0; i < 9; i++) {
        const angle = stableRandom(seed, i + 131) * Math.PI * 2;
        const offset = dustRadius * (0.26 + stableRandom(seed, i + 141) * 0.44);
        const puff = size * (0.12 + stableRandom(seed, i + 151) * 0.14) * (0.55 + expansion * 0.7);
        explosionGraphics
          .ellipse(ex.x + Math.cos(angle) * offset, ex.y + Math.sin(angle) * offset * 0.36, puff * 1.55, puff * 0.84)
          .fill({ color: artillery || ex.kind === 'shell' ? 0x806752 : 0x4a423c, alpha: dustFade });
      }
    }
  }

  // تحديث ورسم سحب الدخان والشرر السينمائية
  fxParticleGraphics.clear();
  for (let i = fxParticles.length - 1; i >= 0; i--) {
    const fp = fxParticles[i];
    if (isPlaying) {
      const damp = Math.exp(-fp.drag * safeDt);
      fp.vx *= damp;
      fp.vy *= damp;
      fp.x += fp.vx * safeDt;
      fp.y += (fp.vy + fp.rise) * safeDt;
      fp.rotation = (fp.rotation ?? 0) + (fp.spin ?? 0) * safeDt;
      fp.life -= safeDt;
    }
    if (fp.life <= 0) {
      fxParticles.splice(i, 1);
      continue;
    }
    const t = clamp01(1 - fp.life / fp.maxLife);
    const rad = lerp(fp.startRadius, fp.endRadius, t);
    const fade = fp.startAlpha * (fp.shape === 'smoke' || fp.shape === 'dust' ? 1 - t * 0.72 : (1 - t) * (1 - t));
    if (rad > 0.2 && fade > 0.01) {
      const angle = fp.rotation ?? Math.atan2(fp.vy + fp.rise, fp.vx);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const px = -sin;
      const py = cos;
      if (fp.shape === 'debris') {
        const length = rad * (fp.aspect ?? 2.5);
        const halfWidth = Math.max(0.45, rad * 0.36);
        fxParticleGraphics
          .poly([
            fp.x - cos * length * 0.5 + px * halfWidth,
            fp.y - sin * length * 0.5 + py * halfWidth,
            fp.x + cos * length * 0.5 + px * halfWidth,
            fp.y + sin * length * 0.5 + py * halfWidth,
            fp.x + cos * length * 0.5 - px * halfWidth,
            fp.y + sin * length * 0.5 - py * halfWidth,
            fp.x - cos * length * 0.5 - px * halfWidth,
            fp.y - sin * length * 0.5 - py * halfWidth
          ])
          .fill({ color: fp.color, alpha: fade });
      } else if (fp.shape === 'spark') {
        fxParticleGraphics
          .moveTo(fp.x - cos * rad * 2.4, fp.y - sin * rad * 2.4)
          .lineTo(fp.x + cos * rad * 0.7, fp.y + sin * rad * 0.7)
          .stroke({ width: Math.max(0.65, rad * 0.62), color: fp.color, alpha: fade });
      } else if (fp.shape === 'droplet') {
        const length = rad * (fp.aspect ?? 0.85) * 1.5;
        fxParticleGraphics
          .poly([
            fp.x + cos * length,
            fp.y + sin * length,
            fp.x + cos * length * 0.05 + px * rad * 0.56,
            fp.y + sin * length * 0.05 + py * rad * 0.56,
            fp.x - cos * length * 0.68 + px * rad * 0.42,
            fp.y - sin * length * 0.68 + py * rad * 0.42,
            fp.x - cos * length * 0.92,
            fp.y - sin * length * 0.92,
            fp.x - cos * length * 0.68 - px * rad * 0.42,
            fp.y - sin * length * 0.68 - py * rad * 0.42,
            fp.x + cos * length * 0.05 - px * rad * 0.56,
            fp.y + sin * length * 0.05 - py * rad * 0.56
          ])
          .fill({ color: fp.color, alpha: fade });
      } else if (fp.shape === 'smoke' || fp.shape === 'dust' || fp.aspect !== undefined) {
        const aspect = fp.aspect ?? (fp.shape === 'dust' ? 1.3 : 1.5);
        fxParticleGraphics
          .ellipse(fp.x, fp.y, rad * aspect, rad * (fp.shape === 'dust' ? 0.62 : 0.78))
          .fill({ color: fp.color, alpha: fade });
      } else {
        fxParticleGraphics.circle(fp.x, fp.y, rad).fill({ color: fp.color, alpha: fade });
      }
    }
  }
}
