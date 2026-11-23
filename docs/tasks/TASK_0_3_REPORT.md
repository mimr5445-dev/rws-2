# TASK 0.3 — تقرير تثبيت أساس التطبيق

## 1. ملخص التنفيذ

تم تنفيذ جميع بنود تثبيت أساس التطبيق ضمن النطاق المحدد:
1. تشغيل الفحوص الأربعة (`install`, `lint`, `test`, `build`) وتسجيل نتائجها الفعلية كما هي (قبل التنظيف وبعده).
2. التحقق من عدم استخدام ملفات `public/assets/aistudio/Paste_*` وحذفها بالكامل.
3. التحقق من عدم استخدام `express` و`@google/genai` و`server.js` وإزالتها من `package.json` وتحديث `bun.lock` وتعديل سكربت `clean`.
4. توحيد معدل الخطوات في الثانية في `index.html` و`metadata.json` والتوثيق (`STUDIO_SPEC.md`) على القيمة الفعلية في `src/core/engine.ts` (`TICK_RATE = 60` / `60 TPS`).
5. التحقق من وجود هيكل التوثيق المطلوب في `docs/` (`PLAN.md`، `ROADMAP.md`، `HANDOFF.md`، و`tasks/TASK_0_3.md`، و`tasks/TASK_1_1.md`)، وتحديث `docs/HANDOFF.md` بالمهمة التالية (`TASK 1.1`).
6. عدم تعديل أي ملف خارج القائمة المحددة وتوثيقه في القسم (6) أدناه.

---

## 2. نتائج الفحوص الأربعة (`install`, `lint`, `test`, `build`)

### أ) الفحص الأساسي قبل التعديلات (Baseline)

| الفحص | الأمر المنفّذ | رمز الخروج | النتيجة والمخرج كما هو |
|---|---|---|---|
| `install` | `bun install --frozen-lockfile` | `0` | `Checked 205 installs across 294 packages` |
| `lint` | `bun run lint` (`tsc --noEmit`) | `0` | لا توجد أخطاء TypeScript |
| `test` | `bun run test` (`tsx --test src/core/core.test.ts src/packs/packSchema.test.ts src/countries/countries.test.ts`) | `0` | `# tests 50` \| `# suites 3` \| `# pass 50` \| `# fail 0` \| `# cancelled 0` \| `# skipped 0` \| `# todo 0` \| `# duration_ms 22092.73997` |
| `build` | `bun run build` (`vite build`) | `0` | `✓ 2451 modules transformed.` \| `✓ built in 970ms` (`dist/index.html 1.95 kB`, `dist/assets/index-CO3uNZqX.css 56.39 kB`, `dist/assets/vendor-pixi-Driw8R4_.js 561.61 kB`, `dist/assets/vendor-react-C05NK5FZ.js 425.65 kB`, `dist/assets/index-DgfujEU2.js 398.17 kB`, `dist/assets/vendor-geo-Bef6ReP4.js 164.01 kB`, `dist/assets/rolldown-runtime-BWaJ3C7D.js 0.91 kB`) |

### ب) مزامنة ملف القفل والفحوص النهائية بعد التعديلات

بعد تعديل `package.json` تم تشغيل `bun install` لتحديث `bun.lock` (`Saved lockfile`, `3 packages removed [26.00ms]`)، ثم شُغّلت الفحوص الأربعة من جديد:

