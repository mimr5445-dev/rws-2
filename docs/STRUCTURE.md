# خريطة المجلدات (`src/`)

| المجلد | ماذا يوجد فيه |
|---|---|
| `src/app/` | حالة الغلاف ومنطق الإقلاع وحلقة 60 TPS، ومعالجة نقر الخريطة، وتسجيل الفيديو، والشريط العلوي والسفلي المستخرجة من `App.tsx` |
| `src/engine/` | محرك المحاكاة `engine.ts` مقسماً مع `engineTime.ts` و`engineMovement.ts` و`engineCombat.ts` و`engineTimeline.ts` ومسار A* `pathfinding.ts` |
| `src/validation/` | مدقق السيناريوهات `validator.ts` مع `validatorHelpers.ts` و`validatorLifecycle.ts` و`validatorSteps.ts` |
| `src/core/` | أنواع البيانات المشتركة `types.ts`، والكاميرا، والمخرج السينمائي، والكتالوج، واختبارات الأساس `core.test.ts` |
| `src/renderer/` | عارض PixiJS `studioRenderer.ts` مقسماً إلى طبقات في `src/renderer/layers/` (الكاميرا، الخريطة، الكيانات، المؤثرات، التصويب، الإدخال، والأدوات) والصوت المولّد `soundSynth.ts` |
| `src/panels/` | اللوحات الجانبية (`StudioSidebar.tsx` مع أقسامها في `src/panels/sidebar/`، ولوحة الوحدات، ولوحة الأدوات، وشريط أوامر الوحدة، ولوحة معلومات الدولة، وبانيّ الحزم) |
| `src/modals/` | النوافذ المنبثقة (`SpecModal`، و`CountryEditorModal` مع تبويباته في `src/modals/countryEditor/`، ودليل الدول) |
| `src/packs/` | حزم الخرائط والوحدات، والتحقق منها، وتسجيلها |
| `src/packs/units/` | تعريفات الوحدات مقسّمة: برية، وجوية، وبحرية، وبنية تحتية، والقوالب المشتركة |
| `src/countries/` | بيانات الدول وتعريفاتها واختيارها. بذور الدول مقسّمة إلى `countrySeed.ts` و`countrySeedB.ts` و`countrySeedHelpers.ts` |
| `src/maps/` | محرك الخرائط الجغرافية `worldGeoEngine.ts` مقسماً مع `worldGeoGeometry.ts` و`worldGeoCorridors.ts` |
| `src/storage/` | قاعدة بيانات IndexedDB |
| `src/content/` | محمّل المحتوى ومخطط التحقق منه. `soundResolver.ts` منطق الأصوات بلا `node:fs`، و`bundledSounds.ts` محمّل الأصوات للمتصفح عبر Vite، و`soundDiscovery.ts` يشتق اسم الحدث من اسم الملف ويتجاهل الملفات الفارغة |
| `src/scenarios/` | سيناريوهات YAML المدمجة (تُنقل إلى `content/` في TASK 1.4) |
| `src/index.css`، `src/main.tsx`، `src/types-external.d.ts` | نقطة الدخول والأنماط وأنواع خارجية |

## ملاحظات
- جميع ملفات الكود المصدري في `src/` أصبحت `<= 800` سطر بعد `TASK 0.5C` (أكبر ملف مصدري `src/renderer/studioRenderer.ts` بـ 754 سطراً).
- الاستثناء المسموح والوحيد فوق 800 سطر هو ملف الاختبارات `src/core/core.test.ts` (2092 سطراً)، وموثّق تبريره في `docs/tasks/TASK_0_5C_REPORT.md`.
