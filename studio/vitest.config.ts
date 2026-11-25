import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx', 'tests/golden/**/*.test.ts'],
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      include: [
        'src/core/**/*.ts',
        'src/content/**/*.ts',
        'src/render/plan.ts',
        'src/render/layers.ts',
        'src/render/perf.ts',
      ],
      // ملفات التجميع وإدخال الخريطة (fetch/crypto) تُغطّى في e2e لا في الوحدة.
      exclude: ['src/**/index.ts'],
      reporter: ['text', 'json-summary'],
      reportsDirectory: 'coverage',
      // العتبات المقيسة في المرحلة 02 (docs/forge/QUALITY.md): 91.71% أسطر، 90.17% عبارات.
      // تُرفع بعد كل مرحلة إلى أقل من المقيس بهامش أمان صغير.
      thresholds: {
        lines: 92,
        statements: 90,
        functions: 89,
        branches: 78,
      },
    },
  },
});
