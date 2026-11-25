import { ar, type ArDictionary } from './ar';
import { en } from './en';

export type Language = 'ar' | 'en';
export type TranslationKey = keyof ArDictionary;
export type DigitStyle = 'latn' | 'arab';

export const LANGUAGES: readonly Language[] = ['ar', 'en'] as const;

export const dictionaries: Record<Language, Record<TranslationKey, string>> = { ar, en };

export const TRANSLATION_KEYS = Object.keys(ar) as TranslationKey[];

export function dirFor(language: Language): 'rtl' | 'ltr' {
  return language === 'ar' ? 'rtl' : 'ltr';
}

export function translate(
  language: Language,
  key: TranslationKey,
  vars?: Readonly<Record<string, string | number>>,
): string {
  const template = dictionaries[language][key] ?? ar[key];
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}

/** تنسيق رقم واجهة حسب نمط الأرقام المختار في الإعدادات. */
export function formatNumber(
  value: number,
  digitStyle: DigitStyle,
  options?: Intl.NumberFormatOptions,
): string {
  const locale = digitStyle === 'arab' ? 'ar-EG' : 'en-US-u-nu-latn';
  return new Intl.NumberFormat(locale, options).format(value);
}

/** تنسيق زمن بوحدة mm:ss.cc (سنتيمترات الثانية) لشريط التشغيل. */
export function formatTimecode(totalSeconds: number, digitStyle: DigitStyle): string {
  const clamped = Math.max(0, totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = Math.floor(clamped % 60);
  const centis = Math.floor((clamped - Math.floor(clamped)) * 100);
  const part = (n: number) =>
    formatNumber(n, digitStyle, { minimumIntegerDigits: 2, useGrouping: false }).replace(
      /[\u200e\u200f]/g,
      '',
    );
  return `${part(minutes)}:${part(seconds)}.${part(centis)}`;
}

export { ar, en };
