import { computeSafeFitZoom, getSafeViewportFrame } from './cameraTransform';
import { StudioEngine } from './engine';
import { EntityState, ExplosionState, Point, ProjectileState } from './types';

export type CinematicFocusKind =
  | 'none'
  | 'explosion'
  | 'projectile'
  | 'airstrike'
  | 'movement'
  | 'arrow'
  | 'pulse'
  | 'establishing';

export interface CinematicDirectorOutput {
  x: number;
  y: number;
  zoom: number;
  focusKind: CinematicFocusKind;
  labelAr: string;
}

export interface ViewportMetrics {
  width: number;
  height: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function zoomForWorldSpan(
  spanW: number,
  spanH: number,
  mapW: number,
  mapH: number,
  vp: ViewportMetrics,
  minMultiplier = 1.0,
  maxMultiplier = 2.4
): number {
  const frame = getSafeViewportFrame(vp.width, vp.height, true);
  const fitZoom = computeSafeFitZoom(mapW, mapH, vp.width, vp.height, true);
  const minZoom = fitZoom * Math.max(1.0, minMultiplier);
  const maxZoom = Math.min(2.6, Math.max(minZoom, fitZoom * maxMultiplier, 0.78));
  const raw = Math.min(frame.safeWidth / Math.max(120, spanW), frame.safeHeight / Math.max(120, spanH));
  return clamp(raw, minZoom, maxZoom);
}

function projectilePriority(p: ProjectileState): number {
  if (p.mode === 'missile') return 6;
  if (p.mode === 'bomb') return 5;
  if (p.mode === 'artillery') return 4;
  if (p.mode === 'torpedo') return 3;
  if (p.mode === 'interceptor') return 2;
  if (p.mode === 'shell') return 1;
  return 0;
}

function explosionPriority(ex: ExplosionState): number {
  if (ex.kind === 'missile' || ex.kind === 'airstrike') return 5;
  if (ex.kind === 'artillery') return 4;
  if (ex.kind === 'torpedo') return 3;
  if (ex.kind === 'interceptor') return 2;
  if (ex.kind === 'shell') return 1;
  return 0;
}

function quadraticBezierPoint(from: Point, ctrl: Point, to: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * from.x + 2 * u * t * ctrl.x + t * t * to.x,
    y: u * u * from.y + 2 * u * t * ctrl.y + t * t * to.y
  };
}

export class CinematicDirector {
  private manualPauseUntilSec = -1;
  private holdUntilSec = -1;
  private aftermathUntilSec = -1;
  private shotMinHoldUntilSec = -1;
  private activeFocusKind: CinematicFocusKind = 'none';
  private lastEventX: number | null = null;
  private lastEventY: number | null = null;
  private lastEventSpan = 460;
  private lastShotZoom = 0;
  private hadAnyEvent = false;
  private trackedProjectileId: string | null = null;
  private trackedExplosionId: string | null = null;
  private trackedStrikerId: string | null = null;

  reset(): void {
    this.manualPauseUntilSec = -1;
    this.holdUntilSec = -1;
    this.aftermathUntilSec = -1;
    this.shotMinHoldUntilSec = -1;
    this.activeFocusKind = 'none';
    this.lastEventX = null;
    this.lastEventY = null;
    this.lastEventSpan = 460;
    this.lastShotZoom = 0;
    this.hadAnyEvent = false;
    this.trackedProjectileId = null;
    this.trackedExplosionId = null;
    this.trackedStrikerId = null;
  }

  notifyUserInteraction(nowSec: number, pauseDurationSec = 4.0): void {
    this.manualPauseUntilSec = Math.max(this.manualPauseUntilSec, nowSec + Math.max(0, pauseDurationSec));
  }

  resumeImmediately(): void {
    this.manualPauseUntilSec = -1;
  }

  isPaused(nowSec: number): boolean {
    return nowSec < this.manualPauseUntilSec;
  }

