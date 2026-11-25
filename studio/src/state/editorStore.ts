import { fitWorld, zoomByStep, type Camera, type Viewport } from '@/core/camera';
import type { EntityState, SimEvent } from '@/core/sim';
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

export interface SceneState {
  readonly tick: number;
  readonly durationTicks: number;
  readonly entities: readonly EntityState[];
  readonly events: readonly SimEvent[];
}

interface EditorUiState extends Settings {
  sheet: SheetKind | null;
  camera: Camera;
  viewport: Viewport;
  mapReady: boolean;
  mapError: string | null;
  selectedCountryId: string | null;
  selectedCountryName: string | null;
  scene: SceneState | null;
  /** مصدر حساب حالة الكيانات عند أي tick (دالة نقية من مشروع محمّل). */
  sceneSource: ((tick: number) => readonly EntityState[]) | null;
  sceneError: string | null;
  loadDemoScene: () => Promise<void>;
  setTick: (tick: number) => void;
  setCamera: (camera: Camera) => void;
  setViewport: (viewport: Viewport) => void;
  setMapReady: (ready: boolean) => void;
  setMapError: (message: string | null) => void;
  selectCountry: (id: string, name: string) => void;
  clearSelection: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitMap: () => void;
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
      camera: fitWorld({ width: 1280, height: 800 }),
      viewport: { width: 1280, height: 800 },
      mapReady: false,
      mapError: null,
      selectedCountryId: null,
      selectedCountryName: null,
      scene: null,
      sceneSource: null,
      sceneError: null,
      setCamera: (camera) => set({ camera }),
      setViewport: (viewport) => set({ viewport, camera: fitWorld(viewport) }),
      setMapReady: (mapReady) => set({ mapReady }),
      setMapError: (mapError) => set({ mapError }),
      selectCountry: (id, name) => set({ selectedCountryId: id, selectedCountryName: name }),
      clearSelection: () => set({ selectedCountryId: null, selectedCountryName: null }),
      loadDemoScene: async () => {
        try {
          const { loadSmallScene } = await import('@/content/scenes');
          const scene = await loadSmallScene();
          set({
            scene: {
              tick: 0,
              durationTicks: scene.durationTicks,
              entities: scene.entitiesAt(0),
              events: scene.events,
            },
            sceneSource: scene.entitiesAt,
            sceneError: null,
          });
        } catch (error: unknown) {
          set({ sceneError: error instanceof Error ? error.message : 'خطأ غير معروف' });
        }
      },
      setTick: (tick) =>
        set((state) => {
          if (!state.scene) return {};
          const clamped = Math.max(0, Math.min(state.scene.durationTicks, Math.round(tick)));
          return {
            scene: {
              ...state.scene,
              tick: clamped,
              entities: state.sceneSource ? state.sceneSource(clamped) : state.scene.entities,
            },
          };
        }),
      zoomIn: () => set((state) => ({ camera: zoomByStep(state.camera, state.viewport, 1) })),
      zoomOut: () => set((state) => ({ camera: zoomByStep(state.camera, state.viewport, -1) })),
      fitMap: () => set((state) => ({ camera: fitWorld(state.viewport) })),
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
