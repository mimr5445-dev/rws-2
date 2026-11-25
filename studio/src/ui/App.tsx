import { useEffect, useMemo } from 'react';
import { useEditorStore } from '@/state';
import { Header } from './components/Header';
import { LibraryPanel } from './components/LibraryPanel';
import { MapStage } from './components/MapStage';
import { MobileSheet } from './components/MobileSheet';
import { PropertiesPanel } from './components/PropertiesPanel';
import { TimelinePanel } from './components/TimelinePanel';
import { TransportBar } from './components/TransportBar';
import { Glyph } from './components/Glyph';
import { layoutStyle } from './layout';
import { useI18n } from './useI18n';

export function App() {
  const { t, language, dir } = useI18n();
  const sheet = useEditorStore((state) => state.sheet);
  const openSheet = useEditorStore((state) => state.openSheet);
  const closeSheet = useEditorStore((state) => state.closeSheet);
  const gridStyle = useMemo(() => layoutStyle(language), [language]);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.dir = dir;
    document.title = `${t('app.name')} — ${t('app.tagline')}`;
  }, [language, dir, t]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-ink-950 text-mist-200">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-lg focus:bg-accent-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink-950"
      >
        {t('app.skipToContent')}
      </a>

      <Header />

      <main id="main" aria-label={t('a11y.main')} className="flex min-h-0 flex-1 flex-col">
        <div className="studio-grid flex-1" style={gridStyle}>
          <div className="hidden min-h-0 md:flex" style={{ gridArea: 'library' }} dir={dir}>
            <LibraryPanel className="w-full" />
          </div>
          <div className="min-h-0" style={{ gridArea: 'canvas' }} dir={dir}>
            <MapStage className="h-full w-full" />
          </div>
          <div className="hidden min-h-0 md:flex" style={{ gridArea: 'inspector' }} dir={dir}>
            <PropertiesPanel className="w-full" />
          </div>
          <div className="hidden min-h-0 md:flex" style={{ gridArea: 'timeline' }} dir={dir}>
            <TimelinePanel className="w-full" />
          </div>
        </div>
        <MobileDock onOpen={openSheet} />
        <TransportBar />
      </main>

      {sheet === 'library' && (
        <MobileSheet titleKey="panel.library" closeLabelKey="a11y.closeLibrary">
          <LibraryPanel className="min-h-[46dvh]" />
        </MobileSheet>
      )}
      {sheet === 'properties' && (
        <MobileSheet titleKey="panel.properties" closeLabelKey="a11y.closeProperties">
          <PropertiesPanel className="min-h-[46dvh]" />
        </MobileSheet>
      )}
      {sheet === 'timeline' && (
        <MobileSheet titleKey="panel.timeline" closeLabelKey="timeline.toggle">
          <TimelinePanel className="min-h-[46dvh]" />
          <div className="p-3">
            <button
              type="button"
              onClick={closeSheet}
              className="min-h-11 w-full rounded-lg border border-ink-700 text-sm text-mist-300 hover:bg-ink-800"
            >
              {t('a11y.closeLibrary')}
            </button>
          </div>
        </MobileSheet>
      )}
    </div>
  );
}

interface MobileDockProps {
  onOpen: (sheet: 'library' | 'properties' | 'timeline') => void;
}

function MobileDock({ onOpen }: MobileDockProps) {
  const { t } = useI18n();

  const items = [
    { key: 'library' as const, icon: 'layers' as const, label: t('a11y.openLibrary') },
    { key: 'properties' as const, icon: 'sliders' as const, label: t('a11y.openProperties') },
    { key: 'timeline' as const, icon: 'timeline' as const, label: t('panel.timeline') },
  ];

  return (
    <nav
      aria-label={t('a11y.nav')}
      className="flex items-stretch gap-1 border-t border-ink-800 bg-ink-900/95 px-2 py-1 md:hidden"
    >
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onOpen(item.key)}
          className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg text-xs text-mist-300 hover:bg-ink-800 hover:text-mist-200"
          aria-label={item.label}
        >
          <Glyph name={item.icon} className="size-4" />
          <span className="truncate">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
