import { MapPack, Point, PointRef } from '../core/types';

export const TICK_RATE = 60;
export const DT = 1 / TICK_RATE;

const STRICT_SEC_RE = /^(?:\d+(?:\.\d+)?|\.\d+)(?:\s*s)?$/i;

export function resolvePoint(map: MapPack, ref: PointRef | undefined): Point | undefined {
  if (!ref) return undefined;
  if (typeof ref === 'string') return map.anchors[ref];
  if (typeof ref.x === 'number' && typeof ref.y === 'number') return ref;
  return undefined;
}

export function parseStrictSec(val: unknown): number | null {
  if (typeof val === 'number') {
    return Number.isFinite(val) && val >= 0 ? val : null;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || !STRICT_SEC_RE.test(trimmed)) return null;
    const numericPart = trimmed.replace(/\s*s$/i, '');
    const n = Number(numericPart);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }
  return null;
}

export function parseSec(val?: string | number, fallback = 0): number {
  if (val === undefined || val === null) return Math.max(0, fallback);
  const parsed = parseStrictSec(val);
  return parsed !== null ? parsed : Math.max(0, fallback);
}

export function normalizeAngleDiff(target: number, current: number): number {
  let d = target - current;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
