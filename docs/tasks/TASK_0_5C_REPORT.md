# TASK 0.5C — تقرير إكمال تقسيم الملفات الكبيرة

**الحالة النهائية:** منجزة (بانتظار المراجعة والدمج على `main`)
**الفرع:** `task/0-5c` | **المنفّذ:** AI Studio Build Agent

## 1. ما نُفّذ
تم إنزال جميع ملفات الكود المصدري السبعة المتبقية فوق 800 سطر في `src/` إلى 800 سطر أو أقل دون تغيير السلوك أو الفيزياء أو خوارزمية A* أو الشكل البصري، مع الإبقاء على نفس الدوال والواجهات العامة وإعادة تصديرها عند الحاجة:

1. **`src/renderer/studioRenderer.ts` (2540 → 754 سطراً):**
   - قُسّم إلى 7 وحدات طبقية متخصصة داخل `src/renderer/layers/`:
     - `rendererUtils.ts` (134 سطراً): تحميل القوام SVG/URL ودوال الاستيفاء والأنواع المشتركة، مع إعادة تصدير `EditorOverlayState`.
     - `rendererCamera.ts` (325 سطراً): تحريك الكاميرا، التتبع السينمائي، الاهتزاز، التحويل الهندسي، وتوليد طبقة المراسي.
     - `rendererMapOverlays.ts` (281 سطراً): تلوين الدول، تمييز المناطق، شبكة الملاحة، المناطق، الحفر، المسارات، الأسهم، والموجات.
     - `rendererEntities.ts` (400 سطراً): عرض الكيانات، الدوارات، آثار المياه `wakeRipples`، الجزيئات، البطاقات العائمة `Callouts`، وإحداثيات الشاشة للعنصر المحدد.
     - `rendererCombatFx.ts` (631 سطراً): ومضات الإطلاق، المقذوفات بجميع أنواعها، الانفجارات متعددة الطبقات، وجزيئات الدخان والشرر.
     - `rendererTargeting.ts` (193 سطراً): شارة التوجيه وقفل الهدف الليزري وأقواس الشحن.
     - `rendererPointerInput.ts` (397 سطراً): أحداث المؤشر والإيماءات الثنائية وتكبير العجلة.
2. **`src/App.tsx` (1697 → 690 سطراً):**
   - استُخرج المنطق والواجهات الفرعية إلى مجلد `src/app/`:
     - `studioAppTypes.ts` (40 سطراً): الواجهات والثوابت المشتركة.
     - `handleStageMapClick.ts` (207 أسطر): معالجة النقرات على المسرح (الأسهم، الموجات، الضربات المسلحة، التحديد، ووضع البناء).
     - `useStudioEngineController.ts` (540 سطراً): التهيئة وحلقة الإطارات الثابتة (60 TPS) وتحميل السيناريوهات والخرائط والدخول للمحافظات.
     - `useScenarioActions.ts` (164 سطراً): تسجيل الأحداث الحي وإدارة حفظ/تحميل/حذف سيناريوهات YAML.
     - `useVideoRecording.ts` (77 سطراً): تسجيل الفيديو بصيغة WebM.
     - `StudioTopHud.tsx` (366 سطراً) و`StudioBottomOverlays.tsx` (139 سطراً): الشريط العلوي ولوحة زوايا الكاميرا وشريط الزمن والتعليق دون تغيير أي معرّف `id` أو `aria-*`.
3. **`src/engine/engine.ts` (1168 → 387 سطراً):**
   - فُصل إلى: `engineTime.ts` (40)، و`engineMovement.ts` (254)، و`engineCombat.ts` (476)، و`engineTimeline.ts` (188)، مع إعادة تصدير `TICK_RATE` و`DT` و`parseStrictSec` و`parseSec` و`normalizeAngleDiff` من `engine.ts`.
4. **`src/modals/CountryEditorModal.tsx` (1111 → 356 سطراً):**
   - فُصلت التبويبات إلى `src/modals/countryEditor/`: `CountryEditorShared.tsx` (91)، و`CountryIdentityTab.tsx` (277)، و`CountryLeadershipEconomyTabs.tsx` (340)، و`CountryDiplomacyMediaTab.tsx` (199).
5. **`src/validation/validator.ts` (1027 → 43 سطراً):**
   - فُصل إلى: `validatorHelpers.ts` (137)، و`validatorLifecycle.ts` (565)، و`validatorSteps.ts` (343)، مع إعادة تصدير `validateScenario` و`formatYamlSyntaxErrorAr`.
