import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const ELEMENTS = [
  { type: 'core', pattern: 'src/core/**' },
  { type: 'render', pattern: 'src/render/**' },
  { type: 'audio', pattern: 'src/audio/**' },
  { type: 'export', pattern: 'src/export/**' },
  { type: 'storage', pattern: 'src/storage/**' },
  { type: 'content', pattern: 'src/content/**' },
  { type: 'i18n', pattern: 'src/i18n/**' },
  { type: 'state', pattern: 'src/state/**' },
  { type: 'ui', pattern: 'src/ui/**' },
  { type: 'app', pattern: 'src/app/**' },
];

// قواعد الاعتماد من ARCHITECTURE §4: تُفرض بالأداة لا بالذوق.
// from = الطبقة المستوردة، to = الطبقة المستوردة منها. الباقي مباح افتراضاً.
const POLICIES = [
  {
    from: { element: { types: ['core'] } },
    disallow: {
      to: [
        {
          element: {
            types: ['render', 'ui', 'state', 'app', 'audio', 'export', 'storage', 'content'],
          },
        },
        { module: { origin: 'external', source: '{react,react-dom,pixi.js}' } },
      ],
    },
    message: 'النواة نقية: لا تستورد React ولا Pixi ولا أي طبقة خارجية (ARCHITECTURE §4).',
  },
  {
    from: { element: { types: ['render', 'audio', 'export'] } },
    disallow: { to: { element: { types: ['ui', 'state', 'app'] } } },
    message: 'طبقات العرض والصوت والتصدير تقرأ النواة ولا تعرف الواجهة.',
  },
  {
    from: { element: { types: ['storage', 'content'] } },
    disallow: {
      to: { element: { types: ['ui', 'state', 'app', 'render', 'audio', 'export'] } },
    },
    message: 'التخزين والمحتوى مستقلان عن الواجهة والعرض.',
  },
  {
    from: { element: { types: ['i18n'] } },
    disallow: {
      to: {
        element: {
          types: ['ui', 'state', 'app', 'render', 'audio', 'export', 'storage', 'content', 'core'],
        },
      },
    },
    message: 'الترجمة طبقة ورقية لا تعتمد على أي شيء آخر.',
  },
  {
    from: { element: { types: ['state'] } },
    disallow: { to: { element: { types: ['ui', 'app', 'render', 'audio', 'export'] } } },
    message: 'حالة الواجهة تستدعي الأوامر فقط، ولا تعرف مكونات الواجهة.',
  },
  {
    from: { element: { types: ['ui'] } },
    disallow: { to: { element: { types: ['render', 'audio', 'export', 'storage'] } } },
    message: 'الواجهة تعدّل عبر الأوامر (state) ولا تلمس الرسم أو التصدير مباشرة.',
  },
];

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'content/schema/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { boundaries, 'react-hooks': reactHooks },
    settings: {
      'boundaries/include': ['src/**/*'],
      'boundaries/ignore': ['**/*.test.ts', '**/*.test.tsx'],
      'boundaries/elements': ELEMENTS,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'boundaries/dependencies': [
        'error',
        { default: 'allow', checkAllOrigins: true, policies: POLICIES },
      ],
    },
  },
  {
    files: ['**/*.mjs', 'scripts/**/*.js'],
    languageOptions: { globals: globals.node },
  },
  prettier,
);