| الفحص | الأمر المنفّذ | رمز الخروج | النتيجة والمخرج كما هو |
|---|---|---|---|
| `install` | `bun install --frozen-lockfile` | `0` | `bun install v1.4.4 (38afee6c8)` — `Checked 89 installs across 179 packages (no changes) [18.00ms]` |
| `lint` | `bun run lint` (`tsc --noEmit`) | `0` | `$ tsc --noEmit` — اجتياز كامل بصفر أخطاء |
| `test` | `bun run test` (`tsx --test src/core/core.test.ts src/packs/packSchema.test.ts src/countries/countries.test.ts`) | `0` | `# tests 50` \| `# suites 3` \| `# pass 50` \| `# fail 0` \| `# cancelled 0` \| `# skipped 0` \| `# todo 0` \| `# duration_ms 22050.92887` |
| `build` | `bun run build` (`vite build`) | `0` | `vite v8.3.8 building client environment for production...` — `✓ 2451 modules transformed.` \| `✓ built in 951ms` (`dist/index.html 1.95 kB`, `dist/assets/index-D3vUNIWg.css 55.78 kB`, `dist/assets/rolldown-runtime-BWaJ3C7D.js 0.91 kB`, `dist/assets/vendor-geo-Bef6ReP4.js 164.01 kB`, `dist/assets/index-57weRwzB.js 398.17 kB`, `dist/assets/vendor-react-C05NK5FZ.js 425.65 kB`, `dist/assets/vendor-pixi-Driw8R4_.js 561.61 kB`) |

---

## 3. التحقق من ملفات `public/assets/aistudio/Paste_*` وحذفها

- بالبحث النصي الشامل عبر المشروع (`src/`، `index.html`، `metadata.json`، `vite.config.ts`، `package.json`، وملفات التوثيق) ثبت عدم وجود أي مرجع أو استيراد لأي ملف باسم `Paste_*` أو المسار `assets/aistudio`.
- تم حذف الملفات الخمسة التالية بالكامل:
  - `public/assets/aistudio/Paste_November_15__2026_-_3_59AM_b56bd850`
  - `public/assets/aistudio/Paste_November_15__2026_-_4_21AM_4343781f`
  - `public/assets/aistudio/Paste_November_15__2026_-_4_43AM_3d5e79e0`
  - `public/assets/aistudio/Paste_November_15__2026_-_5_06AM_76a24677`
  - `public/assets/aistudio/Paste_November_17__2026_-_6_50AM_584c83d3`
- تم التحقق من أن المجلد `public/assets/aistudio` أصبح فارغاً تماماً.

---

## 4. التحقق من `express` و`@google/genai` والسكربت `clean` (`server.js`)

- **نتيجة التحقق:**
  - التطبيق يعمل كتطبيق واجهة أمامية Vite SPA خالص (`"dev": "vite --port=3000 --host=0.0.0.0"` و`"build": "vite build"`).
  - لا يوجد أي ملف `server.js` أو `server.ts` في المشروع، ولا يوجد أي استيراد أو استخدام لـ `express` أو `@google/genai` في `src/` أو `vite.config.ts`.
- **ما تم حذفه في `package.json` (ومزامنته في `bun.lock`):**
  - إزالة `"express": "^4.21.2"` من `dependencies`.
  - إزالة `"@google/genai": "^2.4.0"` من `dependencies`.
  - إزالة `"@types/express": "^4.17.21"` من `devDependencies` (لارتباطها المباشر بحزمة `express` المحذوفة).
  - تعديل سكربت `"clean"` من `"rm -rf dist server.js"` إلى `"rm -rf dist"`.
- **ما بقي وسبب بقائه:**
  - `metadata.json` يحتفظ بحقل `"majorCapabilities": ["MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API"]` وبحقل `"name"` كما هما التزاماً بقيود بيئة تشغيل AI Studio وعدم تعديل قدرات أو اسم التطبيق في `metadata.json`.
  - الحزمة `"dotenv": "^17.2.3"` في `package.json` وملف `.env.example` لم يُحذفا لأنها خارج القائمة الصريحة في البند (3)، وقد أُدرجت أدناه في قائمة الملفات التي تحتاج مراجعة.

---

## 5. توحيد عدد الخطوات في الثانية على `60`