  evaluate(
    engine: StudioEngine,
    nowSec: number,
    viewport: ViewportMetrics,
    alpha = 1
  ): CinematicDirectorOutput | null {
    if (nowSec < this.manualPauseUntilSec) {
      return null;
    }

    const mapW = Math.max(1, engine.map.width);
    const mapH = Math.max(1, engine.map.height);
    const minMapDim = Math.min(mapW, mapH);

    // 1. أولوية قصوى: الانفجارات الثقيلة (وميض + موجة صدمة + دخان) مع قفل ثابت على موقع الانفجار
    const heavyExplosions = engine.explosions.filter((ex) => ex.kind !== 'bullet');
    const candidateExplosions = heavyExplosions.length > 0 ? heavyExplosions : engine.explosions;
    if (candidateExplosions.length > 0) {
      let bestEx = this.trackedExplosionId
        ? candidateExplosions.find((ex) => ex.id === this.trackedExplosionId)
        : undefined;
      if (!bestEx) {
        bestEx = candidateExplosions[0];
        let bestScore = explosionPriority(bestEx) * 10 + (1 - bestEx.progress);
        for (let i = 1; i < candidateExplosions.length; i++) {
          const ex = candidateExplosions[i];
          const score = explosionPriority(ex) * 10 + (1 - ex.progress);
          if (score > bestScore) {
            bestScore = score;
            bestEx = ex;
          }
        }
        this.trackedExplosionId = bestEx.id;
      }
      const isBullet = bestEx.kind === 'bullet';
      // إذا كنا نركز على ضربة أو قذيفة للتو، لا نقفز للرصاص الصغير بل للانفجارات المؤثرة فقط
      if (!isBullet || this.activeFocusKind === 'none' || this.activeFocusKind === 'explosion' || nowSec >= this.shotMinHoldUntilSec) {
        const span = clamp(
          Math.max(minMapDim * 0.42, bestEx.maxRadius * 6.2),
          minMapDim * 0.36,
          minMapDim * 0.78
        );
        const zoom = zoomForWorldSpan(span, span, mapW, mapH, viewport, 1.0, 2.25);
        this.recordEvent(bestEx.x, bestEx.y, span * 1.12, nowSec + (isBullet ? 0.6 : 1.55));
        if (!isBullet) {
          this.aftermathUntilSec = Math.max(this.aftermathUntilSec, nowSec + 1.45);
          this.shotMinHoldUntilSec = Math.max(this.shotMinHoldUntilSec, nowSec + 1.0);
        }
        this.activeFocusKind = 'explosion';
        this.lastShotZoom = zoom;
        return {
          x: bestEx.x,
          y: bestEx.y,
          zoom,
          focusKind: 'explosion',
          labelAr: isBullet ? 'رصد الاشتباك الناري' : 'رصد لحظة الانفجار'
        };
      }
    } else {
      this.trackedExplosionId = null;
    }

    // 2. تتبع الصواريخ والقنابل والمدفعية والطوربيدات أثناء الطيران
    const activeProjectiles = engine.projectiles.filter((p) => !p.delaySec || p.delaySec <= 0);
    const heavyProjectiles = activeProjectiles.filter((p) => p.mode !== 'bullet');
    const trackedPool = heavyProjectiles.length > 0 ? heavyProjectiles : activeProjectiles;

    if (trackedPool.length > 0) {
      let chosen = this.trackedProjectileId
        ? trackedPool.find((p) => p.id === this.trackedProjectileId)
        : undefined;
      if (!chosen) {
        chosen = trackedPool.reduce((best, cur) =>
          projectilePriority(cur) > projectilePriority(best) ? cur : best
        );
        this.trackedProjectileId = chosen.id;
        this.lastShotZoom = 0;
      }

      const px = lerp(chosen.prevX, chosen.x, alpha);
      const py = lerp(chosen.prevY, chosen.y, alpha);
      const remDist = Math.hypot(chosen.targetX - px, chosen.targetY - py);
      const lookWeight = chosen.mode === 'bullet' ? 0.55 : 0.25 + chosen.progress * 0.42;
      const fx = lerp(px, chosen.targetX, lookWeight);
      const fy = lerp(py, chosen.targetY, lookWeight);
      const span = clamp(
        Math.max(minMapDim * 0.36, remDist * 1.18 + minMapDim * 0.22),
        minMapDim * 0.36,
        minMapDim * 0.88
      );
      let zoom = zoomForWorldSpan(span, span, mapW, mapH, viewport, 1.0, 2.3);
      if (this.activeFocusKind === 'projectile' && this.lastShotZoom > 0) {
        zoom = Math.max(zoom, this.lastShotZoom);
      }
      this.recordEvent(fx, fy, span, nowSec + 1.25);
      this.activeFocusKind = 'projectile';
      this.lastShotZoom = zoom;
      if (chosen.mode !== 'bullet') {
        this.shotMinHoldUntilSec = Math.max(this.shotMinHoldUntilSec, nowSec + 0.65);
      }

      const labelAr =
        chosen.mode === 'missile'
          ? 'تتبع مسار الصاروخ'
          : chosen.mode === 'torpedo'
            ? 'تتبع مسار الطوربيد'
            : chosen.mode === 'artillery'
              ? 'تتبع القصف المدفعي'
              : chosen.mode === 'interceptor'
                ? 'تتبع صاروخ الاعتراض'
                : chosen.mode === 'bomb'
                  ? 'رصد القصف الجوي'
                  : 'تتبع القذيفة نحو الهدف';

      return {
        x: fx,
        y: fy,
        zoom,
        focusKind: 'projectile',
        labelAr
      };
    }
    this.trackedProjectileId = null;

    // 3. التريث السينمائي على أثر الانفجار قبل الانتقال إلى وحدات بعيدة
    if (
      this.hadAnyEvent &&
      this.lastEventX !== null &&
      this.lastEventY !== null &&
      nowSec < this.aftermathUntilSec
    ) {
      const zoom = zoomForWorldSpan(
        this.lastEventSpan * 1.15,
        this.lastEventSpan * 1.15,
        mapW,
        mapH,
        viewport,
        1.0,
        2.1
      );
      this.activeFocusKind = 'explosion';
      return {
        x: this.lastEventX,
        y: this.lastEventY,
        zoom,
        focusKind: 'explosion',
        labelAr: 'رصد أثر الضربة'
      };
    }

    // 4. تتبع الطائرات المنفذة للغارات الجوية قبل إلقاء القنبلة
    const strikers: EntityState[] = [];
    const movers: EntityState[] = [];
    for (const ent of engine.entities.values()) {
      if (ent.pendingStrike) strikers.push(ent);
      if (ent.isMoving) movers.push(ent);
    }

    if (strikers.length > 0) {
      const jet = (this.trackedStrikerId && strikers.find((s) => s.id === this.trackedStrikerId)) || strikers[0];
      this.trackedStrikerId = jet.id;
      const ex = lerp(jet.prevX, jet.x, alpha);
      const ey = lerp(jet.prevY, jet.y, alpha);
      const tgt = jet.pendingStrike!.to;
      const distToTarget = Math.hypot(tgt.x - ex, tgt.y - ey);
      const fx = lerp(ex, tgt.x, 0.26);
      const fy = lerp(ey, tgt.y, 0.26);
      const span = clamp(Math.max(minMapDim * 0.44, distToTarget * 0.92 + 180), minMapDim * 0.42, minMapDim * 0.88);
      const zoom = zoomForWorldSpan(span, span, mapW, mapH, viewport, 1.0, 2.2);
      this.recordEvent(fx, fy, span, nowSec + 1.15);
      this.shotMinHoldUntilSec = Math.max(this.shotMinHoldUntilSec, nowSec + 0.8);
      this.activeFocusKind = 'airstrike';
      return {
        x: fx,
        y: fy,
        zoom,
        focusKind: 'airstrike',
        labelAr: 'تتبع المقاتلة نحو الهدف'
      };
    }
    this.trackedStrikerId = null;

    // 5. تتبع الأسهم التكتيكية أثناء رسمها
    for (const arr of engine.arrows.values()) {
      if (arr.progress < 0.99) {
        const mx = (arr.from.x + arr.to.x) / 2;
        const my = (arr.from.y + arr.to.y) / 2 - 55;
        const tip = quadraticBezierPoint(arr.from, { x: mx, y: my }, arr.to, arr.progress);
        const spanW = Math.max(minMapDim * 0.45, Math.abs(tip.x - arr.from.x) + 220);
        const spanH = Math.max(minMapDim * 0.4, Math.abs(tip.y - arr.from.y) + 220);
        const cx = (arr.from.x + tip.x) / 2;
        const cy = (arr.from.y + tip.y) / 2;
        const zoom = zoomForWorldSpan(spanW, spanH, mapW, mapH, viewport, 1.0, 2.0);
        this.recordEvent(cx, cy, Math.max(spanW, spanH), nowSec + 1.0);
        this.activeFocusKind = 'arrow';
        return {
          x: cx,
          y: cy,
          zoom,
          focusKind: 'arrow',
          labelAr: 'متابعة مسار العملية'
        };
      }
    }

    // 6. تتبع تحرك الوحدات والأساطيل
    if (movers.length > 0) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      let sumX = 0;
      let sumY = 0;
      for (const m of movers) {
        const ex = lerp(m.prevX, m.x, alpha);
        const ey = lerp(m.prevY, m.y, alpha);
        const lead = m.kind === 'air' ? 32 : 16;
        const lx = ex + Math.cos(m.angle) * lead;
        const ly = ey + Math.sin(m.angle) * lead;
        minX = Math.min(minX, ex, lx);
        maxX = Math.max(maxX, ex, lx);
        minY = Math.min(minY, ey, ly);
        maxY = Math.max(maxY, ey, ly);
        sumX += lx;
        sumY += ly;
      }
      const cx = movers.length === 1 ? sumX : (minX + maxX) / 2;
      const cy = movers.length === 1 ? sumY : (minY + maxY) / 2;
      const spanW = Math.max(minMapDim * 0.48, maxX - minX + 260);
      const spanH = Math.max(minMapDim * 0.42, maxY - minY + 240);
      const zoom = zoomForWorldSpan(spanW, spanH, mapW, mapH, viewport, 1.0, 2.05);
      this.recordEvent(cx, cy, Math.max(spanW, spanH), nowSec + 1.0);
      this.activeFocusKind = 'movement';
      return {
        x: cx,
        y: cy,
        zoom,
        focusKind: 'movement',
        labelAr: movers.length > 1 ? 'تتبع تحرك التشكيلات' : 'تتبع تحرك الوحدة'
      };
    }