6. **`src/panels/StudioSidebar.tsx` (964 → 309 أسطر):**
   - فُصلت الأقسام إلى `src/panels/sidebar/`: `SidebarRecorderSection.tsx` (208)، و`SidebarSandboxSection.tsx` (241)، و`SidebarPlaybackYamlSection.tsx` (331).
7. **`src/maps/worldGeoEngine.ts` (879 → 347 سطراً):**
   - فُصل إلى: `worldGeoGeometry.ts` (204 أسطر) و`worldGeoCorridors.ts` (343 سطراً) مع إعادة تصدير `applyWorldNavCorridors` و`rewindGeoJsonForD3`.

## 2. الملفات المتغيرة
| الملف | نوع التغيير | الأسطر بعد التقسيم |
|---|---|---|
| `src/renderer/studioRenderer.ts` | تقسيم وتقليص | 754 |
| `src/renderer/layers/*.ts` (7 ملفات) | إضافة | 134–631 |
| `src/App.tsx` | تقسيم وتقليص | 690 |
| `src/app/*.{ts,tsx}` (7 ملفات) | إضافة | 40–540 |
| `src/engine/engine.ts` | تقسيم وتقليص | 387 |
| `src/engine/engine{Time,Movement,Combat,Timeline}.ts` (4 ملفات) | إضافة | 40–476 |
| `src/modals/CountryEditorModal.tsx` | تقسيم وتقليص | 356 |
| `src/modals/countryEditor/*.tsx` (4 ملفات) | إضافة | 91–340 |
| `src/validation/validator.ts` | تقسيم وتقليص | 43 |
| `src/validation/validator{Helpers,Lifecycle,Steps}.ts` (3 ملفات) | إضافة | 137–565 |
| `src/panels/StudioSidebar.tsx` | تقسيم وتقليص | 309 |
| `src/panels/sidebar/*.tsx` (3 ملفات) | إضافة | 208–331 |
| `src/maps/worldGeoEngine.ts` | تقسيم وتقليص | 347 |
| `src/maps/worldGeo{Geometry,Corridors}.ts` (2 ملف) | إضافة | 204–343 |
| `docs/STRUCTURE.md`، `docs/ROADMAP.md`، `docs/PROGRESS.md`، `docs/HANDOFF.md`، `docs/phases/PHASE_0_foundation.md` | تحديث التوثيق | — |

## 3. نتائج الفحوص والتحقق البصري
| الفحص | الأمر / الأداة | النتيجة |
|---|---|---|
| install | `bun install --frozen-lockfile` | Exit 0 |
| lint | `bun run lint` (`tsc --noEmit`) | Exit 0 (0 أخطاء) |
| test | `bun run test` | Exit 0 — **62 من 62** ناجحة (`3 suites`, `0 fail`) |
| build | `bun run build` (`vite build`) | Exit 0 |
| فحص الأسطر | `find src -type f \( -name "*.ts" -o -name "*.tsx" \) \| xargs wc -l` | جميع ملفات `src/` <= 754 سطراً باستثناء `src/core/core.test.ts` (2092) |
| فحص المتصفح | Chromium (`1440×900`) على `http://localhost:3000` | تحميل خريطة العالم والألوان، فتح `UnitsDock` و`ToolsDock`، إنزال F-35 وتوجيه غارة جوية، وفتح لوحة زوايا الكاميرا دون أخطاء وحدة تحكم (`Errors: 0, Warnings: 0`) |

## 4. الاستثناء المسموح والمبرّر
- أُبقي ملف الاختبارات `src/core/core.test.ts` (2092 سطراً) دون تقسيم وفق بند «الاستثناء المسموح» في `docs/tasks/TASK_0_5C.md` لأن إبقاء حزمة الاختبارات الأساسية مترابطة يضمن عدم تعطيل الاستدعاء المباشر عبر `bun run test` مع استيفاء شرط البقاء خارج ملفات الإنتاج.

## 5. الخطوة التالية المقترحة
- مراجعة تقرير `TASK 0.5C` ودمج التغييرات، ثم البدء بتنفيذ **`TASK 1.2`** (ربط محمّل المحتوى بالأصوات مع تحويل قراءة ملفات المتصفح من `node:fs` إلى `import.meta.glob` / `fetch` وفق `REVIEW_TASK_0_4_and_1_1.md`).
