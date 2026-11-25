/**
 * مسار بكسل-عالمي وقياس طول القوس (S3.4).
 * النقاط تأتي lon/lat من النموذج وتُسقط مرة واحدة إلى وحدات العالم.
 */
import { project, type WorldPoint } from '../geo';
import type { Position } from '../model/primitives';

export interface MeasuredPath {
  readonly points: readonly WorldPoint[];
  /** أطوال تراكمية: cumulative[i] = المسافة من البداية إلى النقطة i. cumulative[0] = 0. */
  readonly cumulative: readonly number[];
  readonly length: number;
}

export function measurePath(positions: readonly Position[]): MeasuredPath {
  if (positions.length < 2) throw new Error('المسار يحتاج نقطتين على الأقل');
  const points = positions.map((position) => project(position.lon, position.lat));
  const cumulative: number[] = [0];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]!;
    const current = points[index]!;
    cumulative.push(
      cumulative[index - 1]! + Math.hypot(current.x - previous.x, current.y - previous.y),
    );
  }
  return { points, cumulative, length: cumulative[cumulative.length - 1] ?? 0 };
}

/**
 * نقطة على المسار عند طول قوس `distance` من البداية.
 * تُقيَّد القيمة داخل [0, length]، والمسارات الصفرية الطول تُعيد أول نقطة.
 */
export function pointAtLength(path: MeasuredPath, distance: number): WorldPoint {
  const { points, cumulative, length } = path;
  const first = points[0]!;
  if (points.length === 1 || length === 0) return first;
  const target = distance <= 0 ? 0 : distance >= length ? length : distance;

  // بحث ثنائي عن المقطع الذي يقع فيه الطول المطلوب (مقاطع مرتبة تصاعدياً).
  let low = 0;
  let high = cumulative.length - 1;
  while (low + 1 < high) {
    const middle = (low + high) >> 1;
    if (cumulative[middle]! <= target) low = middle;
    else high = middle;
  }

  const start = cumulative[low]!;
  const end = cumulative[high]!;
  const span = end - start;
  const ratio = span <= 0 ? 0 : (target - start) / span;
  const from = points[low]!;
  const to = points[high]!;
  return { x: from.x + (to.x - from.x) * ratio, y: from.y + (to.y - from.y) * ratio };
}

/** طول القوس بوحدات العالم لمسار lon/lat، بلا بناء كائنات إضافية. */
export function pathLengthOf(positions: readonly Position[]): number {
  return measurePath(positions).length;
}
