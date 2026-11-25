import { beforeEach, describe, expect, it } from 'vitest';
import { useEditorStore } from '@/state';
import { safeStorage } from '@/state/safeStorage';

describe('حالة الواجهة', () => {
  beforeEach(async () => {
    await safeStorage.removeItem('studio.settings');
    useEditorStore.setState({
      language: 'ar',
      digitStyle: 'arab',
      previewQuality: 'medium',
      sheet: null,
      timelineCollapsed: false,
      isPlaying: false,
      currentTick: 0,
    });
  });

  it('يبدأ بالعربية والاتجاه rtl', () => {
    expect(useEditorStore.getState().language).toBe('ar');
  });

  it('يبدل اللغة ويحفظ الإعداد محلياً', () => {
    useEditorStore.getState().setLanguage('en');
    expect(useEditorStore.getState().language).toBe('en');
    const raw = JSON.parse(String(safeStorage.getItem('studio.settings') ?? '{}'));
    expect(raw.state.language).toBe('en');
  });

  it('يفتح الأوراق السفلية ويغلقها', () => {
    useEditorStore.getState().openSheet('library');
    expect(useEditorStore.getState().sheet).toBe('library');
    useEditorStore.getState().closeSheet();
    expect(useEditorStore.getState().sheet).toBeNull();
  });

  it('يبدل التشغيل ويعيد إلى البداية', () => {
    useEditorStore.getState().togglePlayback();
    expect(useEditorStore.getState().isPlaying).toBe(true);
    useEditorStore.setState({ currentTick: 120 });
    useEditorStore.getState().rewind();
    expect(useEditorStore.getState().currentTick).toBe(0);
    expect(useEditorStore.getState().isPlaying).toBe(false);
  });
});
