import { useEditorStore } from '@/state';
import { Glyph } from './Glyph';
import { useI18n } from '../useI18n';

export function Header() {
  const { t, language, digitStyle } = useI18n();
  const setLanguage = useEditorStore((state) => state.setLanguage);
  const setDigitStyle = useEditorStore((state) => state.setDigitStyle);

  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-ink-700 bg-ink-900/95 px-3 py-2 backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="grid size-10 place-items-center rounded-xl bg-accent-500/15 text-accent-400">
          <Glyph name="globe" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-mist-200">{t('app.name')}</p>
          <p className="hidden text-[11px] text-mist-400 sm:block">{t('app.tagline')}</p>
        </div>
      </div>

      <div className="hidden h-8 w-px bg-ink-700 sm:block" aria-hidden="true" />

      <p className="min-w-0 flex-1 truncate text-xs text-mist-400" title={t('project.untitled')}>
        {t('project.untitled')}
      </p>

      <div className="flex items-center gap-1">
        <span className="hidden items-center gap-1 rounded-lg bg-ink-800 px-2 py-1 text-[11px] text-mist-400 lg:inline-flex">
          <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
          {t('status.offline')}
        </span>
        <button
          type="button"
          onClick={() => setDigitStyle(digitStyle === 'arab' ? 'latn' : 'arab')}
          aria-label={t('settings.numbers')}
          className="tnum min-h-11 min-w-11 rounded-lg border border-ink-700 px-2 text-xs text-mist-300 hover:border-ink-600 hover:text-mist-200"
        >
          {digitStyle === 'arab' ? '٠-٩' : '0-9'}
        </button>
        <button
          type="button"
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          aria-label={t('a11y.language')}
          className="flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg border border-ink-700 px-2 text-xs text-mist-300 hover:border-ink-600 hover:text-mist-200"
        >
          <Glyph name="language" className="size-4" />
          <span className="font-semibold">{language === 'ar' ? 'EN' : 'ع'}</span>
        </button>
      </div>
    </header>
  );
}
