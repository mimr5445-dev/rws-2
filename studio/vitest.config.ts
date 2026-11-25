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
      include: ['src/core/**/*.ts'],
      exclude: ['src/core/**/index.ts'],
      reporter: ['text', 'json-summary'],
      reportsDirectory: 'coverage',
      // العتبات المقيسة في المرحلة 01 (docs/forge/QUALITY.md): 90% أسطر، 88.2% عبارات.
      thresholds: {
        lines: 88,
        statements: 86,
        functions: 82,
        branches: 74,
      },
    },
  },
});
