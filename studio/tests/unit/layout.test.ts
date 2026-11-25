import { describe, expect, it } from 'vitest';
import {
  LAYOUT_AREAS,
  columnIndexOf,
  gridTemplateAreasOf,
  gridTemplateColumnsOf,
} from '@/ui/layout';

describe('تخطيط المحرر (S0.5)', () => {
  it('بالعربية: المكتبة في العمود الأيمن والخصائص في الأيسر', () => {
    const ar = LAYOUT_AREAS.ar;
    expect(ar.columns).toEqual(['inspector', 'canvas', 'library']);
    expect(columnIndexOf('ar', 'library')).toBe(2); // آخر عمود = أقصى اليمين
    expect(columnIndexOf('ar', 'inspector')).toBe(0);
    expect(columnIndexOf('ar', 'canvas')).toBe(1);
  });

  it('بالإنجليزية: المكتبة في العمود الأيسر والخصائص في الأيمن', () => {
    const en = LAYOUT_AREAS.en;
    expect(en.columns).toEqual(['library', 'canvas', 'inspector']);
    expect(columnIndexOf('en', 'library')).toBe(0);
    expect(columnIndexOf('en', 'inspector')).toBe(2);
  });

  it('الصف الأول يطابق الأعمدة، وكل صف بعرض الشبكة', () => {
    for (const definition of Object.values(LAYOUT_AREAS)) {
      expect(definition.rows[0]).toEqual(definition.columns);
      for (const row of definition.rows) {
        expect(row).toHaveLength(definition.columns.length);
      }
      expect(definition.widths).toHaveLength(definition.columns.length);
    }
  });

  it('يولّد grid-template-areas صريحاً لكل لغة', () => {
    expect(gridTemplateAreasOf(LAYOUT_AREAS.ar)).toBe(
      '"inspector canvas library" "timeline timeline timeline"',
    );
    expect(gridTemplateAreasOf(LAYOUT_AREAS.en)).toBe(
      '"library canvas inspector" "timeline timeline timeline"',
    );
    expect(gridTemplateColumnsOf(LAYOUT_AREAS.ar)).toBe('320px minmax(0, 1fr) 280px');
  });

  it('الشريط الزمني يمتد على الأعمدة كلها', () => {
    for (const definition of Object.values(LAYOUT_AREAS)) {
      const last = definition.rows[definition.rows.length - 1];
      expect(new Set(last).size).toBe(1);
      expect(last?.[0]).toBe('timeline');
    }
  });
});
