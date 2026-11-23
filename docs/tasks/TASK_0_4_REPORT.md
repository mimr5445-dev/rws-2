# TASK 0.4 — تقرير إغلاق ثغرة تنفيذ الكود ومراجعة `ce446ac`

## 1. ملخص التنفيذ

تم تنفيذ جميع بنود بطاقة `docs/tasks/TASK_0_4.md` وإغلاق الثغرة الأمنية الموصوفة في `docs/tasks/REVIEW_ce446ac.md`:

1. **إزالة مسار تنفيذ الكود من `src/core/cameraBehaviorRuntime.ts`:**
   - حُذف `new Function` و`validateAndCompileCameraScript` و`EXAMPLE_CAMERA_SCRIPTS` وكافة أنواع السكربتات القابلة للتنفيذ.
   - أُبقِي فقط على `DEFAULT_CAMERA_MOTION_SETTINGS` و`BUILT_IN_CAMERA_PRESETS` و`sanitizeCameraMotionSettings`، مع استبدال التحميل بدالة `parseCameraPresetJson` التي تقرأ إعدادات JSON خالصة فقط وترفض أي شيفرات تنفيذية أو مفاتيح خطرة (`__proto__`, `constructor`, `prototype`, `evaluate`, `update`, `onInteract`, `code`, `script`).
2. **التحقق الشامل من خلو `src/` من تنفيذ الكود الديناميكي:**
   - تنفيذ فحص `grep -rnE 'validateAndCompileCameraScript|new Function|\beval\(' src/` وأعاد `0` نتائج.
3. **إضافة اختبارات `src/core/cameraBehaviorRuntime.test.ts` (وإضافتها إلى `package.json`):**
   - اختبار قراءة إعدادات JSON صحيحة (مسطحة ومتداخلة `settings`).
   - اختبار تقييد القيم خارج النطاق (`sanitizeCameraMotionSettings`) وتطبيع الزوايا والتعامل مع `NaN`/`Infinity`.
   - اختبار رفض محاولات تنفيذ الكود (بما فيها `Object["cons"+"tructor"]` وحقول `evaluate` وتلويث `__proto__` وJSON التالف).
   - اختبار `SoundSynth.setSoundConfig` و`SoundSynth.setClips` وتمرير `meta` في بيئة Node.
   - اختبار ترقية `studioDb` إلى الإصدار `4` والتحقق من إنشاء المخازن الثلاثة الجديدة (`audio_clips`، `camera_presets`، `camera_scripts`) وحفظها وقراءتها.
4. **توثيق سلوك `PackRegistry` في `docs/PLAN.md`:**
   - توثيق تحميل الوحدات المخصصة من IndexedDB في `init()` وتجاوز الوحدات المدمجة بنفس المعرّف، وسلوك `saveCustomActor` و`resetOrDeleteActor`.
5. **تحديث `docs/ROADMAP.md` و`docs/HANDOFF.md`.**

---

## 2. نتائج الفحوص الأربعة والفحص الأمني

| الفحص | الأمر المنفّذ | رمز الخروج | النتيجة والمخرج كما هو |
|---|---|---|---|
| الفحص الأمني | `grep -rnE 'validateAndCompileCameraScript\|new Function\|\beval\(' src/` | `0` (بعد معالجة الغياب) | `0` نتائج (`MATCH_COUNT=0`, `ZERO_DANGEROUS_CALLS`) |
| `install` | `bun install --frozen-lockfile` | `0` | `bun install v1.4.4 (38afee6c8)` — `Checked 89 installs across 179 packages (no changes) [9.00ms]` |
| `lint` | `bun run lint` (`tsc --noEmit`) | `0` | `$ tsc --noEmit` — اجتياز كامل بصفر أخطاء |
| `test` (المستهدف) | `npx --yes tsx --test src/core/cameraBehaviorRuntime.test.ts` | `0` | `# tests 5 \| # pass 5 \| # fail 0 \| # duration_ms 383.254854` |
| `test` (الشامل) | `bun run test` | `0` | `# tests 62 \| # suites 3 \| # pass 62 \| # fail 0 \| # cancelled 0 \| # skipped 0 \| # todo 0 \| # duration_ms 23972.845213` |
| `build` | `bun run build` (`vite build`) | `0` | `vite v8.3.8 building client environment for production...` — `✓ 2451 modules transformed.` \| `✓ built in 926ms` |

---

## 3. الملفات المعدّلة والمضافة

- `src/core/cameraBehaviorRuntime.ts` (تعديل: إزالة `new Function` و`validateAndCompileCameraScript` والإبقاء على إعدادات JSON فقط عبر `parseCameraPresetJson` و`sanitizeCameraMotionSettings`)
- `src/core/cameraBehaviorRuntime.test.ts` (جديد: 5 اختبارات تغطي JSON والكاميرا والمقاطع الصوتية و`studioDb` v4)
- `package.json` (تعديل سطر `test` لإدراج `src/core/cameraBehaviorRuntime.test.ts`)
- `docs/PLAN.md` (توثيق سلوك `PackRegistry`)
- `docs/ROADMAP.md` و`docs/HANDOFF.md` (تحديث الحالة بعد إغلاق `TASK 0.4`)
- `docs/tasks/TASK_0_4_REPORT.md` (هذا التقرير)

---

## 4. ما لم يُنجز وملاحظات النطاق

- **ربط واجهة قاعدة التحكم (`setSoundConfig`/`setClips`/`setBehaviorSettings` في `App.tsx`):** لم تُحذف الدوال الخلفية غير المستدعاة في `soundSynth.ts` و`cinematicDirector.ts` التزاماً بحدود البطاقة (عدم تعديل `App.tsx` أو الواجهة)، وستُربط أو تُنظف في مهام المرحلة 2 حسب `ROADMAP.md`.
- **Git / الفرع (`task/0-4-security`):** بيئة AI Studio لا تحتوي على `.git`، لذا يلزم دفع التغييرات إلى فرع `task/0-4-security` ودمجها في `main` عبر المزامنة.
