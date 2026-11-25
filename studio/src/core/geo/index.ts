/**
 * الإسقاط والهندسة الأرضية (ADR-0009): متساوي المستطيلات على عالم 8192×4096.
 * كل الحسابات بوحدات العالم، لا بوحدات الشاشة.
 */
export const WORLD_WIDTH = 8192;
export const WORLD_HEIGHT = 4096;

export interface WorldPoint {
  x: number;
  y: number;
}

export interface GeoPoint {
  lon: number;
  lat: number;
}

export type BBox = readonly [number, number, number, number];

export interface RingRef {
  readonly start: number;
  readonly length: number;
  readonly polygon: number;
  readonly hole: boolean;
}

export interface PolygonalCountry {
  readonly id: string;
  readonly name: string;
  readonly bbox: BBox;
  readonly rings: readonly RingRef[];
  /** إحداثيات مسطّحة: x0,y0,x1,y1,… بوحدات العالم. */
  readonly points: Float64Array;
}

export function project(lon: number, lat: number): WorldPoint {
  return {
    x: ((lon + 180) / 360) * WORLD_WIDTH,
    y: ((90 - lat) / 180) * WORLD_HEIGHT,
  };
}

export function unproject(x: number, y: number): GeoPoint {
  return {
    lon: (x / WORLD_WIDTH) * 360 - 180,
    lat: 90 - (y / WORLD_HEIGHT) * 180,
  };
}

const EARTH_RADIUS_KM = 6371.0088;

/** المسافة الكروية بين نقطتين جغرافيتين بالكيلومترات. */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** طول مسار بوحدات العالم (مجموع أطوال القطع). */
export function pathLength(points: readonly WorldPoint[]): number {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (!previous || !current) continue;
    total += Math.hypot(current.x - previous.x, current.y - previous.y);
  }
  return total;
}

export function bboxContains(bbox: BBox, x: number, y: number): boolean {
  return x >= bbox[0] && x <= bbox[2] && y >= bbox[1] && y <= bbox[3];
}

export function bboxOverlaps(a: BBox, b: BBox): boolean {
  return !(a[2] < b[0] || b[2] < a[0] || a[3] < b[1] || b[3] < a[1]);
}

/** ray casting على حلقة واحدة مشار إليها داخل مصفوفة الإحداثيات المسطّحة. */
export function pointInRing(
  points: Float64Array,
  start: number,
  length: number,
  x: number,
  y: number,
): boolean {
  let inside = false;
  const last = length - 1;
  for (let index = 0, previous = last; index < length; previous = index, index += 1) {
    const xi = points[(start + index) * 2];
    const yi = points[(start + index) * 2 + 1];
    const xj = points[(start + previous) * 2];
    const yj = points[(start + previous) * 2 + 1];
    if (xi === undefined || yi === undefined || xj === undefined || yj === undefined) continue;
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** نقطة داخل المضلع وخارج ثقوبه (ADR-0010). */
export function pointInCountry(country: PolygonalCountry, x: number, y: number): boolean {
  if (!bboxContains(country.bbox, x, y)) return false;

  const polygonHits = new Map<number, boolean>();
  for (const ring of country.rings) {
    const inside = pointInRing(country.points, ring.start, ring.length, x, y);
    if (!inside) continue;
    if (!ring.hole) polygonHits.set(ring.polygon, true);
    else if (polygonHits.get(ring.polygon)) polygonHits.set(ring.polygon, false);
  }

  for (const hit of polygonHits.values()) if (hit) return true;
  return false;
}

/**
 * اختيار الدولة عند نقطة عالم. مُرتَّب حتمياً: أول تطابق بعد الفلترة والترتيب الأبجدي.
 */
export function hitTest(
  countries: readonly PolygonalCountry[],
  x: number,
  y: number,
): PolygonalCountry | null {
  for (const country of countries) {
    if (!bboxContains(country.bbox, x, y)) continue;
    if (pointInCountry(country, x, y)) return country;
  }
  return null;
}