- **القيمة المرجعية الفعلية في `src/core/engine.ts`:** `export const TICK_RATE = 60;` و`export const DT = 1 / TICK_RATE;`.
- **التعديلات المنفّذة:**
  - `index.html` (السطران 9 و14): تحديث `30 TPS` إلى `60 TPS` في وسمي `<meta name="description">` و`<meta property="og:description">`.
  - `metadata.json` (السطر 3): تحديث `30 TPS` إلى `60 TPS` في حقل `"description"`.
  - `STUDIO_SPEC.md`: إضافة توثيق صريح لمعدل المحاكاة (`60 TPS`، أي `TICK_RATE = 60` و`DT = 1/60s`) تحت قسم `## الهيكل الأساسي`.
  - `TASK_0_2_P0_HARDENING_REPORT.md`: تقرير تاريخي مكتمل لمرحلة سابقة ولا يحتوي على إشارة إلى `30 TPS`، لذا بقي دون تعديل.

---

## 6. ما لم يُنجز وملفات خارج النطاق تحتاج تغييراً (لم تُعدَّل)

### أ) ما لم يُنجز في هذه المهمة
- **إجراءات GitHub والفرع (`task/0-3-foundation`):** بيئة العمل الحالية في AI Studio لا تحتوي على مجلد `.git` (`git status` يعيد `fatal: not a git repository`)، لذا لم يُنشأ فرع `task/0-3-foundation` أو طلب دمج (PR) إلى `main` تلقائياً من داخل هذه البيئة، ويلزم دفع التغييرات عبر مزامنة GitHub ثم الدمج بعد المراجعة.
- **تحديث `docs/ROADMAP.md` و`docs/PLAN.md`:** تُركا للمخطط (`Claude`) بعد مراجعة التقرير والدمج في `main` وفق تقسيم الأدوار في `PLAN.md`.
- لم يُشغَّل `npm install` بشكل مستقل لأن ملف القفل المعتمد في المستودع هو `bun.lock` (تم الاعتماد على `bun install` و`bun install --frozen-lockfile` لتفادي توليد `package-lock.json` متعارض).
- لم تُحذف المجلدات الفارغة `public/assets/aistudio` نفسها (اكتُفي بحذف ملفات `Paste_*` المطلوبة).
- لم يُجرَ اختبار متصفح تفاعلي في هذه المهمة لأنها اقتصرت على التنظيف وتثبيت الأساس والملفات الوصفية دون تغيير شيفرة العرض أو المحرك.

### ب) ملفات خارج القائمة تحتاج تغييراً/مراجعة لاحقاً (لم تُعدَّل التزاماً بحدود المهمة)
1. **`src/core/validator.ts` (السطر 351):**
   - يحتوي على قيمة ثابتة قديمة: `const DT_APPROX = 1 / 30;` بدلاً من مطابقة `DT` (`1 / 60`) من `src/core/engine.ts`.
2. **`package.json` (السطر 22) و`.env.example`:**
   - `"dotenv": "^17.2.3"` في `package.json` ومتغيرات `GEMINI_API_KEY` و`APP_URL` في `.env.example` غير مستخدمة حالياً في كود العميل.
3. **`src/core/catalog.ts` (السطر 41) و`STUDIO_SPEC.md` (السطران 16 و22):**
   - يسرد `catalog.ts` (و`STUDIO_SPEC.md`) 8 أصوات ووضعَي ضربة فقط (`airstrike | missile`)، بينما يدعم المحرك وأنواع البيانات والواجهة (`src/core/types.ts`، `src/renderer/soundSynth.ts`، `src/components/SpecModal.tsx`) 13 صوتاً و8 أوضاع ضربة.
4. **ملفات بنية غير مكتملة الربط من مهمة سابقة (`src/core/cameraBehaviorRuntime.ts`، `src/storage/studioDb.ts`، `src/core/cinematicDirector.ts`، `src/renderer/soundSynth.ts`، `src/App.tsx`):**
   - توجد أنواع ومخازن IndexedDB (`audio_clips`، `camera_presets`، `camera_scripts`) ودوال إعدادات (`setSoundConfig`، `setClips`، `setBehaviorSettings`) غير مربوطة بعد بواجهة تحكم مكتملة في `src/App.tsx`.
