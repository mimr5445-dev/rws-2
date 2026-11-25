import { useEffect, useRef, type ReactNode } from 'react';
import { useEditorStore } from '@/state';
import type { TranslationKey } from '@/i18n';
import { Glyph } from './Glyph';
import { useI18n } from '../useI18n';

interface MobileSheetProps {
  titleKey: TranslationKey;
  closeLabelKey: TranslationKey;
  children: ReactNode;
}

export function MobileSheet({ titleKey, closeLabelKey, children }: MobileSheetProps) {
  const { t } = useI18n();
  const closeSheet = useEditorStore((state) => state.closeSheet);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeSheet();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeSheet]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end md:hidden">
      <button
        type="button"
        aria-label={t(closeLabelKey)}
        onClick={closeSheet}
        className="absolute inset-0 bg-ink-950/70"
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t(titleKey)}
        tabIndex={-1}
        className="relative flex max-h-[78dvh] min-h-[46dvh] flex-col overflow-hidden rounded-t-2xl border-t border-ink-700 bg-ink-900 shadow-2xl outline-none"
      >
        <div className="flex items-center gap-2 border-b border-ink-800 px-3 py-2">
          <span className="mx-auto h-1 w-10 rounded-full bg-ink-600" aria-hidden="true" />
          <button
            type="button"
            onClick={closeSheet}
            aria-label={t(closeLabelKey)}
            className="grid min-h-11 min-w-11 place-items-center rounded-lg text-mist-300 hover:bg-ink-800"
          >
            <Glyph name="close" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
