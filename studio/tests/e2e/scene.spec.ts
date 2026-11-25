import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import './debug';

const SHOT_DIR = path.resolve(process.cwd(), 'docs/forge/shots/phase-03');

test.beforeAll(async () => {
  await mkdir(SHOT_DIR, { recursive: true });
});

async function ready(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.clear();
    } catch {
      // التخزين غير متاح — لا يهم لهذا الاختبار.
    }
  });
  await page.goto('/');
  const canvas = page.getByTestId('map-canvas');
  await expect(canvas).toHaveAttribute('data-map-ready', 'true', { timeout: 30_000 });
  return canvas;
}

test('المشهد الصغير: ثلاث وحدات ثم علامة تظهر بعد الوصول', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await ready(page);

  const loaded = await page.evaluate(() => window.__studioDebug?.loadDemoScene());
  expect(loaded).not.toBeUndefined();
  expect(loaded!.entities).toBe(3);
  expect(loaded!.durationTicks).toBe(180);
  expect(loaded!.events).toBeGreaterThanOrEqual(5);

  await page.evaluate(() => window.__studioDebug?.centerOn(48.4, 25.6, 2.4));
  await expect(page.getByTestId('selected-country')).toBeVisible();

  const before = await page.evaluate(() => window.__studioDebug?.scene() ?? null);
  expect(before).toMatchObject({ tick: 0, entities: 3 });

  await page.screenshot({
    path: path.join(SHOT_DIR, `${testInfo.project.name}-scene-t0.png`),
    fullPage: false,
  });

  // tick 119: قبل الوصول، العلامة غير موجودة بعد.
  const justBefore = await page.evaluate(() => window.__studioDebug?.setTick(119) ?? null);
  expect(justBefore).toEqual({ tick: 119, entities: 3 });

  // tick 120: حدث arrived وُقع، والعلامة ظهرت.
  const after = await page.evaluate(() => window.__studioDebug?.setTick(120) ?? null);
  expect(after).toEqual({ tick: 120, entities: 4 });

  const final = await page.evaluate(() => window.__studioDebug?.scene() ?? null);
  expect(final).toMatchObject({ tick: 120, entities: 4 });

  await page.screenshot({
    path: path.join(SHOT_DIR, `${testInfo.project.name}-scene-t120.png`),
    fullPage: false,
  });

  expect(pageErrors).toEqual([]);
});

test('نقل الـ tick ذهاباً وإياباً يعيد نفس عدد الكيانات', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => window.__studioDebug?.loadDemoScene());

  const samples = await page.evaluate(() => {
    const api = window.__studioDebug!;
    const counts: (number | null)[] = [];
    for (const tick of [0, 30, 60, 90, 119, 120, 180, 0]) {
      api.setTick(tick);
      counts.push(api.scene()?.entities ?? null);
    }
    return counts;
  });

  expect(samples).toEqual([3, 3, 3, 3, 3, 4, 4, 3]);
});
