/**
 * تقييم المسارات والمفاتيح عند tick معيّن (S3.3، S3.4).
 * كل الدوال نقية: لا تقرأ الحالة ولا تعدّلها.
 */
import { unproject } from '../geo';
import { ease } from './easing';
import type { Keyframe, Path, Track } from '../model/track';
import type { Position } from '../model/primitives';
import { measurePath, pointAtLength, type MeasuredPath } from './path';

export interface TrackSample {
  readonly trackId: string;
  readonly property: Track['property'];
  readonly value: number | Position;
}

const clamp01 = (value: number): number => (value <= 0 ? 0 : value >= 1 ? 1 : value);

function progressAt(startTick: number, endTick: number, tick: number): number {
  if (endTick <= startTick) return tick >= endTick ? 1 : 0;
  return clamp01((tick - startTick) / (endTick - startTick));
}

/** يقيّم مساراً عند tick: يعيد موقعاً من lon/lat بعد تحويل طول القوس. */
export function samplePath(path: Path, tick: number, measured?: MeasuredPath): Position {
  const geometry = measured ?? measurePath(path.points);
  const eased = ease(path.easing, progressAt(path.startTick, path.endTick, tick));
  const point = pointAtLength(geometry, geometry.length * eased);
  return unproject(point.x, point.y);
}

/** يقيّم مفاتيح خاصية عددية أو موقعية عند tick. */
export function sampleKeyframes(keyframes: readonly Keyframe[], tick: number): number | Position {
  const first = keyframes[0]!;
  if (tick <= first.tick) return first.value;
  const last = keyframes[keyframes.length - 1]!;
  if (tick >= last.tick) return last.value;

  let index = 0;
  while (index < keyframes.length - 1 && (keyframes[index + 1]?.tick ?? Infinity) <= tick) {
    index += 1;
  }
  const from = keyframes[index]!;
  const to = keyframes[index + 1]!;
  const ratio = progressAt(from.tick, to.tick, tick);
  const eased = ease(to.easing, ratio);

  if (typeof from.value === 'number' && typeof to.value === 'number') {
    return from.value + (to.value - from.value) * eased;
  }
  if (typeof from.value === 'object' && typeof to.value === 'object') {
    return {
      lon: from.value.lon + (to.value.lon - from.value.lon) * eased,
      lat: from.value.lat + (to.value.lat - from.value.lat) * eased,
    };
  }
  throw new Error(`نوع قيمة غير متوافق في المفاتيح: ${typeof from.value} → ${typeof to.value}`);
}

/** يقيّم مساراً واحداً كاملاً؛ نوع القيمة يتبع الخاصية. */
export function evaluateTrack(track: Track, tick: number): TrackSample {
  if (track.path) {
    return { trackId: track.id, property: track.property, value: samplePath(track.path, tick) };
  }
  return {
    trackId: track.id,
    property: track.property,
    value: sampleKeyframes(track.keyframes ?? [], tick),
  };
}

/** نهاية المسار: tick الذي يقع فيه حدث arrived. */
export function pathEndTick(track: Track): number | null {
  return track.path ? track.path.endTick : null;
}
