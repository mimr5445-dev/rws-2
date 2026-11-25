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
  await clearSettings(page);
  await page.goto('/');

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
