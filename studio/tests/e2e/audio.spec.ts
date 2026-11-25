import { expect, test, type Page } from '@playwright/test';
import './debug';

async function openScene(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.clear();
    } catch {
      // التخزين غير متاح — لا يهم لهذا الاختبار.
    }
  });
  await page.goto('/');
  await expect(page.getByTestId('map-canvas')).toHaveAttribute('data-map-ready', 'true', {
    timeout: 30_000,
  });
  await page.evaluate(() => window.__studioDebug?.loadDemoScene());
}

test('الكتالوج الصوتي يُحمَّل ويُتحقَّق من بصمته', async ({ page }) => {
  await openScene(page);
  const audio = await page.evaluate(() => window.__studioDebug?.loadAudio() ?? null);
  expect(audio).not.toBeNull();
  expect(audio!.ready, `خطأ: ${audio?.error}`).toBe(true);
  expect(audio!.error).toBeNull();
  expect(audio!.sounds).toBe(4);
});

test('المزج دون اتصال: المدة بالعينات نفسها والذروة ضمن عينة من الموضع النظري', async ({
  page,
}) => {
  await openScene(page);
  await page.evaluate(() => window.__studioDebug?.loadAudio());

  const bounced = await page.evaluate(() => window.__studioDebug?.bounceAudio() ?? null);
  expect(bounced).not.toBeNull();
  // 180 tick عند 48000 Hz = 144000 عينة بالضبط، وثلاث ثوانٍ.
  expect(bounced!.frameCount).toBe(144_000);
  expect(bounced!.durationSeconds).toBe(3);
  expect(bounced!.peak).toBeGreaterThan(0.05);
  // أول صوت في المشهد عند tick 60 ⇒ العينة 48000.
  expect(Math.abs(bounced!.onsetSample - 48_000)).toBeLessThanOrEqual(1);
});

test('جدول المعاينة يُحسب من الـ tick بلا انحراف بعد seek', async ({ page }) => {
  await openScene(page);
  await page.evaluate(() => window.__studioDebug?.loadAudio());

  const fromZero = await page.evaluate(() => window.__studioDebug?.audioPlan(0) ?? []);
  expect(fromZero.map((item) => item.id)).toEqual(['c2', 'c1', 'e1']);
  expect(fromZero.map((item) => item.delay)).toEqual([1, 2, 2.166667]);

  const afterSeek = await page.evaluate(() => window.__studioDebug?.audioPlan(90) ?? []);
  expect(afterSeek.map((item) => item.id)).toEqual(['c1', 'e1']);
  expect(afterSeek.map((item) => item.delay)).toEqual([0.5, 0.666667]);

  // من tick 100 يبقى cue الوصول (120) والمؤثر (130).
  const nearEnd = await page.evaluate(() => window.__studioDebug?.audioPlan(100) ?? []);
  expect(nearEnd.map((item) => item.id)).toEqual(['c1', 'e1']);
  expect(nearEnd.map((item) => item.delay)).toEqual([0.333333, 0.5]);
});

test('تشغيل المعاينة يجدول الأصوات فعلياً ويمكن إيقافه', async ({ page }) => {
  await openScene(page);
  await page.evaluate(() => window.__studioDebug?.loadAudio());

  const plan = await page.evaluate(() => window.__studioDebug?.playAudio(60) ?? []);
  expect(plan.map((item) => item.id)).toEqual(['c2', 'c1', 'e1']);
  expect(plan[0]?.delay).toBe(0);

  const playing = await page.evaluate(() => {
    window.__studioDebug?.stopAudio();
    return window.__studioDebug?.audioPlan(0).length ?? 0;
  });
  expect(playing).toBe(3);
});
