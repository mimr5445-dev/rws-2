# ملف التسليم

**اقرأ هذا الملف أولاً، ثم `docs/PLAN.md` و`docs/ROADMAP.md`.**

## الحالة الآن
- المرحلة: 0 (التثبيت) — `TASK 0.3` و`0.3-FIX` منجزتان، `TASK 0.4` منجزة محلياً وتنتظر الدفع إلى GitHub، وبقيت `TASK 0.5` (تقسيم المجلدات) كمسودة في `docs/tasks/TASK_0_5.md`.
- `TASK 0.3`: تقريرها السابق صُحح في `docs/tasks/TASK_0_3_FIX_REPORT.md`.
- `TASK 0.4`: منجزة في بيئة AI Studio (أُزيل `new Function` و`validateAndCompileCameraScript` من `src/core/cameraBehaviorRuntime.ts`، وأُبقيت قراءة JSON فقط مع اختبارات `cameraBehaviorRuntime.test.ts` و`studioDb` v4 وتوثيق `PackRegistry` في `docs/PLAN.md`). التقرير: `docs/tasks/TASK_0_4_REPORT.md`.
- `TASK 1.1`: منفّذة (`src/content/*` + `content/*` + `docs/tasks/TASK_1_1_REPORT.md`)، وتنتظر المراجعة المنطقية وإغلاق `TASK 0.4` على GitHub.
- الفحوص الأربعة ناجحة بعد `TASK 0.4`: `bun install --frozen-lockfile` (`Exit 0`) و`bun run lint` (`Exit 0`) و`bun run test` (`62/62` نجاح) و`bun run build` (`Exit 0`).

## ما يلي
1. دفع تغييرات `TASK 0.4` إلى الفرع `task/0-4-security` ودمجها في `main` بعد المراجعة.
2. مراجعة `TASK 1.1` (`docs/tasks/TASK_1_1_REPORT.md`) ومراجعة مسودة `TASK 0.5` (`docs/tasks/TASK_0_5.md`) لاعتمادها وتنفيذها قبل `TASK 1.2` (إذ أصبحت `TASK 1.2` تعتمد على `TASK 1.1` و`TASK 0.5`).
3. البطاقات `TASK 0.5` ومن `TASK 1.2` حتى `TASK 7.2` مكتوبة كمسودات في `docs/tasks/`، ومرتبة في `docs/ROADMAP.md`.

## تغيير اسم المستودع
- الاسم الحالي: `rws-2`، والقديم: `rws2-java`.
- بعد التغيير، يحدّث المستودع المحلي:
  `git remote set-url origin https://github.com/mimr5445-dev/rws-2.git`

## كيف تستأنف العمل
1. `git checkout main && git pull`
2. اقرأ `docs/HANDOFF.md` ثم البطاقة النشطة.
3. أنشئ فرع `task/<id>-<slug>` ونفّذ البطاقة فقط.
4. شغّل الفحوص، واكتب التقرير، وحدّث هذا الملف قبل إنهاء الجلسة.
