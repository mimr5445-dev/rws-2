import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const require = createRequire(import.meta.url);
const AXE_PATH = path.join(path.dirname(require.resolve('axe-core/package.json')), 'axe.min.js');
const SHOT_DIR = path.resolve(process.cwd(), 'docs/forge/shots/phase-00');

async function clearSettings(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.clear();
    } catch {
      // تجاهل: التخزين غير متاح في هذا السياق.
    }
  });
}

test.beforeAll(async () => {
  await mkdir(SHOT_DIR, { recursive: true });
});

test('صدفة التخطيط: بلا تمرير أفقي، واتجاه صحيح، وaxe نظيف', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await clearSettings(page);
  await page.goto('/');
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('button', { name: /تشغيل|Play/ }).first()).toBeVisible();

  const html = page.locator('html');
  await expect(html).toHaveAttribute('dir', 'rtl');
  await expect(html).toHaveAttribute('lang', 'ar');

  const metrics = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    fontReady: document.fonts.status,
  }));
  expect(metrics.overflow, 'التمرير الأفقي يجب أن يكون صفراً').toBeLessThanOrEqual(1);

  await page.addScriptTag({ path: AXE_PATH });
  const results = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (options: unknown) => Promise<AxeResult> } })
      .axe;
    return axe.run({ runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] });
  });

  const serious = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(
    serious.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.map((node) => node.target.join(' ')),
    })),
    'انتهاكات axe الجسيمة',
  ).toEqual([]);

  await page.screenshot({
    path: path.join(SHOT_DIR, `${testInfo.project.name}.png`),
    fullPage: false,
  });

  expect(pageErrors).toEqual([]);
});

test('مفتاح اللغة يعمل ويُحفظ بعد إعادة التحميل', async ({ page }) => {
  // لا نستخدم clearSettings هنا: addInitScript يعمل مع كل تنقّل ويُفقد الحفظ عند إعادة التحميل.
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const toggle = page.getByRole('button', { name: 'تغيير اللغة' });
  await toggle.click();

  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('button', { name: 'Change language' })).toBeVisible();

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
});

interface AxeResult {
  violations: {
    id: string;
    impact: string | null;
    nodes: { target: string[] }[];
  }[];
}

test('ترتيب الأعمدة يتبع اللغة فيزيائياً (S0.5)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith('mobile'), 'الألواح الجانبية لسطح المكتب فقط');

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const viewport = page.viewportSize();
  if (!viewport) throw new Error('لا يوجد مقاس نافذة');

  const boxes = async () => ({
    library: await page.getByRole('complementary', { name: 'المكتبة', exact: true }).boundingBox(),
    inspector: await page
      .getByRole('complementary', { name: 'الخصائص', exact: true })
      .boundingBox(),
  });

  const arabic = await boxes();
  expect(arabic.library, 'لوحة المكتبة ظاهرة').not.toBeNull();
  expect(arabic.inspector).not.toBeNull();
  if (arabic.library && arabic.inspector) {
    // بالعربية: المكتبة على اليمين (حافتها اليمنى عند حد الشاشة).
    expect(Math.abs(arabic.library.x + arabic.library.width - viewport.width)).toBeLessThanOrEqual(
      2,
    );
    expect(Math.abs(arabic.inspector.x)).toBeLessThanOrEqual(2);
    expect(arabic.library.x).toBeGreaterThan(arabic.inspector.x);
  }

  await page.getByRole('button', { name: 'تغيير اللغة' }).click();
  await page.waitForTimeout(200);

  const english = {
    library: await page.getByRole('complementary', { name: 'Library', exact: true }).boundingBox(),
    inspector: await page
      .getByRole('complementary', { name: 'Properties', exact: true })
      .boundingBox(),
  };
  if (english.library && english.inspector) {
    // بالإنجليزية: المكتبة على اليسار.
    expect(Math.abs(english.library.x)).toBeLessThanOrEqual(2);
    expect(
      Math.abs(english.inspector.x + english.inspector.width - viewport.width),
    ).toBeLessThanOrEqual(2);
    expect(english.library.x).toBeLessThan(english.inspector.x);
  }
});
