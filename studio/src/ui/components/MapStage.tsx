import { useEditorStore } from '@/state';
import { useI18n } from '../useI18n';
import { Glyph, type GlyphName } from './Glyph';
import { MapCanvas } from './MapCanvas';

interface MapStageProps {
  className?: string;
}

export function MapStage({ className }: MapStageProps) {
  const { t } = useI18n();
  const mapReady = useEditorStore((state) => state.mapReady);
  const mapError = useEditorStore((state) => state.mapError);
  const selectedCountryName = useEditorStore((state) => state.selectedCountryName);
  const zoomIn = useEditorStore((state) => state.zoomIn);
  const zoomOut = useEditorStore((state) => state.zoomOut);
  const fitMap = useEditorStore((state) => state.fitMap);

  const tools: { icon: GlyphName; label: string; action: () => void }[] = [
    { icon: 'zoom-in', label: t('map.zoomIn'), action: zoomIn },
    { icon: 'zoom-out', label: t('map.zoomOut'), action: zoomOut },
    { icon: 'fit', label: t('map.fit'), action: fitMap },
  ];

  return (
    <section
      aria-label={t('a11y.mainMap')}
      data-testid="map-stage"
      className={`relative min-h-0 overflow-hidden bg-ink-950 ${className ?? ''}`}
    >
      <MapCanvas />

      {!mapReady && !mapError && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <p className="rounded-lg border border-ink-700 bg-ink-900/80 px-3 py-2 text-xs text-mist-400">
            {t('map.loading')}
          </p>
        </div>
      )}

      {mapError && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
          <div className="max-w-xs rounded-xl border border-red-500/40 bg-ink-900/90 px-4 py-3 text-center">
            <p className="text-sm font-semibold text-red-300">{t('map.error')}</p>
            <p className="mt-1 text-[11px] text-mist-400">{mapError}</p>
          </div>
        </div>
      )}

      <div
        role="toolbar"
        aria-label={t('a11y.zoom')}
        className="absolute top-3 end-3 flex flex-col gap-1 rounded-xl border border-ink-700 bg-ink-900/85 p-1 backdrop-blur"
      >
        {tools.map((tool) => (
          <button
            key={tool.label}
            type="button"
            onClick={tool.action}
            aria-label={tool.label}
            title={tool.label}
            className="grid min-h-11 min-w-11 place-items-center rounded-lg text-mist-300 hover:bg-ink-800 hover:text-mist-200"
          >
            <Glyph name={tool.icon} />
          </button>
        ))}
      </div>

      <p className="pointer-events-none absolute bottom-3 start-3 max-w-[26ch] rounded-lg bg-ink-900/75 px-2.5 py-1.5 text-[11px] leading-relaxed text-mist-400 backdrop-blur">
        {t('map.instructions')}
      </p>

      <p
        className="pointer-events-none absolute top-3 start-3 rounded-lg bg-ink-900/80 px-2.5 py-1.5 text-[11px] font-semibold text-mist-200 backdrop-blur"
        data-testid="selected-country"
      >
        {selectedCountryName ?? t('map.noSelection')}
      </p>
    </section>
  );
}
