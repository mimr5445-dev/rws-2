# ملف التسليم

**اقرأ هذا الملف أولاً، ثم `docs/PLAN.md` و`docs/ROADMAP.md`.**

## الحالة الآن
- المرحلة: 1 (نظام المحتوى) — `TASK 1.1` منفّذة محلياً في بيئة AI Studio (بانتظار الدفع إلى فرع `task/1-1-content-loader` والمراجعة والدمج في `main` على GitHub).
- المهمة المكتملة: `TASK 1.1` — التقرير في `docs/tasks/TASK_1_1_REPORT.md`.
- المهمة التالية: مراجعة وإغلاق `TASK 1.1` وتحديد البطاقة التالية من المخطط (`Claude`) والمالك.
- الفحوص الأربعة على حالة `TASK 1.1` النهائية:
  - `bun install --frozen-lockfile`: Exit `0` (`Checked 89 installs across 179 packages`)
  - `bun run lint` (`tsc --noEmit`): Exit `0`
  - `bun run test`: Exit `0` (`57/57 pass` — تشمل `src/content/loader.test.ts`)
  - `bun run build`: Exit `0` (`vite build`, `953ms`)

## تغيير اسم المستودع
- الاسم الجديد: `rws-2`، والقديم: `rws2-java`.
- بعد التغيير على GitHub، يحدّث المستودع المحلي:
  `git remote set-url origin https://github.com/mimr5445-dev/rws-2.git`
- GitHub يحوّل الروابط القديمة تلقائياً، لكن الوكلاء يستخدمون الاسم الجديد.

## كيف تستأنف العمل
1. `git checkout main && git pull` (GitHub هو المصدر الوحيد، فلا تعتمد على نسخة قديمة في بيئتك)
2. اقرأ `docs/HANDOFF.md` ثم البطاقة النشطة (`docs/tasks/TASK_1_1.md` بعد اعتماد إغلاق `TASK 0.3`).
3. أنشئ فرع `task/<id>-<slug>` ونفّذ البطاقة فقط.
4. شغّل الفحوص، واكتب التقرير، وحدّث هذا الملف قبل إنهاء الجلسة.

## مشكلات معروفة مفتوحة
- `App.tsx` و`studioRenderer.ts` كبيرين جداً.
- `src/core/validator.ts` (سطر 351): لا يزال يستخدم `const DT_APPROX = 1 / 30;` بدلاً من `DT` (`1 / 60`) من `src/core/engine.ts` (تُرِك دون تعديل التزاماً بنطاق `TASK 0.3`).
- `dotenv` في `package.json` و`.env.example` غير مستخدمين حالياً في العميل (وكذلك `majorCapabilities` في `metadata.json` المحفوظة لمتطلبات بيئة AI Studio).
- تباين جزئي في قائمة الأصوات/أوضاع الضربات بين `STUDIO_SPEC.md` و`src/core/catalog.ts` مقابل `src/core/types.ts`، وبقايا ربط أولية غير مكتملة لقاعدة التحكم في `src/core/cameraBehaviorRuntime.ts` و`src/storage/studioDb.ts`.
- (مُغلق في `TASK 0.3`) تم حذف `express` و`@google/genai` و`@types/express` وإزالة `server.js` من سكربت `clean`.
- (مُغلق في `TASK 0.3`) تم توحيد `60 TPS` في `index.html` و`metadata.json` و`STUDIO_SPEC.md`.
- (مُغلق في `TASK 0.3`) تم حذف ملفات `public/assets/aistudio/Paste_*` الخمسة غير المستخدمة.
