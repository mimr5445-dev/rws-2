import { Graphics } from 'pixi.js';
import { frameRateIndependentEase } from '../../core/cameraTransform';
import { ExplosionState, MuzzleFlashState, ProjectileState } from '../../core/types';
import { StudioEngine } from '../../engine/engine';
import { FxParticle, lerp } from './rendererUtils';

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
      if (ex.kind === 'bullet') {
        for (let i = 0; i < 6; i++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 45 + Math.random() * 65;
          spawnFxParticle({
            x: ex.x,
            y: ex.y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            drag: 6.5,
            rise: 0,
            life: 0.25 + Math.random() * 0.14,
            maxLife: 0.39,
            startRadius: 2.0,
            endRadius: 0.3,
            startAlpha: 0.95,
            color: i % 2 === 0 ? 0xfef08a : 0xfacc15
          });
        }
        spawnFxParticle({
          x: ex.x,
          y: ex.y,
          vx: 0,
          vy: -4,
          drag: 2.5,
          rise: -8,
          life: 0.45,
          maxLife: 0.45,
          startRadius: 3,
          endRadius: 8,
          startAlpha: 0.4,
          color: 0x94a3b8
        });
      } else if (ex.kind === 'torpedo') {
        for (let i = 0; i < 16; i++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 25 + Math.random() * 55;
          spawnFxParticle({
            x: ex.x,
            y: ex.y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 22,
            drag: 2.8,
            rise: 16,
            life: 1.0 + Math.random() * 0.6,
            maxLife: 1.6,
            startRadius: 4 + Math.random() * 4,
            endRadius: 12 + Math.random() * 6,
            startAlpha: 0.72,
            color: i % 3 === 0 ? 0xf8fafc : i % 2 === 0 ? 0xbae6fd : 0x38bdf8
          });
        }
      } else {
        const isHeavy = ex.kind === 'missile' || ex.kind === 'airstrike' || ex.kind === 'artillery';
        const isInt = ex.kind === 'interceptor';
        const smokeN = isHeavy ? 15 : 7;
        const sparkN = isHeavy ? 20 : 12;
        for (let i = 0; i < smokeN; i++) {
          const ang = (i / smokeN) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
          const spd = (isHeavy ? 18 : 14) + Math.random() * (isHeavy ? 42 : 24);
          const dur = (isHeavy ? 1.8 : 1.1) + Math.random() * 1.1;
          spawnFxParticle({
            x: ex.x + Math.cos(ang) * 4,
            y: ex.y + Math.sin(ang) * 4,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            drag: 2.2,
            rise: isHeavy ? -20 : -14,
            life: dur,
            maxLife: dur,
            startRadius: (isHeavy ? 7 : 4.5) + Math.random() * 4,
            endRadius: (isHeavy ? 24 : 14) + Math.random() * 10,
            startAlpha: isInt ? 0.55 : 0.68,
            color: isInt
              ? i % 2 === 0
                ? 0xe0f2fe
                : 0x94a3b8
              : i % 3 === 0
                ? 0x1e293b
                : i % 3 === 1
                  ? 0x334155
                  : 0x475569
          });
        }
        for (let i = 0; i < sparkN; i++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = (isHeavy ? 70 : 55) + Math.random() * (isHeavy ? 115 : 75);
          const dur = 0.42 + Math.random() * 0.42;
          spawnFxParticle({
            x: ex.x,
            y: ex.y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            drag: 4.0,
            rise: -8,
            life: dur,
            maxLife: dur,
            startRadius: isHeavy ? 3.2 : 2.4,
            endRadius: 0.4,
            startAlpha: 1,
            color: isInt
              ? i % 2 === 0
                ? 0xffffff
                : 0x38bdf8
              : i % 3 === 0
                ? 0xffffff
                : i % 3 === 1
                  ? 0xfef08a
                  : 0xf97316
          });
        }
      }
    }

    const p = Math.max(0, Math.min(1, lerp(ex.prevProgress, ex.progress, alpha)));
    if (ex.kind === 'bullet') {
      const sparkR = Math.max(5, ex.maxRadius * 0.5);
      if (p < 0.35) {
        explosionGraphics
          .circle(ex.x, ex.y, sparkR * 0.55 * (1 - p / 0.35))
          .fill({ color: 0xffffff, alpha: 0.95 * (1 - p / 0.35) });
      }
      explosionGraphics
        .circle(ex.x, ex.y, sparkR * (0.4 + p * 0.9))
        .stroke({ width: 1.8 * (1 - p), color: 0xfef08a, alpha: Math.max(0, 1 - p) });
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2 + (ex.x % 2);
        const d = sparkR * (0.3 + p * 0.95);
        explosionGraphics
          .circle(ex.x + Math.cos(ang) * d, ex.y + Math.sin(ang) * d, 2.0 * (1 - p))
          .fill({ color: 0xfacc15, alpha: 1 - p });
      }
      continue;
    }

    const isTorp = ex.kind === 'torpedo';
    const isInt = ex.kind === 'interceptor';
    const isHeavy = ex.kind === 'missile' || ex.kind === 'airstrike' || ex.kind === 'artillery';
    const ringCol = isTorp ? 0xe0f2fe : isInt ? 0x38bdf8 : 0xfef08a;
    const fireCol = isTorp ? 0x38bdf8 : isInt ? 0x0ea5e9 : 0xf97316;

    if (p < 0.24) {
      const flashRatio = 1 - p / 0.24;
      explosionGraphics
        .circle(ex.x, ex.y, ex.maxRadius * (isHeavy ? 1.55 : 1.05) * (0.5 + p * 2.2))
        .fill({ color: isTorp ? 0xe0f2fe : isInt ? 0x7dd3fc : 0xfef08a, alpha: flashRatio * 0.42 })
        .circle(ex.x, ex.y, ex.maxRadius * (isHeavy ? 0.8 : 0.55) * flashRatio)
        .fill({ color: 0xffffff, alpha: flashRatio * 0.92 });
    }

    const rShock = ex.maxRadius * (0.25 + p * 1.15);
    const shockAlpha = Math.max(0, 1 - p) * 0.92;
    explosionGraphics
      .circle(ex.x, ex.y, rShock)
      .stroke({ width: (isHeavy ? 3.8 : 3.0) * (1 - p * 0.6), color: ringCol, alpha: shockAlpha });

    if (p > 0.08 && p < 0.85) {
      const p2 = (p - 0.08) / 0.77;
      explosionGraphics
        .circle(ex.x, ex.y, ex.maxRadius * (0.18 + p2 * 0.82))
        .stroke({ width: 2.2 * (1 - p2), color: fireCol, alpha: (1 - p2) * 0.7 });
    }

    const rFire = ex.maxRadius * (isHeavy ? 0.74 : 0.58) * Math.sin(Math.min(1, p * 1.25) * Math.PI);
    if (rFire > 2) {
      if (!isTorp && !isInt) {
        explosionGraphics
          .circle(ex.x, ex.y, rFire * 1.15)
          .fill({ color: 0xdc2626, alpha: Math.max(0, 0.55 - p * 0.5) });
      }
      explosionGraphics
        .circle(ex.x, ex.y, rFire)
        .fill({ color: fireCol, alpha: Math.max(0, 0.88 - p * 0.7) })
        .circle(ex.x, ex.y, rFire * 0.54)
        .fill({ color: isTorp ? 0xf8fafc : 0xfef08a, alpha: Math.max(0, 0.96 - p * 1.08) });
    }

    const sparkCount = isHeavy ? 10 : 6;
    for (let i = 0; i < sparkCount; i++) {
      const ang = (i / sparkCount) * Math.PI * 2 + (ex.x % 3);
      const dist = ex.maxRadius * (0.2 + p * 0.95) * (0.7 + ((i * 17) % 5) * 0.1);
      const sx = ex.x + Math.cos(ang) * dist;
      const sy = ex.y + Math.sin(ang) * dist - p * 18;
      if (p < 0.75) {
        explosionGraphics.circle(sx, sy, 3.0 * (1 - p)).fill({ color: ringCol, alpha: 1 - p });
      }
      explosionGraphics
        .circle(
          sx * 0.25 + ex.x * 0.75 + Math.cos(ang) * dist * 0.45,
          ex.y + Math.sin(ang) * dist * 0.45 - p * 26,
          8 + p * 12
        )
        .fill({ color: isTorp ? 0xbae6fd : 0x334155, alpha: Math.max(0, (1 - p) * 0.5) });
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
      fp.life -= safeDt;
    }
    if (fp.life <= 0) {
      fxParticles.splice(i, 1);
      continue;
    }
    const t = 1 - fp.life / fp.maxLife;
    const rad = lerp(fp.startRadius, fp.endRadius, t);
    const fade = fp.startAlpha * (1 - t * t);
    if (rad > 0.2 && fade > 0.01) {
      fxParticleGraphics.circle(fp.x, fp.y, rad).fill({ color: fp.color, alpha: fade });
    }
  }
}
