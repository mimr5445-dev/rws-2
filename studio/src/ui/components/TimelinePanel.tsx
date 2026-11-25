import { useEditorStore } from '@/state';
import { useI18n } from '../useI18n';
import { Glyph } from './Glyph';

const DURATION_TICKS = 1800; // 30 ثانية مؤقتاً حتى يُحمَّل المشروع (المرحلة 01)
const RULER_STEPS = 6;

interface TimelinePanelProps {
  className?: string;
}

export function TimelinePanel({ className }: TimelinePanelProps) {
  const { t, n, time } = useI18n();
  const currentTick = useEditorStore((state) => state.currentTick);
  const progress = Math.min(100, Math.max(0, (currentTick / DURATION_TICKS) * 100));

  return (
    <section
      aria-label={t('panel.timeline')}
      className={`flex min-h-0 flex-col border-t border-ink-700 bg-ink-900 ${className ?? ''}`}
    >
      <div className="flex items-center gap-2 border-b border-ink-800 px-3 py-2">
        <Glyph name="timeline" className="size-4 text-accent-400" />
        <h2 className="text-xs font-semibold tracking-wide text-mist-200">{t('timeline.title')}</h2>
        <span className="tnum ms-auto rounded-md bg-ink-800 px-2 py-0.5 text-[11px] text-mist-400">
          {time(currentTick / 60)} / {time(DURATION_TICKS / 60)}
        </span>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="flex h-7 items-center justify-between border-b border-ink-800 px-3 text-[10px] text-mist-400">
          {Array.from({ length: RULER_STEPS }, (_, index) => (
            <span key={index} className="tnum">
              {n(Math.round((index * 30) / (RULER_STEPS - 1)))}s
            </span>
          ))}
        </div>

        <div className="space-y-1.5 p-3">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex items-center gap-2">
              <span className="w-20 shrink-0 truncate text-[11px] text-mist-400">
                {t('timeline.tracks')} {n(row + 1)}
              </span>
              <div className="h-7 flex-1 rounded-md border border-dashed border-ink-700/70 bg-ink-850/60" />
            </div>
          ))}
          <p className="pt-1 text-[11px] text-mist-400">{t('timeline.empty')}</p>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-px bg-signal-500"
          style={{ insetInlineStart: `calc(6.25rem + (100% - 7rem) * ${progress / 100})` }}
        >
          <span className="absolute -top-0 -translate-x-1/2 rounded-sm bg-signal-500 px-1 text-[9px] font-bold text-ink-950">
            ▾
          </span>
        </div>
      </div>
    </section>
  );
}
