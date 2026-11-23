# TASK 0.5B — تقرير تقسيم الملفات الكبيرة (منجزة جزئياً)

**الحالة النهائية:** منجزة جزئياً. الباقي نُقل إلى `TASK 0.5C`.
**الفرع:** `task/0-5b` | **المنفّذ:** المخطط (Claude) بالتنفيذ المباشر

## 1. ما نُفّذ
- **وحدات الاستوديو:** `src/packs/studioUnits.ts` صار 15 سطراً يجمع أربع مجموعات من `src/packs/units/`:
  - `land.ts` (557 سطراً)، و`air.ts` (184)، و`sea.ts` (155)، و`infrastructure.ts` (204).
  - `shared.ts` (31) يحوي القوالب ودالة `defineUnit`.
  - التحقق: 26 وحدة قبل وبعد، بنفس المعرّفات وبنفس الترتيب في الكائن النهائي.
- **دول البذور:** `src/countries/countrySeed.ts` صار 442 سطراً، و`countrySeedB.ts` 363 سطراً، و`countrySeedHelpers.ts` 65 سطراً (الدوال والقوالب).
  - التحقق: 13 دولة بنفس الترتيب (`iso3`) قبل وبعد.

## 2. الملفات المتغيرة
| الملف | النوع |
|---|---|
| `src/packs/studioUnits.ts` | تقليص وإعادة تجميع |
| `src/packs/units/*.ts` (5 ملفات) | جديدة |
| `src/countries/countrySeed.ts` | تقليص |
| `src/countries/countrySeedB.ts`، `src/countries/countrySeedHelpers.ts` | جديدة |
| `docs/tasks/TASK_0_5C.md` | بطاقة جديدة |

## 3. نتائج الفحوص
| الفحص | الأمر | النتيجة |
|---|---|---|
| install | `bun install --frozen-lockfile` | Exit 0 |
| lint | `bun run lint` | Exit 0 |
| test | `bun run test` | 62 من 62 ناجحة |
| build | `bun run build` | Exit 0 |

## 4. ما لم يُنجز
- الملفات التالية ما زالت فوق 800 سطر، ونُقلت إلى `TASK 0.5C`: `studioRenderer.ts` (2540)، و`App.tsx` (1697)، و`engine.ts` (1168)، و`CountryEditorModal.tsx` (1111)، و`validator.ts` (1027)، و`StudioSidebar.tsx` (964)، و`worldGeoEngine.ts` (879)، و`core.test.ts` (2092، ملف اختبارات).
