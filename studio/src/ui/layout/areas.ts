import type { CSSProperties } from 'react';
import type { Language } from '@/i18n';

/**
 * تخطيط المحرر: مصدر واحد لترتيب الأعمدة (PRODUCT_SPEC §5، S0.5).
 *
 * الأعمدة هنا **فيزيائية** من اليسار إلى اليمين، والحاوية تُثبَّت على `direction: ltr`
 * حتى لا يقلب RTL الترتيب خفية. كل منطقة تعيد ضبط اتجاه نصها حسب اللغة.
 *
 * بالعربية: المكتبة يميناً والخصائص يساراً. بالإنجليزية: العكس.
 */
export type LayoutArea = 'library' | 'canvas' | 'inspector' | 'timeline';

export interface LayoutDefinition {
  /** الأعمدة بالترتيب الفيزيائي (يسار ← يمين). */
  readonly columns: readonly LayoutArea[];
  /** عرض كل عمود، بنفس ترتيب `columns`. */
  readonly widths: readonly string[];
  /** صفوف المناطق، وكل صف بنفس عدد الأعمدة. */
  readonly rows: readonly (readonly LayoutArea[])[];
  /** ارتفاع صف الشريط الزمني. */
  readonly timelineHeight: string;
}

export const LAYOUT_AREAS: Record<Language, LayoutDefinition> = {
  ar: {
    columns: ['inspector', 'canvas', 'library'],
    widths: ['320px', 'minmax(0, 1fr)', '280px'],
    rows: [
      ['inspector', 'canvas', 'library'],
      ['timeline', 'timeline', 'timeline'],
    ],
    timelineHeight: '220px',
  },
  en: {
    columns: ['library', 'canvas', 'inspector'],
    widths: ['280px', 'minmax(0, 1fr)', '320px'],
    rows: [
      ['library', 'canvas', 'inspector'],
      ['timeline', 'timeline', 'timeline'],
    ],
    timelineHeight: '220px',
  },
};

export function gridTemplateAreasOf(definition: LayoutDefinition): string {
  return definition.rows.map((row) => `"${row.join(' ')}"`).join(' ');
}

export function gridTemplateColumnsOf(definition: LayoutDefinition): string {
  return definition.widths.join(' ');
}

export function gridTemplateRowsOf(definition: LayoutDefinition): string {
  return `minmax(0, 1fr) ${definition.timelineHeight}`;
}

/** فهرس العمود الفيزيائي (0 = أقصى اليسار) للمنطقة في اللغة المعطاة. */
export function columnIndexOf(language: Language, area: LayoutArea): number {
  return LAYOUT_AREAS[language].columns.indexOf(area);
}

/**
 * خصائص CSS الممرَّرة إلى `.studio-grid`.
 * ترتيب الأعمدة يُقرأ من الجدول أعلاه فقط، لا من ترتيب DOM ولا من start/end.
 */
export function layoutStyle(language: Language): CSSProperties {
  const definition = LAYOUT_AREAS[language];
  return {
    '--areas-desktop': gridTemplateAreasOf(definition),
    '--cols-desktop': gridTemplateColumnsOf(definition),
    '--rows-desktop': gridTemplateRowsOf(definition),
  } as CSSProperties;
}
