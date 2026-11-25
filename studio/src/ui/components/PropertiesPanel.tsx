import { useEditorStore } from '@/state';
import { useI18n } from '../useI18n';
import { Glyph } from './Glyph';

interface PropertiesPanelProps {
  className?: string;
}

export function PropertiesPanel({ className }: PropertiesPanelProps) {
  const { t } = useI18n();
  const selectedCountryName = useEditorStore((state) => state.selectedCountryName);
  const selectedCountryId = useEditorStore((state) => state.selectedCountryId);

  return (
    <aside
      aria-label={t('panel.properties')}
      className={`flex min-h-0 flex-col border-ink-700 bg-ink-900 ${className ?? ''}`}
    >
      <div className="flex items-center gap-2 border-b border-ink-800 px-3 py-2.5">
        <Glyph name="sliders" className="size-4 text-accent-400" />
        <h2 className="text-xs font-semibold tracking-wide text-mist-200">
          {t('properties.title')}
        </h2>
      </div>

      {selectedCountryName ? (
        <div className="space-y-2 p-3">
          <p className="text-[11px] text-mist-400">{t('map.selectedCountry')}</p>
          <p className="text-sm font-semibold text-mist-200" data-testid="inspector-country">
            {selectedCountryName}
          </p>
          <p className="tnum text-[11px] text-mist-400">#{selectedCountryId}</p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center p-4">
          <p className="max-w-[26ch] text-center text-xs leading-relaxed text-mist-400">
            {t('properties.empty')}
          </p>
        </div>
      )}
    </aside>
  );
}
