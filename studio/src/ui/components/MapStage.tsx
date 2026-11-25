import { useI18n } from '../useI18n';
import { Glyph, type GlyphName } from './Glyph';

const TOOLS: { icon: GlyphName; key: 'map.zoomIn' | 'map.zoomOut' | 'map.fit' }[] = [
  { icon: 'zoom-in', key: 'map.zoomIn' },
  { icon: 'zoom-out', key: 'map.zoomOut' },
  { icon: 'fit', key: 'map.fit' },
];

interface MapStageProps {
  className?: string;
}

export function MapStage({ className }: MapStageProps) {
  const { t } = useI18n();

  return (
    <section
      aria-label={t('a11y.mainMap')}
      className={`relative min-h-0 overflow-hidden bg-ink-950 ${className ?? ''}`}
    >
      {/* شبكة خلفية مؤقتة مكان الخريطة الحقيقية (المرحلة 02) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #3ba3ff 1px, transparent 1px), linear-gradient(to bottom, #3ba3ff 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="absolute inset-0 grid place-items-center p-6">
        <div className="max-w-xs rounded-2xl border border-ink-700/80 bg-ink-900/70 px-4 py-5 text-center backdrop-blur">
          <Glyph name="globe" className="mx-auto size-8 text-accent-400/80" />
          <p className="mt-2 text-sm font-semibold text-mist-200">{t('map.placeholder')}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-mist-400">{t('map.hint')}</p>
        </div>
      </div>

      <div
        role="toolbar"
        aria-label={t('a11y.zoom')}
        className="absolute top-3 end-3 flex flex-col gap-1 rounded-xl border border-ink-700 bg-ink-900/85 p-1 backdrop-blur"
      >
        {TOOLS.map((tool) => (
          <button
            key={tool.key}
            type="button"
            aria-label={t(tool.key)}
            title={t(tool.key)}
            className="grid min-h-11 min-w-11 place-items-center rounded-lg text-mist-300 hover:bg-ink-800 hover:text-mist-200"
          >
            <Glyph name={tool.icon} />
          </button>
        ))}
      </div>
    </section>
  );
}
