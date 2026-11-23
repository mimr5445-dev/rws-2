import { Graphics } from 'pixi.js';
import {
  StrikeLockPhase,
  StrikeModeConfig,
  TargetingLockCandidate,
  computeLockedStrikeRadius,
  computeTargetingLockProgress,
  getAggressiveLockStyle
} from '../../core/targetingLock';
import { Point } from '../../core/types';
import { StudioEngine } from '../../engine/engine';
import { lerp } from './rendererUtils';

export interface TargetingRenderInput {
  engine: StudioEngine;
  alpha: number;
  timeSec: number;
  camZoom: number;
  hideUIHelpers: boolean;
  strikeModeConfig: StrikeModeConfig | null;
  lockCandidate: TargetingLockCandidate | null;
  hoverWorldPt: Point | null;
  targetingGraphics: Graphics;
  onStrikeLockChange?: (phase: StrikeLockPhase, targetPt?: Point, targetEntityId?: string | null) => void;
}

export function renderTargetingLock(input: TargetingRenderInput): TargetingLockCandidate | null {
  const {
    engine,
    alpha,
    timeSec,
    camZoom,
    hideUIHelpers,
    strikeModeConfig,
    hoverWorldPt,
    targetingGraphics,
    onStrikeLockChange
  } = input;
  let lockCandidate = input.lockCandidate;

  targetingGraphics.clear();
  if (strikeModeConfig && !hideUIHelpers) {
    const cfg = strikeModeConfig;
    const attackerEnt = engine.entities.get(cfg.entityId);
    const baseColor = parseInt(cfg.accentColor.replace('#', ''), 16) || 0x38bdf8;
    const invZ = 1 / Math.max(0.35, camZoom);

    if (lockCandidate) {
      if (lockCandidate.targetEntityId) {
        const lockedTarget = engine.entities.get(lockCandidate.targetEntityId);
        if (lockedTarget) {
          lockCandidate.worldPt = {
            x: lerp(lockedTarget.prevX, lockedTarget.x, alpha),
            y: lerp(lockedTarget.prevY, lockedTarget.y, alpha)
          };
        } else {
          lockCandidate.targetEntityId = null;
        }
      }

      const holdMs = performance.now() - lockCandidate.startedAtMs;
      const { phase, progress } = computeTargetingLockProgress(holdMs);
      if (phase !== lockCandidate.lastPhase) {
        lockCandidate.lastPhase = phase;
        onStrikeLockChange?.(phase, lockCandidate.worldPt, lockCandidate.targetEntityId ?? undefined);
      }

      const tx = lockCandidate.worldPt.x;
      const ty = lockCandidate.worldPt.y;
      const style = getAggressiveLockStyle(phase, progress, baseColor);
      const strikeR = computeLockedStrikeRadius(cfg.radius, phase);

      if (phase === 'idle') {
        const r = 14 * invZ;
        targetingGraphics
          .circle(tx, ty, r)
          .stroke({ width: 1.6 * invZ, color: style.primaryColor, alpha: 0.78 })
          .circle(tx, ty, 2.5 * invZ)
          .fill({ color: style.innerColor, alpha: 0.9 });
      } else {
        if (attackerEnt) {
          const ax = lerp(attackerEnt.prevX, attackerEnt.x, alpha);
          const ay = lerp(attackerEnt.prevY, attackerEnt.y, alpha);
          const dx = tx - ax;
          const dy = ty - ay;
          const dist = Math.hypot(dx, dy);
          if (dist > 6) {
            const ux = dx / dist;
            const uy = dy / dist;
            const dashLen = 10 * invZ;
            const gapLen = 7 * invZ;
            const step = dashLen + gapLen;
            const offset = (timeSec * 90 * invZ) % step;
            for (let d = offset; d < dist; d += step) {
              const d2 = Math.min(dist, d + dashLen);
              targetingGraphics
                .moveTo(ax + ux * d, ay + uy * d)
                .lineTo(ax + ux * d2, ay + uy * d2);
            }
            targetingGraphics.stroke({
              width: (phase === 'locked' ? 2.4 : 1.7) * invZ,
              color: style.primaryColor,
              alpha: phase === 'locked' ? 0.92 : 0.72
            });
          }
        }

        const pulseWave = phase === 'locked' ? 0.5 + 0.5 * Math.sin(timeSec * 14) : progress * 0.5;
        targetingGraphics
          .circle(tx, ty, strikeR)
          .fill({ color: style.glowColor, alpha: phase === 'locked' ? 0.14 + pulseWave * 0.12 : 0.06 + progress * 0.08 })
          .stroke({
            width: (phase === 'locked' ? 2.4 : 1.5) * invZ,
            color: style.primaryColor,
            alpha: phase === 'locked' ? 0.92 : 0.65
          });

        if (phase === 'locked') {
          const outerPulseR = strikeR * (1.06 + 0.12 * Math.sin(timeSec * 11));
          targetingGraphics
            .circle(tx, ty, outerPulseR)
            .stroke({ width: 1.4 * invZ, color: style.innerColor, alpha: 0.45 + 0.35 * pulseWave });
        }

        const ringR = Math.max(16 * invZ, Math.min(strikeR * 0.78, 34 * invZ));
        if (progress > 0.02) {
          const startAng = -Math.PI / 2;
          const endAng = startAng + Math.PI * 2 * progress;
          targetingGraphics
            .moveTo(tx + Math.cos(startAng) * ringR, ty + Math.sin(startAng) * ringR)
            .arc(tx, ty, ringR, startAng, endAng)
            .stroke({ width: style.lineWidth * invZ, color: style.primaryColor, alpha: 0.96 });
        }

        const rot = timeSec * style.rotationSpeed;
        const bDist = ringR * 1.15 * style.bracketScale;
        const bArm = Math.max(5 * invZ, bDist * 0.42);
        const chevDist = ringR * 1.45 * style.chevronSpread;
        const chevSize = 5.5 * invZ;

        for (let q = 0; q < 4; q++) {
          const a = rot + q * (Math.PI / 2);
          const ca = Math.cos(a);
          const sa = Math.sin(a);
          const ba = a + Math.PI / 4;
          const bca = Math.cos(ba);
          const bsa = Math.sin(ba);
          const cx = tx + bca * bDist;
          const cy = ty + bsa * bDist;
          const t1x = -bsa;
          const t1y = bca;
          targetingGraphics
            .moveTo(cx + t1x * bArm - bca * (bArm * 0.2), cy + t1y * bArm - bsa * (bArm * 0.2))
            .lineTo(cx, cy)
            .lineTo(cx - t1x * bArm - bca * (bArm * 0.2), cy - t1y * bArm - bsa * (bArm * 0.2))
            .stroke({ width: style.lineWidth * invZ, color: style.primaryColor, alpha: 0.95 });

          const tipX = tx + ca * (chevDist - chevSize);
          const tipY = ty + sa * (chevDist - chevSize);
          const baseX = tx + ca * (chevDist + chevSize * 0.7);
          const baseY = ty + sa * (chevDist + chevSize * 0.7);
          const perpX = -sa * chevSize * 0.65;
          const perpY = ca * chevSize * 0.65;
          targetingGraphics
            .poly([tipX, tipY, baseX + perpX, baseY + perpY, baseX - perpX, baseY - perpY])
            .fill({ color: phase === 'locked' ? style.innerColor : style.primaryColor, alpha: 0.92 });
        }

        targetingGraphics
          .circle(tx, ty, (phase === 'locked' ? 3.5 : 2.5) * invZ)
          .fill({ color: style.innerColor, alpha: 0.98 });
      }
    } else if (hoverWorldPt) {
      const hx = hoverWorldPt.x;
      const hy = hoverWorldPt.y;
      const r = Math.min(cfg.radius, 28 * invZ);
      const cross = 8 * invZ;
      targetingGraphics
        .circle(hx, hy, r)
        .stroke({ width: 1.3 * invZ, color: baseColor, alpha: 0.55 })
        .moveTo(hx - cross, hy).lineTo(hx + cross, hy)
        .moveTo(hx, hy - cross).lineTo(hx, hy + cross)
        .stroke({ width: 1.2 * invZ, color: 0xf8fafc, alpha: 0.75 });
    }
  } else if (lockCandidate) {
    if (lockCandidate.lastPhase !== 'idle') {
      onStrikeLockChange?.('idle');
    }
    lockCandidate = null;
  }

  return lockCandidate;
}
