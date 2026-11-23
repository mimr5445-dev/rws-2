import { findPath, isWalkable } from './pathfinding';
import {
  Domain,
  EntityState,
  MapPack,
  ProjectileState,
  SoundEventMeta,
  SoundId
} from '../core/types';
import { DT, TICK_RATE, normalizeAngleDiff } from './engineTime';

export interface MovementStepContext {
  map: MapPack;
  tick: number;
  entities: Map<string, EntityState>;
  projectiles: ProjectileState[];
  repathCooldownTick: Map<string, number>;
  nextAutoId: (prefix: string) => string;
  emitSound: (id: SoundId, meta?: SoundEventMeta) => void;
}

export function isWorldPointWalkable(map: MapPack, x: number, y: number, domain: Domain): boolean {
  if (domain === 'air') return true;
  const gx = Math.floor(x / map.cellSize);
  const gy = Math.floor(y / map.cellSize);
  if (gx < 0 || gy < 0 || gx >= map.cols || gy >= map.rows) return false;
  return isWalkable(map.navGrid[gy * map.cols + gx], domain);
}

export function stepEntitiesMovement(ctx: MovementStepContext): void {
  for (const e of ctx.entities.values()) {
    e.prevX = e.x;
    e.prevY = e.y;
    e.prevAngle = e.angle;
    e.prevAltitude = e.altitude;
    e.prevBankAngle = e.bankAngle;
    e.prevBuildProgress = e.buildProgress;

    if (e.buildProgress < 1) {
      e.buildProgress = Math.min(1, e.buildProgress + e.buildRate * DT);
      if (e.buildProgress >= 1) {
        e.buildProgress = 1;
        e.builtTick = ctx.tick;
        ctx.emitSound('build_complete', { actorId: e.actorId, eventKind: 'build' });
      }
      continue;
    }

    if (e.path.length > 0) {
      e.isMoving = true;
      const target = e.path[0];
      const dx = target.x - e.x;
      const dy = target.y - e.y;
      const dist = Math.hypot(dx, dy);

      // تسارع وانسيابية في السرعة
      const targetSpeed = e.speed;
      const accel = e.kind === 'air' ? e.speed * 2.4 : e.speed * 3.5;
      e.currentSpeed = Math.min(targetSpeed, e.currentSpeed + accel * DT);

      // إقلاع الطائرات تدريجيًا عند التحليق
      if (e.kind === 'air') {
        const remainDist = Math.hypot(
          e.path[e.path.length - 1].x - e.x,
          e.path[e.path.length - 1].y - e.y
        );
        const wantAlt = e.pendingStrike ? 1 : remainDist < 48 ? Math.max(0.15, remainDist / 48) : 1;
        e.altitude += (wantAlt - e.altitude) * Math.min(1, DT * 3.2);
      }

      let turnThrottle = 1;
      if (dist > 0.0001) {
        const desiredAngle = Math.atan2(dy, dx);
        if (e.kind === 'person') {
          // المشاة والمبعوث يبقون بوضعية عمودية سليمة دون انقلاب
          e.angle = 0;
          e.bankAngle = 0;
        } else {
          const diff = normalizeAngleDiff(desiredAngle, e.angle);
          const maxTurn = e.turnRate * DT;
          const stepAngle = Math.abs(diff) <= maxTurn ? diff : Math.sign(diff) * maxTurn;
          e.angle += stepAngle;

          if (e.kind === 'air') {
            const desiredBank = Math.max(-0.42, Math.min(0.42, diff * 0.65));
            e.bankAngle += (desiredBank - e.bankAngle) * Math.min(1, DT * 5);
            if (Math.abs(diff) > 0.65 && dist < 130) {
              turnThrottle = Math.max(0.55, Math.cos(Math.min(Math.PI * 0.42, Math.abs(diff) * 0.7)));
            }
          } else {
            // السفن والمدرعات تخفف سرعتها داخل المنعطفات الحادة لتنعطف بقوس حقيقي بدون شقلبة أو انحراف نحو الشاطئ
            const absDiff = Math.abs(diff);
            const minThrottle = absDiff > 1.25 ? 0.14 : 0.28;
            turnThrottle = Math.max(minThrottle, Math.cos(Math.min(Math.PI * 0.45, absDiff)));
          }
        }
      }

      const moveDist = e.currentSpeed * turnThrottle * DT;
      const nonAirCap = Math.max(moveDist * 1.15, Math.min(12, ctx.map.cellSize * 0.65));
      const wpCaptureRadius = e.path.length > 1 ? Math.max(moveDist, e.kind === 'air' ? 24 : nonAirCap) : moveDist;
      const canSnapToTarget =
        e.domain === 'air' ||
        isWorldPointWalkable(ctx.map, target.x, target.y, e.domain) ||
        !isWorldPointWalkable(ctx.map, e.x, e.y, e.domain);
      if (dist <= wpCaptureRadius && canSnapToTarget) {
        e.x = target.x;
        e.y = target.y;
        e.path.shift();
        if (e.path.length === 0) {
          e.isMoving = false;
          e.currentSpeed = 0;
          e.arrivedTick = ctx.tick;
        }
      } else {
        // للكيانات المتحركة بالاتجاه الأمامي (طائرات/سفن/مركبات)، نمزج الحركة مع متجه الهدف مع حماية كاملة ضد العوائق والمضايق
        const ux = dx / dist;
        const uy = dy / dist;
        const curWalkable = e.domain === 'air' || isWorldPointWalkable(ctx.map, e.x, e.y, e.domain);
        const tryMoveTo = (px: number, py: number): boolean => {
          if (e.domain === 'air' || isWorldPointWalkable(ctx.map, px, py, e.domain) || !curWalkable) {
            e.x = px;
            e.y = py;
            return true;
          }
          return false;
        };

        let moved = false;
        if (e.kind === 'person' || dist < 14) {
          moved = tryMoveTo(e.x + ux * moveDist, e.y + uy * moveDist);
        } else {
          const hx = Math.cos(e.angle);
          const hy = Math.sin(e.angle);
          const blend = dist < 55 ? 0.68 : 0.34;
          const mx = hx * (1 - blend) + ux * blend;
          const my = hy * (1 - blend) + uy * blend;
          const mLen = Math.hypot(mx, my) || 1;
          const candX = e.x + (mx / mLen) * moveDist;
          const candY = e.y + (my / mLen) * moveDist;
          moved = tryMoveTo(candX, candY);
          if (!moved) {
            const desired = Math.atan2(dy, dx);
            e.angle += normalizeAngleDiff(desired, e.angle) * Math.min(1, DT * 7);
            moved = tryMoveTo(e.x + ux * moveDist, e.y + uy * moveDist);
          }
        }

        // إذا اعترضت جزيرة أو ضفة مضيق المسار الحالي: إعادة حساب مسار A* فورًا ثم الانزلاق الساحلي الآمن
        if (!moved && e.domain !== 'air' && e.path.length > 0) {
          const cooldown = ctx.repathCooldownTick.get(e.id) ?? -1;
          if (ctx.tick >= cooldown) {
            ctx.repathCooldownTick.set(e.id, ctx.tick + Math.max(4, Math.round(0.14 * TICK_RATE)));
            const finalGoal = e.path[e.path.length - 1];
            const freshPath = findPath(ctx.map, { x: e.x, y: e.y }, finalGoal, e.domain);
            if (freshPath.length > 0) {
              e.path = freshPath;
              const nt = e.path[0];
              const ndx = nt.x - e.x;
              const ndy = nt.y - e.y;
              const ndist = Math.hypot(ndx, ndy);
              if (ndist > 0.0001) {
                const stepD = Math.min(moveDist, ndist);
                if (e.kind !== 'person') {
                  e.angle += normalizeAngleDiff(Math.atan2(ndy, ndx), e.angle) * Math.min(1, DT * 8);
                }
                moved = tryMoveTo(e.x + (ndx / ndist) * stepD, e.y + (ndy / ndist) * stepD);
              }
            }
          }

          if (!moved && e.path.length > 0) {
            const tNow = e.path[0];
            const tdx = tNow.x - e.x;
            const tdy = tNow.y - e.y;
            const desired = Math.atan2(tdy, tdx);
            const stepSlide = Math.max(0.75, moveDist * 0.8);
            const offsets = [0.35, -0.35, 0.7, -0.7, 1.05, -1.05, 1.4, -1.4, 1.85, -1.85];
            for (const off of offsets) {
              const a = desired + off;
              const sx = e.x + Math.cos(a) * stepSlide;
              const sy = e.y + Math.sin(a) * stepSlide;
              if (isWorldPointWalkable(ctx.map, sx, sy, e.domain)) {
                e.x = sx;
                e.y = sy;
                if (e.kind !== 'person') {
                  e.angle += normalizeAngleDiff(a, e.angle) * Math.min(1, DT * 6);
                }
                moved = true;
                break;
              }
            }
          }
        }
      }

      // إطلاق القذيفة عند وصول الطائرة فوق هدف القصف ثم الالتفاف بقوس واسع والعودة للقاعدة للهبوط
      if (e.pendingStrike) {
        const dStrike = Math.hypot(e.pendingStrike.to.x - e.x, e.pendingStrike.to.y - e.y);
        if (dStrike <= Math.max(28, Math.min(44, e.pendingStrike.radius * 0.5)) || e.path.length === 0) {
          const st = e.pendingStrike;
          e.pendingStrike = null;
          ctx.projectiles.push({
            id: ctx.nextAutoId('proj'),
            mode: 'bomb',
            x: e.x,
            y: e.y,
            prevX: e.x,
            prevY: e.y,
            startX: e.x,
            startY: e.y,
            targetX: st.to.x,
            targetY: st.to.y,
            altitude: e.altitude,
            prevAltitude: e.altitude,
            progress: 0,
            prevProgress: 0,
            durationSec: 0.42,
            radius: st.radius,
            color: st.color,
            faction: e.faction
          });

          // نقطة عبور بعد الهدف + قوس التفاف واسع باتجاه القاعدة ثم العودة إلى نقطة الانطلاق
          const clampX = (vx: number) => Math.max(28, Math.min(ctx.map.width - 28, vx));
          const clampY = (vy: number) => Math.max(28, Math.min(ctx.map.height - 28, vy));
          const flyPast = {
            x: clampX(st.to.x + Math.cos(e.angle) * 72),
            y: clampY(st.to.y + Math.sin(e.angle) * 72)
          };
          const perpLx = -Math.sin(e.angle);
          const perpLy = Math.cos(e.angle);
          const toHomeX = st.returnTo.x - flyPast.x;
          const toHomeY = st.returnTo.y - flyPast.y;
          const side = toHomeX * perpLx + toHomeY * perpLy >= 0 ? 1 : -1;
          const turnWing = {
            x: clampX(flyPast.x + perpLx * side * 96 - Math.cos(e.angle) * 28),
            y: clampY(flyPast.y + perpLy * side * 96 - Math.sin(e.angle) * 28)
          };
          e.path = [flyPast, turnWing, { ...st.returnTo }];
          e.isMoving = true;
        }
      }
    } else {
      e.isMoving = false;
      e.currentSpeed = 0;
      e.bankAngle *= Math.exp(-DT * 4.8);
      // هبوط الطائرة بسلاسة عند القاعدة بعد العودة
      if (e.kind === 'air' && e.altitude > 0) {
        e.altitude = Math.max(0, e.altitude - DT * 2.2);
      }
    }
  }
}
