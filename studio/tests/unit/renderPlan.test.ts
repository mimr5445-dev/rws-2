import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { fitWorld } from '@/core/camera';
import { project } from '@/core/geo';
import { decodeMap, type RawMap } from '@/content/mapData';
import { LAYER_ORDER } from '@/render/layers';
import { buildRenderPlan, deepFreeze } from '@/render/plan';

const raw = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'content/maps/world/map.bin.json'), 'utf8'),
) as RawMap;
const map = decodeMap(raw);
const viewport = { width: 1280, height: 800 };

describe('خطة الرسم (S2.4)', () => {
  it('ترتيب الطبقات ثابت ومطابق للمواصفة', () => {
    expect([...LAYER_ORDER]).toEqual([
      'map',
      'zones',
      'structures',
      'units',
      'paths',
      'effects',
      'captions',
      'camera',
      'editorUi',
    ]);
  });

  it('لا تكتب في الحالة: تعمل على مدخلات مجمّدة تجميداً عميقاً', () => {
    const snapshot = deepFreeze({
      countries: map.countries,
      selectedCountryId: '682',
    });
    const frozenCamera = deepFreeze(fitWorld(viewport));
    const frozenViewport = deepFreeze({ width: 1280, height: 800 });
    // في الوضع الصارم أي كتابة في كائن مجمّد تُرمى، فالنجاح هنا إثبات عدم الكتابة.
    const plan = buildRenderPlan(snapshot, frozenCamera, frozenViewport);
    expect(plan.visible.length).toBeGreaterThan(0);
    expect(plan.layers).toEqual(LAYER_ORDER);
    expect(Object.isFrozen(snapshot.countries[0])).toBe(true);
  });

  it('تقصّ الدول خارج الشاشة وتُبقي المرئية', () => {
    const camera = fitWorld(viewport);
    const plan = buildRenderPlan(
      { countries: map.countries, selectedCountryId: null },
      camera,
      viewport,
    );
    expect(plan.visible.length).toBe(map.countries.length);
    expect(plan.hiddenCount).toBe(0);

    const saudi = map.countries.find((country) => country.name === 'Saudi Arabia');
    const point = project(46.6753, 24.7136);
    const closeUp = { centerX: point.x, centerY: point.y, zoom: 4 };
    const zoomedPlan = buildRenderPlan(
      { countries: map.countries, selectedCountryId: saudi?.id ?? null },
      closeUp,
      viewport,
    );
    expect(zoomedPlan.visible.length).toBeLessThan(map.countries.length);
    expect(zoomedPlan.hiddenCount).toBeGreaterThan(0);
    expect(zoomedPlan.selected?.name).toBe('Saudi Arabia');
  });

  it('التحويل يعكس موقع الكاميرا، وسماكة الحدود تتناسب عكسياً مع الزوم', () => {
    const camera = { centerX: 4000, centerY: 2000, zoom: 2 };
    const plan = buildRenderPlan(
      { countries: map.countries, selectedCountryId: null },
      camera,
      viewport,
    );
    expect(plan.transform.scale).toBe(2);
    expect(plan.transform.offsetX).toBeCloseTo(viewport.width / 2 - 4000 * 2, 6);
    expect(plan.transform.offsetY).toBeCloseTo(viewport.height / 2 - 2000 * 2, 6);
    expect(plan.strokeWidth).toBeCloseTo(0.5, 6);
  });
});
