import { visibleWorldRect, type Camera, type Viewport } from '@/core/camera';
import { bboxOverlaps, project, type PolygonalCountry } from '@/core/geo';
import type { EntityState } from '@/core/sim';
import { LAYER_ORDER, type LayerName } from './layers';

export interface MapSnapshot {
  readonly countries: readonly PolygonalCountry[];
  readonly selectedCountryId: string | null;
  /** حالة الكيانات عند الـ tick الحالي (تُحسب في core/sim، لا هنا). */
  readonly entities?: readonly EntityState[];
}

export interface CountryDraw {
  readonly id: string;
  readonly name: string;
  readonly selected: boolean;
}

export interface EntityDraw {
  readonly id: string;
  readonly kind: EntityState['kind'];
  readonly side: EntityState['side'];
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly rotation: number;
  readonly opacity: number;
}

export interface RenderPlan {
  readonly layers: readonly LayerName[];
  readonly transform: {
    readonly scale: number;
    readonly offsetX: number;
    readonly offsetY: number;
  };
  readonly visible: readonly CountryDraw[];
  readonly hiddenCount: number;
  readonly selected: CountryDraw | null;
  readonly strokeWidth: number;
  readonly entities: readonly EntityDraw[];
  readonly hiddenEntities: number;
}

/**
 * يقرأ الحالة ويُخرج خطة رسم فقط (S2.4).
 * لا يعدّل أي مدخل، ولا يحتفظ بمرجع متغيّر — يُختبر بتجميد عميق للمدخلات.
 */
export function buildRenderPlan(
  snapshot: MapSnapshot,
  camera: Camera,
  viewport: Viewport,
): RenderPlan {
  const rect = visibleWorldRect(camera, viewport);
  const visibleBBox = [rect.minX, rect.minY, rect.maxX, rect.maxY] as const;

  const visible: CountryDraw[] = [];
  for (const country of snapshot.countries) {
    if (!bboxOverlaps(country.bbox, visibleBBox)) continue;
    visible.push({
      id: country.id,
      name: country.name,
      selected: country.id === snapshot.selectedCountryId,
    });
  }

  const selected = visible.find((country) => country.selected) ?? null;

  // الكيانات تُقصّ بإحداثيات العالم نفسها المستخدمة للدول.
  const entities: EntityDraw[] = [];
  let hiddenEntities = 0;
  for (const entity of snapshot.entities ?? []) {
    const point = project(entity.position.lon, entity.position.lat);
    if (point.x < rect.minX || point.x > rect.maxX || point.y < rect.minY || point.y > rect.maxY) {
      hiddenEntities += 1;
      continue;
    }
    entities.push({
      id: entity.id,
      kind: entity.kind,
      side: entity.side,
      x: point.x,
      y: point.y,
      scale: entity.scale,
      rotation: entity.rotation,
      opacity: entity.opacity,
    });
  }

  return {
    layers: LAYER_ORDER,
    transform: {
      scale: camera.zoom,
      offsetX: viewport.width / 2 - camera.centerX * camera.zoom,
      offsetY: viewport.height / 2 - camera.centerY * camera.zoom,
    },
    visible,
    hiddenCount: snapshot.countries.length - visible.length,
    selected,
    strokeWidth: 1 / camera.zoom,
    entities,
    hiddenEntities,
  };
}

/** تجميد عميق لأي بنية، للتحقق من أن العرض لا يكتب في الحالة. */
export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  // المصفوفات النمطية (إحداثيات الدول) لا يمكن تجميدها في JS؛ تُعامل للقراءة فقط بالعقد.
  if (ArrayBuffer.isView(value)) return value;
  Object.freeze(value);
  for (const key of Object.getOwnPropertyNames(value)) {
    const child = (value as Record<string, unknown>)[key];
    if (child && typeof child === 'object' && !Object.isFrozen(child)) deepFreeze(child);
  }
  return value;
}
