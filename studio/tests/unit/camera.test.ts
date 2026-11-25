import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CAMERA,
  applyPointers,
  clampCenter,
  clampZoom,
  fitWorld,
  pan,
  screenToWorld,
  visibleWorldRect,
  worldToScreen,
  zoomAt,
  zoomByStep,
  zoomFloor,
} from '@/core/camera';
import { MAX_ZOOM, MIN_ZOOM } from '@/core/model/camera';
import { WORLD_HEIGHT, WORLD_WIDTH } from '@/core/geo';

const viewport = { width: 1280, height: 800 };

describe('الكاميرا النقية (S2.3)', () => {
  it('الزوم محصور بين 0.25 و4', () => {
    expect(clampZoom(0.01)).toBe(MIN_ZOOM);
    expect(clampZoom(99)).toBe(MAX_ZOOM);
    expect(clampZoom(Number.NaN)).toBe(MIN_ZOOM);
    expect(clampZoom(1.5)).toBe(1.5);
  });

  it('التحويل ذهاباً وإياباً يعيد النقطة نفسها', () => {
    const camera = { centerX: 3000, centerY: 2000, zoom: 1.7 };
    const points = [
      { x: 0, y: 0 },
      { x: 1234.5, y: 987.25 },
      { x: WORLD_WIDTH, y: WORLD_HEIGHT },
    ];
    for (const point of points) {
      const screen = worldToScreen(camera, viewport, point);
      const back = screenToWorld(camera, viewport, screen);
      expect(back.x).toBeCloseTo(point.x, 9);
      expect(back.y).toBeCloseTo(point.y, 9);
    }
  });

  it('fitWorld يضع العالم داخل الشاشة ويوسّطه', () => {
    const camera = fitWorld(viewport);
    const rect = visibleWorldRect(camera, viewport);
    expect(rect.minX).toBeLessThanOrEqual(0);
    expect(rect.maxX).toBeGreaterThanOrEqual(WORLD_WIDTH);
    expect(rect.minY).toBeLessThanOrEqual(0);
    expect(rect.maxY).toBeGreaterThanOrEqual(WORLD_HEIGHT);
    expect(camera.centerX).toBeCloseTo(WORLD_WIDTH / 2, 6);
    expect(camera.centerY).toBeCloseTo(WORLD_HEIGHT / 2, 6);
  });

  it('التحريك يقابل الإزاحة بالبكسل', () => {
    const camera = { centerX: 4000, centerY: 2000, zoom: 2 };
    const moved = pan(camera, viewport, 100, -50);
    expect(moved.centerX).toBeCloseTo(camera.centerX - 50, 6);
    expect(moved.centerY).toBeCloseTo(camera.centerY + 25, 6);
  });

  it('الزوم حول مؤشر يثبّت النقطة تحت المؤشر', () => {
    const camera = { centerX: 4100, centerY: 2100, zoom: 1 };
    const anchor = { x: 900, y: 300 };
    const before = screenToWorld(camera, viewport, anchor);
    const zoomed = zoomAt(camera, viewport, 1.5, anchor);
    const after = screenToWorld(zoomed, viewport, anchor);
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
    expect(zoomed.zoom).toBeCloseTo(1.5, 6);
  });

  it('الزوم المتدرّج يحترم الحدود', () => {
    let camera = DEFAULT_CAMERA;
    for (let index = 0; index < 40; index += 1) camera = zoomByStep(camera, viewport, 1);
    expect(camera.zoom).toBe(MAX_ZOOM);
    for (let index = 0; index < 80; index += 1) camera = zoomByStep(camera, viewport, -1);
    // أرضية الشاشة أوسع من 0.25 هنا كي يعرض زر الملاءمة العالم كاملاً.
    expect(camera.zoom).toBe(zoomFloor(viewport));
    expect(camera.zoom).toBeLessThanOrEqual(MIN_ZOOM);
    expect(clampZoom(0.01)).toBe(MIN_ZOOM);
  });

  it('زر الملاءمة يعرض العالم كاملاً حتى على شاشة هاتف (390×844)', () => {
    for (const size of [
      { width: 390, height: 844 },
      { width: 1024, height: 768 },
      { width: 1920, height: 1080 },
    ]) {
      const rect = visibleWorldRect(fitWorld(size), size);
      expect(rect.minX, `${size.width}`).toBeLessThanOrEqual(0);
      expect(rect.maxX, `${size.width}`).toBeGreaterThanOrEqual(WORLD_WIDTH);
      expect(rect.minY, `${size.width}`).toBeLessThanOrEqual(0);
      expect(rect.maxY, `${size.width}`).toBeGreaterThanOrEqual(WORLD_HEIGHT);
    }
  });

  it('المركز لا يخرج بالعالم خارج الشاشة', () => {
    const camera = clampCenter({ centerX: -5000, centerY: -5000, zoom: 3 }, viewport);
    const rect = visibleWorldRect(camera, viewport);
    expect(rect.minX).toBeCloseTo(0, 6);
    expect(rect.minY).toBeCloseTo(0, 6);
  });

  it('قرص بإصبعين يكبّر ويحرّك بحسب مركز الإيماءة', () => {
    const camera = { centerX: WORLD_WIDTH / 2, centerY: WORLD_HEIGHT / 2, zoom: 1 };
    const previous = [
      { x: 600, y: 400 },
      { x: 700, y: 400 },
    ];
    const current = [
      { x: 550, y: 400 },
      { x: 750, y: 400 },
    ];
    const next = applyPointers(camera, viewport, current, previous);
    expect(next.zoom).toBeGreaterThan(camera.zoom);
    expect(next.zoom).toBeCloseTo(2, 6);
  });

  it('سحب بإصبع واحد يحرّك الكاميرا من دون تغيير الزوم', () => {
    const camera = { centerX: 4000, centerY: 2000, zoom: 1.5 };
    const previous = [{ x: 300, y: 300 }];
    const current = [{ x: 400, y: 350 }];
    const next = applyPointers(camera, viewport, current, previous);
    expect(next.zoom).toBe(camera.zoom);
    expect(next.centerX).toBeLessThan(camera.centerX);
    expect(next.centerY).toBeLessThan(camera.centerY);
  });

  it('إيماءة بلا نقاط لا تغيّر شيئاً', () => {
    expect(applyPointers(DEFAULT_CAMERA, viewport, [], [])).toBe(DEFAULT_CAMERA);
  });
});
