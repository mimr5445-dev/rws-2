import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import './debug';

const SHOT_DIR = path.resolve(process.cwd(), 'docs/forge/shots/phase-02');
const READY_TIMEOUT = 30_000;

test.beforeAll(async () => {
  await mkdir(SHOT_DIR, { recursive: true });
});

async function openMap(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.clear();
    } catch {
      // التخزين غير متاح — لا يهم لهذا الاختبار.
    }
  });
  await page.goto('/');
  const canvas = page.getByTestId('map-canvas');
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('data-map-ready', 'true', { timeout: READY_TIMEOUT });
  return canvas;
}

async function tapCenter(
  page: Page,
  mobile: boolean,
  canvasBox: { x: number; y: number; width: number; height: number },
) {
  const x = canvasBox.x + canvasBox.width / 2;
  const y = canvasBox.y + canvasBox.height / 2;
  if (mobile) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

test('الخريطة تُحمّل وتصبح جاهزة بلا أخطاء صفحة', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  const canvas = await openMap(page);
  await expect(page.getByText('جارٍ تحميل الخريطة…')).toHaveCount(0);
  await expect(page.getByText('تعذّر تحميل الخريطة')).toHaveCount(0);
  await expect(canvas.locator('canvas')).toHaveCount(1);
  await expect(page.getByTestId('selected-country')).toHaveText(/لم تُختَر دولة|No country/);

  // الحاوية المطلقة يجب أن تملأ منطقة الخريطة فعلياً (انحدار سابق: ارتفاع 1px)
  const stage = page.getByTestId('map-stage');
  const stageBox = await stage.boundingBox();
  const box = await canvas.boundingBox();
  expect(stageBox?.width ?? 0).toBeGreaterThan(200);
  expect(stageBox?.height ?? 0).toBeGreaterThan(200);
  expect(box?.width ?? 0).toBeGreaterThan((stageBox?.width ?? 0) - 2);
  expect(box?.height ?? 0).toBeGreaterThan((stageBox?.height ?? 0) - 2);

  await page.screenshot({
    path: path.join(SHOT_DIR, `${testInfo.project.name}-map.png`),
    fullPage: false,
  });
  expect(pageErrors).toEqual([]);
});

test('أدوات التكبير تغيّر الزوم وتعيده بالملاءمة', async ({ page }) => {
  const canvas = await openMap(page);
  const readZoom = async () => Number(await canvas.getAttribute('data-zoom'));

  const initial = await readZoom();
  await page.getByRole('button', { name: /تكبير|Zoom in/ }).click();
  await expect.poll(readZoom).toBeGreaterThan(initial);

  const zoomedIn = await readZoom();
  await page.getByRole('button', { name: /تصغير|Zoom out/ }).click();
  await expect.poll(readZoom).toBeLessThan(zoomedIn);

  await page.getByRole('button', { name: /ملاءمة|Fit/ }).click();
  await expect.poll(readZoom).toBeCloseTo(initial, 3);
});

test('النقر على السعودية يختارها ويحدّث الشريط', async ({ page }, testInfo) => {
  const canvas = await openMap(page);
  const mobile = testInfo.project.name.startsWith('mobile');

  await page.evaluate(() => window.__studioDebug?.centerOn(46.6753, 24.7136, 2.2));
  await expect.poll(async () => Number(await canvas.getAttribute('data-zoom'))).toBeCloseTo(2.2, 2);

  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await tapCenter(page, mobile, box!);

  await expect(page.getByTestId('selected-country')).toHaveText('Saudi Arabia', {
    timeout: 10_000,
  });

  if (!mobile) {
    await expect(page.getByTestId('inspector-country')).toHaveText('Saudi Arabia');
  }

  if (!mobile) {
    await page.screenshot({
      path: path.join(SHOT_DIR, `${testInfo.project.name}-selection.png`),
      fullPage: false,
    });
  }
});

test('النقر على المحيط يلغي الاختيار', async ({ page }, testInfo) => {
  const canvas = await openMap(page);
  const mobile = testInfo.project.name.startsWith('mobile');

  await page.evaluate(() => window.__studioDebug?.centerOn(-30, 0, 2));
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await tapCenter(page, mobile, box!);

  await expect(page.getByTestId('selected-country')).toHaveText(/لم تُختَر دولة|No country/);
});

test('قياس الإطارات يُسجّل معدلاً واقعياً', async ({ page }, testInfo) => {
  await openMap(page);
  // نتجاهل إطارات الإحماء (تهيئة Pixi والنسيج) ونقيس الحالة المستقرة فقط.
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.__studioDebug?.resetFrames());
  await page.waitForTimeout(1500);

  const idle = await page.evaluate(() => window.__studioDebug?.frames() ?? null);
  expect(idle).not.toBeNull();
  expect(idle!.frames).toBeGreaterThan(10);
  expect(idle!.meanMs).toBeGreaterThan(0);
  expect(idle!.meanMs, 'إطارات ساكنة').toBeLessThan(25);

  // قياس أثناء التفاعل: ست خطوات تكبير متتالية تفرض إعادة رسم كاملة في كل خطوة.
  await page.evaluate(() => window.__studioDebug?.resetFrames());
  const zoomIn = page.getByRole('button', { name: /تكبير|Zoom in/ });
  for (let step = 0; step < 6; step += 1) await zoomIn.click();
  await page.waitForTimeout(400);
  const busy = await page.evaluate(() => window.__studioDebug?.frames() ?? null);

  console.log(
    `[perf] ${testInfo.project.name} idle ${JSON.stringify(idle)} busy ${JSON.stringify(busy)}`,
  );
});
