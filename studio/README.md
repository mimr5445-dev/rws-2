# استوديو (Studio) — v1

استوديو عربي لبناء مشاهد متحركة تحليلية فوق خرائط حقيقية: ترتّب أحداثاً زمنية (تحركات، مؤثرات، أصوات، كاميرا، إشارات)، ترى المعاينة فوراً، ثم تصدّر فيديو يطابق المعاينة إطاراً بإطار وصوتاً بالعينة.

> هذا المجلد هو تطبيق v1، ويُبنى من الصفر وفق مهارة `studio-forge` v2. نسخة v0.2 السابقة في جذر المستودع لا تُقرأ ولا تُستخدم (انظر `docs/adr/ADR-0000-workspace-and-verification.md`).

## التشغيل

```bash
cd studio
npm ci
npm run dev          # http://localhost:3000
```

## الأوامر

| الأمر               | الوظيفة                             |
| ------------------- | ----------------------------------- |
| `npm run dev`       | خادم التطوير على المنفذ 3000        |
| `npm run build`     | بناء الإنتاج في `dist/`             |
| `npm run lint`      | ESLint مع فرض حدود المعمارية        |
| `npm run typecheck` | `tsc --noEmit`                      |
| `npm test`          | اختبارات الوحدة (Vitest)            |
| `npm run test:e2e`  | Playwright: 390×844 و1280×800 + axe |
| `npm run check`     | حراس الحتمية والتراخيص والقفل       |
| `npm run format`    | Prettier                            |

## المبادئ

- الزمن tick (60 في الثانية) والحتمية: لا ساعة حائط ولا عشوائية غير مبذورة داخل `src/core`.
- النموذج مصدر واحد للحقيقة، وكل تغيير يمر بأمر قابل للتراجع.
- العرض والصوت والتصدير تقرأ الحالة ولا تكتب فيها (مفروض بـ `eslint-plugin-boundaries`).
- محلي أولاً: لا خادم ولا تتبع.

## الهيكل

```
src/
  core/     نقي: model, time, rng, commands, sim, hash, geo, camera, effects, audio/schedule
  render/   Pixi — قراءة فقط
  audio/    Web Audio: معاينة ومزج دون اتصال
  export/   حلقة التصدير والمُرمِّزات
  storage/  IndexedDB + migrations
  content/  تحميل الأصول والتحقق من التراخيص
  i18n/     ar.ts و en.ts بمفاتيح متطابقة
  ui/       React: تخطيط، لوحات، شريط زمني، خصائص
  state/    zustand لحالة الواجهة فقط
  app/      التهيئة
content/    maps, sounds, symbols, schema, presets
tests/      unit, e2e, golden
scripts/    check.mjs (الحتمية والتراخيص)
docs/       adr/, forge/ (المواصفة، المراحل، البوابات، الميزانيات)
```

## الحالة

- المرحلة 00 (التأسيس): منفذة، وبوابتها في `docs/forge/PHASE_0_GATE.md`.
- خريطة الطريق الكاملة في `docs/forge/STUDIO_FORGE_SKILL.md`، والمواصفة في `docs/forge/spec/`.
