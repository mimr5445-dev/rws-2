# TASK 1.1 — تقرير نظام المحتوى (`Content Loader & Schema`)

## 1. ملخص التنفيذ

تم تنفيذ **TASK 1.1** وفق بطاقة المهمة `docs/tasks/TASK_1_1.md` دون أي تعديل على الواجهة أو الرسم أو الفيزياء أو A\* أو حذف `soundSynth.ts` أو `packs/studioUnits.ts`:

1. **إنشاء `src/content/schema.ts`:**
   - تعريف نماذج وخطاطيف التحقق لمانيفستات الوحدات (`UnitManifest`) والأصوات (`SoundManifest`) والخرائط (`MapManifest`).
   - إرجاع أخطاء منظّمة (`ContentValidationError`) تتضمن رمز الخطأ `code` ومسار الملف `path` واسم الملف `file` والحقل `field` ورسالة وصفية دون رمي استثناءات صامتة.
   - فحص المفاتيح المكررة في نص JSON الخام (`findDuplicateJsonKeys`)، ومنع مفاتيح تلويث النموذج الأولي (`__proto__`, `constructor`, `prototype`)، والتحقق من أمان المسارات النسبية (`isSafeRelativeAssetPath`)، ومطابقة أبعاد الخريطة مع `cols * cellSize` و`rows * cellSize` و`navGrid` وحدود المراسي والمضلعات.
2. **إنشاء `src/content/loader.ts`:**
   - تنفيذ `loadContentRoot(rootDir)` لقراءة:
     - `content/units/<id>/unit.json`
     - `content/sounds/manifest.json`
     - `content/maps/<id>/manifest.json`
   - التحقق من وجود ملفات الأصول المرجعية فعلياً على القرص واحتوائها داخل مجلداتها (`sprite` / `model` / `svg` للوحدات، و`files[]` للأصوات، و`background` / `svgOrUrl` للخرائط)، وتعقيم ملفات `.svg` عبر `sanitizeSvg`.
   - رصد المعرّفات المكررة عبر المجلدات (`DUPLICATE_ID`) أو ملفات JSON المعطوبة (`INVALID_JSON`) أو الملفات المفقودة (`MISSING_FILE`) وإعادتها في `errors`.
   - تنفيذ `resolveSoundEvent` لربط الحدث الصوتي من `content/sounds/manifest.json` إن وُجد، والرجوع تلقائياً إلى `SoundSynth` الحالي كبديل (`synth_fallback`) دون تغيير سلوك المحرك أو المولّد.
3. **إضافة أمثلة `content/` (مثال واحد لكل نوع):**
   - وحدة: `content/units/tank_m1/unit.json` + `content/units/tank_m1/sprite.svg`
   - حدث صوتي: `content/sounds/manifest.json` (`"tank.fire"`) + ملف صوت حقيقي `content/sounds/vehicles/tank_fire_01.ogg` (3.6 KB بصيغة Ogg Vorbis)
   - خريطة: `content/maps/desert_pass/manifest.json` + `content/maps/desert_pass/map.svg`
4. **إضافة اختبارات `src/content/loader.test.ts` وتحديث `package.json`:**
   - إضافة `src/content/loader.test.ts` إلى سكربت `"test"` في `package.json`.
   - تغطية 7 اختبارات تشمل: تحميل `content/` الحقيقي في المستودع، المانيفست الصحيح، الحقل الناقص في الأنواع الثلاثة، المعرّف المكرر (وحدة وخريطة وصوت)، ملف الصوت غير الموجود، JSON التالف ومحاولة تجاوز المسار ومفاتيح `__proto__`، والرجوع إلى `SoundSynth`.
5. **تحديث `docs/HANDOFF.md`:** تسجيل إنجاز `TASK 1.1` ونتائج الفحوص الأربعة.

---

## 2. نتائج الفحوص الأربعة (`install`, `lint`, `test`, `build`)

| الفحص | الأمر المنفّذ | رمز الخروج | النتيجة والمخرج كما هو |
|---|---|---|---|
| `install` | `bun install --frozen-lockfile` | `0` | `bun install v1.4.4 (38afee6c8)` — `Checked 89 installs across 179 packages (no changes) [48.00ms]` |
| `lint` | `bun run lint` (`tsc --noEmit`) | `0` | `$ tsc --noEmit` — اجتياز كامل بصفر أخطاء |
| `test` (مباشر) | `npx --yes tsx --test src/content/loader.test.ts` | `0` | `# tests 7 \| # pass 7 \| # fail 0 \| # duration_ms 515.643294` |
| `test` (الشامل) | `bun run test` (`tsx --test src/core/core.test.ts src/packs/packSchema.test.ts src/countries/countries.test.ts src/content/loader.test.ts`) | `0` | `# tests 57 \| # suites 3 \| # pass 57 \| # fail 0 \| # cancelled 0 \| # skipped 0 \| # todo 0 \| # duration_ms 21406.364201` |
| `build` | `bun run build` (`vite build`) | `0` | `vite v8.3.8 building client environment for production...` — `✓ 2451 modules transformed.` \| `✓ built in 953ms` |

---

## 3. الملفات المضافة والمعدّلة

### ملفات جديدة
- `src/content/schema.ts`
- `src/content/loader.ts`
- `src/content/loader.test.ts`
- `content/units/tank_m1/unit.json`
- `content/units/tank_m1/sprite.svg`
- `content/sounds/manifest.json`
- `content/sounds/vehicles/tank_fire_01.ogg`
- `content/maps/desert_pass/manifest.json`
- `content/maps/desert_pass/map.svg`
- `docs/tasks/TASK_1_1_REPORT.md`

### ملفات معدّلة
- `package.json`: إضافة `src/content/loader.test.ts` إلى سكربت `"test"` فقط (دون إضافة أي مكتبات جديدة).
- `docs/HANDOFF.md`: تحديث قسم `## الحالة الآن` بنتائج `TASK 1.1`.

---

## 4. ما لم يُنجز وملاحظات الالتزام بالنطاق

- **عدم وجود مكتبات جديدة:** لم تُضف أي حزم npm أو مكتبات خارجية (`ffmpeg` استُخدم فقط أداةً سطرية لتوليد ملف العينة الصوتي `tank_fire_01.ogg`).
- **دمج الواجهة والمحرك:** لم يتم ربط `src/content/loader.ts` بعد داخل `src/App.tsx` أو `src/core/engine.ts` أو `src/renderer/soundSynth.ts` لأن بطاقة `TASK 1.1` تحظر تعديل تلك الملفات وتُبقي سلوك المحرك الحالي كما هو مع جاهزية دالة `resolveSoundEvent` للتكامل في المهام اللاحقة.
- **Git / الفرع (`task/1-1-content-loader`):** بيئة العمل في AI Studio لا تحتوي على `.git`، لذا يلزم دفع هذه الملفات عبر المزامنة إلى الفرع المخصص وفتح طلب دمج بعد المراجعة.
