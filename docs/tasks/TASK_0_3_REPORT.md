# تقرير TASK 0.3 — تثبيت الأساس

## الفحوص الأربعة

شُغّلت أوامر Bun باستخدام `./node_modules/.bin/bun` بعد تثبيت Bun محلياً لأن أمر `bun` لم يكن متاحاً في PATH. نتيجة التثبيت الأولى بعد حذف الحزم كانت فشلاً متوقعاً بسبب عدم تزامن القفل؛ حُدّث `bun.lock` ثم أُعيدت الفحوص. النتائج النهائية كما ظهرت:

### Install
الأمر: `./node_modules/.bin/bun install --frozen-lockfile`

```text
bun install v1.4.5 (a7733435c)

Checked 89 installs across 179 packages (no changes) [8.00ms]
```

### Lint
الأمر: `./node_modules/.bin/bun run lint`

```text
$ tsc --noEmit
```

رمز الخروج: 0.

### Test
الأمر: `./node_modules/.bin/bun run test`

```text
$ tsx --test src/core/core.test.ts src/packs/packSchema.test.ts src/countries/countries.test.ts
...
1..46
# tests 50
# suites 3
# pass 50
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 23014.239304
```

رمز الخروج: 0.

### Build
الأمر: `./node_modules/.bin/bun run build`

```text
$ vite build
vite v8.3.8 building client environment for production...
transforming...
✓ 2450 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                             1.95 kB │ gzip:   0.82 kB
dist/assets/index-D3vUNIWg.css             55.78 kB │ gzip:   9.72 kB
dist/assets/rolldown-runtime-BWaJ3C7D.js    0.91 kB │ gzip:   0.51 kB
dist/assets/vendor-geo-Bef6ReP4.js        164.01 kB │ gzip:  63.13 kB
dist/assets/vendor-react-D-GBbl48.js      218.70 kB │ gzip:  68.26 kB
dist/assets/index-CaPRmXXd.js             371.01 kB │ gzip: 101.23 kB
dist/assets/vendor-pixi-Driw8R4_.js       561.61 kB │ gzip: 161.20 kB

✓ built in 2.67s
```

رمز الخروج: 0.

## التغييرات والتحقق

- بحثت عن أسماء `Paste_*` في مراجع المشروع؛ لم توجد مراجع استخدام في كود التطبيق، والبحث لم يُظهر إلا ورود الاسم في وثائق المهمة/التسليم. حُذفت الملفات الخمسة غير المستخدمة من `public/assets/aistudio/`.
- حُذفت `express` و`@google/genai` و`@types/express` لعدم وجود استخدام فعلي لها. عُدّل سكربت `clean` ليحذف `dist` فقط بدلاً من الإشارة إلى ملف `server.js` غير الموجود.
- وُحّدت الأوصاف في `index.html` و`metadata.json` والتوثيق على 60 TPS، المطابقة لـ `TICK_RATE = 60` في `src/core/engine.ts`.
- تأكد وجود `docs/PLAN.md` و`docs/ROADMAP.md` و`docs/HANDOFF.md` ومجلد `docs/tasks/`.

## ما لم يُنجز

- لم يُنشأ فرع `task/0-3-foundation` ولم يُفتح Pull Request: تعليمات بيئة Arena الحالية تثبّت العمل على الفرع `arena/e7bc1645-rws-2` وتمنع تبديل الفرع أو إنشاء فرع آخر. كذلك المستودع الموجود في مساحة العمل هو `rws-2`، وليس `rws2-java` كما ورد في الطلب. لم أعدّل `main` ولم أدفع إلى أي فرع.
- لا توجد ملفات أخرى خارج نطاق المهمة تحتاج تعديلاً.