    // 7. تتبع موجات الرادار والإنذار النشطة
    if (engine.pulses.length > 0) {
      const latestPulse = engine.pulses[engine.pulses.length - 1];
      if (latestPulse.progress < 0.85) {
        const span = clamp(Math.max(minMapDim * 0.45, latestPulse.maxRadius * 3.8), minMapDim * 0.42, minMapDim * 0.82);
        const zoom = zoomForWorldSpan(span, span, mapW, mapH, viewport, 1.0, 2.1);
        this.recordEvent(latestPulse.x, latestPulse.y, span, nowSec + 1.0);
        this.activeFocusKind = 'pulse';
        return {
          x: latestPulse.x,
          y: latestPulse.y,
          zoom,
          focusKind: 'pulse',
          labelAr: 'رصد موجة المسح والإنذار'
        };
      }
    }

    // 8. التريث على موقع الحدث الأخير ثم سحب الكاميرا تدريجيًا للقطة شاملة للمسرح
    if (this.hadAnyEvent && this.lastEventX !== null && this.lastEventY !== null && nowSec < this.holdUntilSec) {
      const zoom = zoomForWorldSpan(
        this.lastEventSpan * 1.15,
        this.lastEventSpan * 1.15,
        mapW,
        mapH,
        viewport,
        1.0,
        2.1
      );
      this.activeFocusKind = 'establishing';
      return {
        x: this.lastEventX,
        y: this.lastEventY,
        zoom,
        focusKind: 'establishing',
        labelAr: 'تأمل ما بعد الحدث'
      };
    }

    if (this.hadAnyEvent && engine.entities.size > 0) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const ent of engine.entities.values()) {
        const ex = lerp(ent.prevX, ent.x, alpha);
        const ey = lerp(ent.prevY, ent.y, alpha);
        minX = Math.min(minX, ex);
        maxX = Math.max(maxX, ex);
        minY = Math.min(minY, ey);
        maxY = Math.max(maxY, ey);
      }
      const spanW = Math.max(minMapDim * 0.65, maxX - minX + 340);
      const spanH = Math.max(minMapDim * 0.55, maxY - minY + 300);
      const zoom = zoomForWorldSpan(spanW, spanH, mapW, mapH, viewport, 1.0, 1.75);
      this.activeFocusKind = 'establishing';
      return {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
        zoom,
        focusKind: 'establishing',
        labelAr: 'لقطة عامة للمسرح'
      };
    }

    this.activeFocusKind = 'none';
    return null;
  }

  private recordEvent(x: number, y: number, span: number, holdUntilSec: number): void {
    this.hadAnyEvent = true;
    this.lastEventX = x;
    this.lastEventY = y;
    this.lastEventSpan = span;
    this.holdUntilSec = Math.max(this.holdUntilSec, holdUntilSec);
  }
}
