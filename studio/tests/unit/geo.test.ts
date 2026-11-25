import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { GeoPoint } from '@/core/geo';
import {
  WORLD_HEIGHT,
  WORLD_WIDTH,
  bboxContains,
  distanceKm,
  hitTest,
  pathLength,
  pointInCountry,
  pointInRing,
  project,
  unproject,
} from '@/core/geo';
import { decodeMap, type RawMap } from '@/content/mapData';

const raw = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'content/maps/world/map.bin.json'), 'utf8'),
) as RawMap;
const map = decodeMap(raw);

const CITIES = {
  riyadh: { lon: 46.6753, lat: 24.7136 },
  paris: { lon: 2.3522, lat: 48.8566 },
  nairobi: { lon: 36.8219, lat: -1.2921 },
  tokyo: { lon: 139.6917, lat: 35.6895 },
  saoPaulo: { lon: -46.6333, lat: -23.5505 },
};

describe('الإسقاط (S2.2)', () => {
  it('نقاط مرجعية معروفة', () => {
    const origin = project(0, 0);
    expect(origin.x).toBeCloseTo(WORLD_WIDTH / 2, 6);
    expect(origin.y).toBeCloseTo(WORLD_HEIGHT / 2, 6);

    expect(project(-180, 90)).toEqual({ x: 0, y: 0 });
    expect(project(180, -90)).toEqual({ x: WORLD_WIDTH, y: WORLD_HEIGHT });
  });

  it('الإسقاط عكسي تماماً داخل الحدود', () => {
    for (const city of Object.values(CITIES)) {
      const point = project(city.lon, city.lat);
      const back = unproject(point.x, point.y);
      expect(back.lon).toBeCloseTo(city.lon, 9);
      expect(back.lat).toBeCloseTo(city.lat, 9);
    }
  });

  it('المسافات الكروية ضمن 1% من القيم المرجعية', () => {
    // مراجع تقريبية: الرياض — جدة 850 كم، مكة — المدينة 339 كم، باريس — لندن 344 كم.
    const cases: { from: GeoPoint; to: GeoPoint; reference: number }[] = [
      { from: { lon: 46.6753, lat: 24.7136 }, to: { lon: 39.1978, lat: 21.4858 }, reference: 850 },
      { from: { lon: 39.8262, lat: 21.4225 }, to: { lon: 39.6142, lat: 24.4672 }, reference: 339 },
      { from: { lon: 2.3522, lat: 48.8566 }, to: { lon: -0.1276, lat: 51.5072 }, reference: 344 },
    ];
    for (const { from, to, reference } of cases) {
      const measured = distanceKm(from, to);
      expect(Math.abs(measured - reference) / reference, `${reference}`).toBeLessThan(0.01);
      expect(distanceKm(to, from)).toBeCloseTo(measured, 9);
    }
    expect(distanceKm({ lon: 0, lat: 0 }, { lon: 0, lat: 0 })).toBe(0);
  });

  it('طول المسار بوحدات العالم', () => {
    expect(
      pathLength([
        { x: 0, y: 0 },
        { x: 3, y: 4 },
        { x: 3, y: 0 },
      ]),
    ).toBeCloseTo(9, 9);
  });
});

describe('اختيار الدولة (S2.5، ADR-0010)', () => {
  it('ray casting على حلقة مربعة', () => {
    const square = new Float64Array([0, 0, 10, 0, 10, 10, 0, 10]);
    expect(pointInRing(square, 0, 4, 5, 5)).toBe(true);
    expect(pointInRing(square, 0, 4, 15, 5)).toBe(false);
  });

  it('النقطة في الثقب ليست داخل الدولة', () => {
    const square = new Float64Array([0, 0, 10, 0, 10, 10, 0, 10]);
    const hole = new Float64Array([4, 4, 6, 4, 6, 6, 4, 6]);
    const country = {
      id: 'x',
      name: 'X',
      bbox: [0, 0, 10, 10] as const,
      rings: [
        { start: 0, length: 4, polygon: 0, hole: false },
        { start: 4, length: 4, polygon: 0, hole: true },
      ],
      points: new Float64Array([...square, ...hole]),
    };
    expect(pointInCountry(country, 1, 1)).toBe(true);
    expect(pointInCountry(country, 5, 5)).toBe(false);
    expect(pointInCountry(country, 20, 20)).toBe(false);
    expect(bboxContains(country.bbox, 1, 1)).toBe(true);
  });

  it('الخريطة الحقيقية: عواصم معروفة تُصيب دولها', () => {
    const expectations: [keyof typeof CITIES, string][] = [
      ['riyadh', 'Saudi Arabia'],
      ['paris', 'France'],
      ['nairobi', 'Kenya'],
      ['tokyo', 'Japan'],
      ['saoPaulo', 'Brazil'],
    ];
    for (const [key, expected] of expectations) {
      const city = CITIES[key];
      const point = project(city.lon, city.lat);
      expect(hitTest(map.countries, point.x, point.y)?.name, key).toBe(expected);
    }
  });

  it('المحيط لا يعطي دولة', () => {
    const point = project(-30, 0);
    expect(hitTest(map.countries, point.x, point.y)).toBeNull();
  });

  it('الخريطة محمّلة بالعدد المتوقع وكل دولة لها bbox صالح', () => {
    expect(map.countries.length).toBe(177);
    for (const country of map.countries) {
      expect(country.bbox[2]).toBeGreaterThanOrEqual(country.bbox[0]);
      expect(country.bbox[3]).toBeGreaterThanOrEqual(country.bbox[1]);
      expect(country.points.length).toBeGreaterThan(0);
    }
  });
});
