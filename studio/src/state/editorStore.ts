import { fitWorld, zoomByStep, type Camera, type Viewport } from '@/core/camera';
import type { ScheduledSound, SoundCatalog } from '@/core/audio';
import type { AudioPreview } from '@/core/audio';
import type { Project } from '@/core/model/project';
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

export interface AudioState {
  readonly ready: boolean;
  readonly error: string | null;
  readonly sounds: number;
  readonly playing: boolean;
}

/**
 * موارد صوتية غير قابلة للتسلسل (AudioContext والجدول) تعيش خارج المتجر،
 * والمتجر يحمل حالتها الظاهرة فقط.
 */
interface AudioRuntime {
  catalog: SoundCatalog;
  schedule: readonly ScheduledSound[];
  preview: AudioPreview;
  context: AudioContext;
  sink: { stopAll(): void; resume?: () => Promise<void> };
}

let audioRuntime: AudioRuntime | null = null;

interface EditorUiState extends Settings {
  sheet: SheetKind | null;
  camera: Camera;
  viewport: Viewport;
  mapReady: boolean;
  mapError: string | null;
  selectedCountryId: string | null;
  selectedCountryName: string | null;
  scene: SceneState | null;
  sceneProject: Project | null;
  audio: AudioState;
  loadAudio: () => Promise<AudioState>;
  playAudio: (fromTick?: number) => Promise<readonly { id: string; delay: number }[]>;
  stopAudio: () => void;
  bounceAudio: () => Promise<{
    frameCount: number;
    peak: number;
    onsetSample: number;
    durationSeconds: number;
  }>;
  audioPlan: (tick: number) => readonly { id: string; delay: number }[];
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
    (set, get) => ({
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
      sceneProject: null,
      sceneSource: null,
      sceneError: null,
      audio: { ready: false, error: null, sounds: 0, playing: false },
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
            sceneProject: scene.project,
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
          const next = {
            scene: {
              ...state.scene,
              tick: clamped,
              entities: state.sceneSource ? state.sceneSource(clamped) : state.scene.entities,
            },
            currentTick: clamped,
          };
          // أثناء التشغيل: كل قفزة تُعيد جدولة الصوت من جديد (لا مؤقتات ولا انحراف).
          if (state.isPlaying && audioRuntime) {
            audioRuntime.preview.seek(audioRuntime.schedule, clamped);
          }
          return next;
        }),
      loadAudio: async () => {
        try {
          const [{ loadSoundCatalog }, { buildSchedule, AudioPreview: Preview }, webAudio] =
            await Promise.all([
              import('@/content/sounds'),
              import('@/core/audio'),
              import('@/render/audio/webAudio'),
            ]);
          const catalog = await loadSoundCatalog();
          const project = get().sceneProject;
          const schedule = project ? buildSchedule(project) : [];
          const Context = window.AudioContext;
          let context: AudioContext;
          try {
            context = new Context({ sampleRate: 48_000 });
          } catch {
            // بعض المتصفحات ترفض فرض 48 ك.هز: نكمل بمعدل الجهاز والكتالوج يُعاد تشكيله.
            context = new Context();
          }
          const sink = new webAudio.WebAudioSink(context, catalog);
          audioRuntime = {
            catalog,
            schedule,
            context,
            sink,
            preview: new Preview(sink.clock, sink),
          };
          set({
            audio: { ready: true, error: null, sounds: catalog.clips.size, playing: false },
          });
        } catch (error: unknown) {
          set({
            audio: {
              ready: false,
              error: error instanceof Error ? error.message : 'خطأ صوتي غير معروف',
              sounds: 0,
              playing: false,
            },
          });
        }
        return get().audio;
      },
      playAudio: async (fromTick) => {
        const runtime = audioRuntime;
        if (!runtime) return [];
        await runtime.sink.resume?.();
        const plan = runtime.preview.play(runtime.schedule, fromTick ?? get().scene?.tick ?? 0);
        set({ audio: { ...get().audio, playing: true } });
        return plan.map((item) => ({ id: item.id, delay: Number(item.delay.toFixed(6)) }));
      },
      stopAudio: () => {
        audioRuntime?.preview.stop();
        set({ audio: { ...get().audio, playing: false } });
      },
      bounceAudio: async () => {
        const runtime = audioRuntime;
        if (!runtime) throw new Error('الكتالوج الصوتي غير محمّل');
        const { bounceOffline } = await import('@/render/audio/webAudio');
        const durationTicks = get().scene?.durationTicks ?? 0;
        const result = await bounceOffline(
          runtime.catalog,
          runtime.schedule.map((sound) => ({
            clipId: sound.clipId,
            sample: sound.sample,
            gain: sound.gain,
            pan: sound.pan,
          })),
          durationTicks,
        );
        return {
          frameCount: result.frameCount,
          peak: Number(result.peak.toFixed(6)),
          onsetSample: result.onsetSample,
          durationSeconds: result.durationSeconds,
        };
      },
      audioPlan: (tick) => {
        const runtime = audioRuntime;
        if (!runtime) return [];
        const rate = 60;
        return runtime.schedule
          .filter((sound) => sound.tick >= tick)
          .map((sound) => ({
            id: sound.id,
            delay: Number(((sound.tick - tick) / rate).toFixed(6)),
          }));
      },
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
      togglePlayback: () => {
        const state = get();
        const next = !state.isPlaying;
        set({ isPlaying: next });
        if (next) void get().playAudio(state.scene?.tick ?? state.currentTick);
        else get().stopAudio();
      },
      rewind: () => {
        get().stopAudio();
        set({ currentTick: 0, isPlaying: false });
        get().setTick(0);
      },
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
