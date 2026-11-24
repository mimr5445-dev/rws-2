// معرّفات خرائط العالم المولّدة ديناميكياً.
// تُبقى في ملف خفيف حتى يمكن استيرادها من الواجهة والاختبارات دون تحميل محرك الرسم كاملاً.

/** الخريطة الافتراضية: العالم الكامل بجلد «لوح الإحاطة» الداكن. */
export const WORLD_BRIEFING_MAP_ID = 'world_live';
/** اسم توافقي قديم كان يُطلق على نفس معرّف الخريطة الكاملة. */
export const WORLD_CLASSIC_MAP_ID = WORLD_BRIEFING_MAP_ID;
/** خريطة التضاريس الرمادية على خلفية سوداء، المضافة بطلب المالك. */
export const WORLD_RELIEF_MAP_ID = 'world_relief';
/** لوح التضاريس الورقي الذي كان قد أُضيف على main ويبقى متاحاً في قائمة الخرائط. */
export const WORLD_SHADED_RELIEF_MAP_ID = 'world_shaded_relief';
export const WORLD_POLITICAL_BOARD_MAP_ID = 'world_political_board';

/** معرّفات قديمة من خريطة المحيط الهادئ المرفوضة: تُحوّل إلى الخريطة الكاملة الافتراضية. */
export const LEGACY_WORLD_MAP_IDS = new Set<string>(['world_pacific_briefing']);

export const WORLD_STYLE_IDS = new Set<string>([
  WORLD_BRIEFING_MAP_ID,
  WORLD_RELIEF_MAP_ID,
  WORLD_SHADED_RELIEF_MAP_ID
]);

export function resolveWorldMapId(id: unknown): string {
  return typeof id === 'string' && !LEGACY_WORLD_MAP_IDS.has(id) ? id : WORLD_BRIEFING_MAP_ID;
}
