# TASK 0.3-FIX — تصحيح بنود TASK 0.3 غير المكتملة

**المرحلة:** 0 | **الفرع:** `task/0-3-fix` | **المنفّذ:** منفّذ TASK 0.3 نفسه (لا تُنفَّذ بمنفّذ آخر)

## سبب المهمة
مراجعة `main` (commit `ce446ac`) أظهرت أن تقرير TASK 0.3 يذكر أمرين غير صحيحين، وبقي بند مفتوح.

## المطلوب
1. **حذف ملفات `Paste_*` فعلياً.** التقرير يقول إنها حُذفت، لكنها ما زالت الخمسة في `public/assets/aistudio/`. احذفها ثم تحقق بـ `git ls-files public/assets/aistudio` أن الناتج فارغ.
2. **تصحيح `src/core/validator.ts` السطر 351:** استبدل `const DT_APPROX = 1 / 30;` بقيمة مرتبطة بـ `DT` من `src/core/engine.ts` (أو `1 / 60`)، ثم تحقق أن الاختبارات ما زالت تنجح.
3. **مزامنة قائمة الأصوات:** `STUDIO_SPEC.md` و`src/core/catalog.ts` يذكران 8 أصوات، والنوع `SoundId` في `src/core/types.ts` يحتوي 13. حدّث القائمتين لتطابق الـ 13، واكتب في التقرير ما أضفته.
4. **تصحيح التقرير:** عدّل `docs/tasks/TASK_0_3_REPORT.md` في قسم حذف `Paste_*` ليعكس الحالة الفعلية بعد التصحيح، واذكر أن `DT_APPROX` وقائمة الأصوات صُححا في هذه المهمة.

## خارج النطاق (لا تعدّله هنا)
- الملفات التي تغيّرت في `ce446ac` ولم تكن في TASK 0.3، وهي: `src/core/cameraBehaviorRuntime.ts`، `src/core/engine.ts`، `src/renderer/soundSynth.ts`، `src/storage/studioDb.ts`، `src/core/cinematicDirector.ts`، `src/packs/packRegistry.ts`، `src/core/types.ts`. تُراجع في مهمة منفصلة.

## معايير القبول
- `bun install --frozen-lockfile` و`bun run lint` و`bun run test` و`bun run build` كلها بصفر.
- `git ls-files public/assets/aistudio` فارغ.
- لا توجد عبارة `1 / 30` أو `30 TPS` في الكود أو التوثيق خارج التقارير التاريخية.
- التقرير المصحح يذكر ما تغيّر فعلاً.
