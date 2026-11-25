import { MAX_ZOOM, MIN_ZOOM } from './limits';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../geo';

/**
 * الكاميرا تحويل نقي بين العالم والشاشة (S2.3، PRODUCT_SPEC §8).
 * الحالة: مركز بوحدات العالم + زوم. لا تُخزَّن أبعاد الشاشة في الكاميرا.
 */
export interface Camera {
  readonly centerX: number;
  readonly centerY: number;
  readonly zoom: number;
}

export interface Viewport {
  readonly width: number;
  readonly height: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

export const DEFAULT_CAMERA: Camera = {
  centerX: WORLD_WIDTH / 2,
  centerY: WORLD_HEIGHT / 2,
  zoom: 0.15,
};

/**
 * أرضية الزوم الافتراضية 0.25 (PRODUCT_SPEC §8). تُخفَّض فقط حين تكون الشاشة
 * أصغر من أن تعرض العالم كاملاً عند 0.25، وإلا تعذّر على زر «ملاءمة» عرض الكرة
 * كاملة على الهاتف. السقف يبقى 4 دائماً.
 */
export function zoomFloor(viewport?: Viewport): number {
  if (!viewport || viewport.width <= 0 || viewport.height <= 0) return MIN_ZOOM;
  const scale = Math.min(viewport.width / WORLD_WIDTH, viewport.height / WORLD_HEIGHT);
  return Math.min(MIN_ZOOM, scale);
}

export function clampZoom(zoom: number, viewport?: Viewport): number {
  const floor = zoomFloor(viewport);
  if (!Number.isFinite(zoom)) return floor;
  return Math.min(MAX_ZOOM, Math.max(floor, zoom));
}

/** زوم يحصر العالم كاملاً داخل الشاشة. */
export function fitWorldZoom(viewport: Viewport, padding = 0.98): number {
  const scale = Math.min(viewport.width / WORLD_WIDTH, viewport.height / WORLD_HEIGHT);
  return clampZoom(scale * padding, viewport);
}

export function fitWorld(viewport: Viewport, padding = 0.98): Camera {
  return {
    centerX: WORLD_WIDTH / 2,
    centerY: WORLD_HEIGHT / 2,
    zoom: fitWorldZoom(viewport, padding),
  };
}

export function clampCenter(camera: Camera, viewport: Viewport): Camera {
  const halfWidth = viewport.width / (2 * camera.zoom);
  const halfHeight = viewport.height / (2 * camera.zoom);
  const clampAxis = (value: number, half: number, size: number) => {
    if (half * 2 >= size) return size / 2;
    return Math.min(size - half, Math.max(half, value));
  };
  return {
    zoom: camera.zoom,
    centerX: clampAxis(camera.centerX, halfWidth, WORLD_WIDTH),
    centerY: clampAxis(camera.centerY, halfHeight, WORLD_HEIGHT),
  };
}

export function worldToScreen(camera: Camera, viewport: Viewport, point: ScreenPoint): ScreenPoint {
  return {
    x: (point.x - camera.centerX) * camera.zoom + viewport.width / 2,
    y: (point.y - camera.centerY) * camera.zoom + viewport.height / 2,
  };
}

export function screenToWorld(camera: Camera, viewport: Viewport, point: ScreenPoint): ScreenPoint {
  return {
    x: (point.x - viewport.width / 2) / camera.zoom + camera.centerX,
    y: (point.y - viewport.height / 2) / camera.zoom + camera.centerY,
  };
}

/** تحريك بإزاحة شاشة (بالبكسل) مع الحفاظ على حدود العالم. */
export function pan(
  camera: Camera,
  viewport: Viewport,
  dxScreen: number,
  dyScreen: number,
): Camera {
  return clampCenter(
    {
      zoom: camera.zoom,
      centerX: camera.centerX - dxScreen / camera.zoom,
      centerY: camera.centerY - dyScreen / camera.zoom,
    },
    viewport,
  );
}

/** زوم حول نقطة شاشة ثابتة: النقطة التي تحت المؤشر تبقى تحته. */
export function zoomAt(
  camera: Camera,
  viewport: Viewport,
  factor: number,
  anchor: ScreenPoint,
): Camera {
  if (!Number.isFinite(factor) || factor <= 0) return camera;
  const before = screenToWorld(camera, viewport, anchor);
  const zoom = clampZoom(camera.zoom * factor, viewport);
  if (zoom === camera.zoom) return camera;
  const after = screenToWorld({ ...camera, zoom }, viewport, anchor);
  return clampCenter(
    {
      zoom,
      centerX: camera.centerX + (before.x - after.x),
      centerY: camera.centerY + (before.y - after.y),
    },
    viewport,
  );
}

export function zoomByStep(camera: Camera, viewport: Viewport, steps: number): Camera {
  const factor = Math.pow(1.25, steps);
  return zoomAt(camera, viewport, factor, {
    x: viewport.width / 2,
    y: viewport.height / 2,
  });
}

export interface GestureState {
  readonly pointerCount: number;
  readonly lastCenter: ScreenPoint | null;
  readonly lastDistance: number | null;
}

/**
 * إيماءة لمس/فأرة كاملة: تحريك + قرص باصبعين.
 * الإدخال: نقاط اللمس الحالية والسابقة؛ الإخراج: كاميرا جديدة.
 */
export function applyPointers(
  camera: Camera,
  viewport: Viewport,
  current: readonly ScreenPoint[],
  previous: readonly ScreenPoint[],
): Camera {
  if (current.length === 0) return camera;

  const average = (points: readonly ScreenPoint[]): ScreenPoint => ({
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  });

  const distance = (points: readonly ScreenPoint[]): number => {
    if (points.length < 2) return 0;
    const first = points[0];
    const second = points[1];
    if (!first || !second) return 0;
    return Math.hypot(second.x - first.x, second.y - first.y);
  };

  const currentCenter = average(current);
  const previousCenter = average(previous);
  let next = pan(
    camera,
    viewport,
    currentCenter.x - previousCenter.x,
    currentCenter.y - previousCenter.y,
  );

  const previousDistance = distance(previous);
  const currentDistance = distance(current);
  if (previous.length >= 2 && previousDistance > 0 && currentDistance > 0) {
    next = zoomAt(next, viewport, currentDistance / previousDistance, currentCenter);
  }
  return next;
}

export function visibleWorldRect(
  camera: Camera,
  viewport: Viewport,
): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  const halfWidth = viewport.width / (2 * camera.zoom);
  const halfHeight = viewport.height / (2 * camera.zoom);
  return {
    minX: camera.centerX - halfWidth,
    minY: camera.centerY - halfHeight,
    maxX: camera.centerX + halfWidth,
    maxY: camera.centerY + halfHeight,
  };
}
