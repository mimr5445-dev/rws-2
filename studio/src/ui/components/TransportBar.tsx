import { useEditorStore } from '@/state';
import { useI18n } from '../useI18n';
import { Glyph } from './Glyph';

const DURATION_TICKS = 1800;

export function TransportBar() {
  const { t, time } = useI18n();
  const isPlaying = useEditorStore((state) => state.isPlaying);
  const currentTick = useEditorStore((state) => state.currentTick);
  const togglePlayback = useEditorStore((state) => state.togglePlayback);
  const rewind = useEditorStore((state) => state.rewind);
  const toggleTimeline = useEditorStore((state) => state.toggleTimeline);

  return (
    <div className="flex items-center gap-2 border-t border-ink-700 bg-ink-900 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={rewind}
          aria-label={t('transport.rewind')}
          title={t('transport.rewind')}
          className="grid min-h-11 min-w-11 place-items-center rounded-lg text-mist-300 hover:bg-ink-800 hover:text-mist-200"
        >
          <Glyph name="rewind" />
        </button>
      </div>

      <button
        type="button"
        onClick={togglePlayback}
        aria-label={isPlaying ? t('transport.pause') : t('transport.play')}
        className="flex min-h-11 items-center gap-2 rounded-lg bg-accent-500 px-4 text-sm font-semibold text-ink-950 hover:bg-accent-400"
      >
        <Glyph name={isPlaying ? 'pause' : 'play'} className="size-4" />
        <span>{isPlaying ? t('transport.pause') : t('transport.play')}</span>
      </button>

      <div className="tnum flex items-baseline gap-1 rounded-lg bg-ink-850 px-2.5 py-1.5 text-xs text-mist-200">
        <span aria-label={t('transport.currentTime')}>{time(currentTick / 60)}</span>
        <span className="text-mist-400">/</span>
        <span className="text-mist-400" aria-label={t('transport.duration')}>
          {time(DURATION_TICKS / 60)}
        </span>
      </div>

      <button
        type="button"
        onClick={toggleTimeline}
        aria-label={t('timeline.toggle')}
        aria-pressed={false}
        title={t('timeline.toggle')}
        className="ms-auto grid min-h-11 min-w-11 place-items-center rounded-lg text-mist-300 hover:bg-ink-800 hover:text-mist-200 md:hidden"
      >
        <Glyph name="timeline" />
      </button>

      <span className="tnum hidden text-[11px] text-mist-400 md:inline">
        {t('status.autosave')}
      </span>
    </div>
  );
}
