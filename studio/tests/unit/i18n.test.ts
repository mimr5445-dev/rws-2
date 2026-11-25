import { describe, expect, it } from 'vitest';
import { ar, dictionaries, dirFor, en, formatNumber, formatTimecode, translate } from '@/i18n';

describe('i18n', () => {
  it('يحافظ على تطابق المفاتيح بين العربية والإنجليزية', () => {
    const arKeys = Object.keys(ar).sort();
    const enKeys = Object.keys(en).sort();
    expect(enKeys).toEqual(arKeys);
  });

  it('لا يحوي أي نص فارغ', () => {
    for (const language of ['ar', 'en'] as const) {
      for (const [key, value] of Object.entries(dictionaries[language])) {
        expect(value.trim(), `${language}:${key}`).not.toBe('');
      }
    }
  });

  it('يترجم ويستبدل المتغيرات', () => {
    expect(translate('ar', 'app.name')).toBe('استوديو');
    expect(translate('en', 'app.name')).toBe('Studio');
    expect(translate('ar', 'project.title', {})).toBe('المشروع');
  });

  it('يحدد الاتجاه حسب اللغة', () => {
    expect(dirFor('ar')).toBe('rtl');
    expect(dirFor('en')).toBe('ltr');
  });

  it('ينسق الزمن بصيغة mm:ss.cc', () => {
    expect(formatTimecode(0, 'latn')).toBe('00:00.00');
    expect(formatTimecode(90.25, 'latn')).toBe('01:30.25');
    expect(formatTimecode(-5, 'latn')).toBe('00:00.00');
  });

  it('ينسق الأرقام حسب النمط المختار', () => {
    expect(formatNumber(1234, 'latn')).toBe('1,234');
    expect(formatNumber(1234, 'arab')).not.toContain('1');
  });
});
