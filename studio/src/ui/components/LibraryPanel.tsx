import { useI18n } from '../useI18n';
import { Glyph } from './Glyph';

const CATEGORIES = [
  'library.all',
  'library.units',
  'library.markers',
  'library.structures',
  'library.zones',
  'library.labels',
] as const;

interface LibraryPanelProps {
  className?: string;
}

export function LibraryPanel({ className }: LibraryPanelProps) {
  const { t } = useI18n();

  return (
    <aside
      aria-label={t('panel.library')}
      className={`flex min-h-0 flex-col border-ink-700 bg-ink-900 ${className ?? ''}`}
    >
      <div className="flex items-center gap-2 border-b border-ink-800 px-3 py-2.5">
        <Glyph name="layers" className="size-4 text-accent-400" />
        <h2 className="text-xs font-semibold tracking-wide text-mist-200">{t('library.title')}</h2>
      </div>

      <div className="space-y-2 border-b border-ink-800 p-3">
        <label className="block">
          <span className="sr-only">{t('library.search')}</span>
          <input
            type="search"
            placeholder={t('library.search')}
            className="min-h-11 w-full rounded-lg border border-ink-700 bg-ink-850 px-3 text-sm text-mist-200 placeholder:text-mist-400/70"
          />
        </label>
        <ul className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((key) => (
            <li key={key}>
              <span className="inline-block rounded-md bg-ink-800 px-2 py-1 text-[11px] text-mist-400">
                {t(key)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        <p className="max-w-[22ch] text-center text-xs leading-relaxed text-mist-400">
          {t('library.empty')}
        </p>
      </div>
    </aside>
  );
}
