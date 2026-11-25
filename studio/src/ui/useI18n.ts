import { useCallback } from 'react';
import {
  dirFor,
  formatNumber,
  formatTimecode,
  translate,
  type DigitStyle,
  type Language,
  type TranslationKey,
} from '@/i18n';
import { useEditorStore } from '@/state';

export interface I18n {
  language: Language;
  digitStyle: DigitStyle;
  dir: 'rtl' | 'ltr';
  t: (key: TranslationKey) => string;
  n: (value: number, options?: Intl.NumberFormatOptions) => string;
  time: (seconds: number) => string;
}

export function useI18n(): I18n {
  const language = useEditorStore((state) => state.language);
  const digitStyle = useEditorStore((state) => state.digitStyle);

  const t = useCallback((key: TranslationKey) => translate(language, key), [language]);
  const n = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) => formatNumber(value, digitStyle, options),
    [digitStyle],
  );
  const time = useCallback((seconds: number) => formatTimecode(seconds, digitStyle), [digitStyle]);

  return { language, digitStyle, dir: dirFor(language), t, n, time };
}
