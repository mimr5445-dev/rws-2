import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { DigitStyle, Language } from '@/i18n';
import { safeStorage } from './safeStorage';

export type PreviewQuality = 'low' | 'medium' | 'high';
export type SheetKind = 'library' | 'properties' | 'timeline';

interface Settings {
  language: Language;
  digitStyle: DigitStyle;
  previewQuality: PreviewQuality;
}

interface EditorUiState extends Settings {
  sheet: SheetKind | null;
  timelineCollapsed: boolean;
  isPlaying: boolean;
  currentTick: number;
  setLanguage: (language: Language) => void;
  setDigitStyle: (digitStyle: DigitStyle) => void;
  setPreviewQuality: (previewQuality: PreviewQuality) => void;
  openSheet: (sheet: SheetKind) => void;
  closeSheet: () => void;
  toggleTimeline: () => void;
  togglePlayback: () => void;
  rewind: () => void;
}

/**
 * حالة الواجهة فقط. النموذج يعيش في src/core، ولا يُعدَّل إلا بأمر.
 * الإعدادات وحدها تُحفظ في localStorage (لا شيء يخرج من الجهاز).
 */
export const useEditorStore = create<EditorUiState>()(
  persist(
    (set) => ({
      language: 'ar',
      digitStyle: 'arab',
      previewQuality: 'medium',
      sheet: null,
      timelineCollapsed: false,
      isPlaying: false,
      currentTick: 0,
      setLanguage: (language) => set({ language }),
      setDigitStyle: (digitStyle) => set({ digitStyle }),
      setPreviewQuality: (previewQuality) => set({ previewQuality }),
      openSheet: (sheet) => set({ sheet }),
      closeSheet: () => set({ sheet: null }),
      toggleTimeline: () => set((state) => ({ timelineCollapsed: !state.timelineCollapsed })),
      togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),
      rewind: () => set({ currentTick: 0, isPlaying: false }),
    }),
    {
      name: 'studio.settings',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        language: state.language,
        digitStyle: state.digitStyle,
        previewQuality: state.previewQuality,
      }),
    },
  ),
);
