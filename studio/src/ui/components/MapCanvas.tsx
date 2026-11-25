import { useEffect, useRef } from 'react';
import { applyPointers, screenToWorld, zoomAt, type Camera, type ScreenPoint } from '@/core/camera';
import { hitTest, project, type PolygonalCountry } from '@/core/geo';
import type { PixiMapRenderer } from '@/render/pixi/PixiMapRenderer';
import { loadWorldMap } from '@/content';
import { frameStats, resetFrameSampling, startFrameSampling, stopFrameSampling } from '@/render';
import { useEditorStore } from '@/state';

interface MapCanvasProps {
  className?: string;
}

interface DebugApi {
  centerOn: (lon: number, lat: number, zoom?: number) => void;
  frames: () => ReturnType<typeof frameStats>;
  resetFrames: () => void;
  camera: () => Camera;
  selectAtCenter: () => string | null;
}

const TAP_MAX_MS = 450;
const TAP_MAX_PX = 8;

export function MapCanvas({ className }: MapCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<PixiMapRenderer | null>(null);
  const countriesRef = useRef<readonly PolygonalCountry[] | null>(null);
  const pointersRef = useRef(new Map<number, ScreenPoint>());
  const tapRef = useRef<{ x: number; y: number; time: number; moved: number } | null>(null);

  const cameraState = useEditorStore((state) => state.camera);
  const viewport = useEditorStore((state) => state.viewport);
  const selectedCountryId = useEditorStore((state) => state.selectedCountryId);
  const setCamera = useEditorStore((state) => state.setCamera);
  const setViewport = useEditorStore((state) => state.setViewport);
  const setMapReady = useEditorStore((state) => state.setMapReady);
  const setMapError = useEditorStore((state) => state.setMapError);
  const selectCountry = useEditorStore((state) => state.selectCountry);
  const clearSelection = useEditorStore((state) => state.clearSelection);

  // تحميل الخريطة مرة واحدة + التحقق من البصمة
  useEffect(() => {
    let cancelled = false;
    loadWorldMap()
      .then((data) => {
        if (cancelled) return;
        countriesRef.current = data.countries;
        const host = hostRef.current;
        if (!host) return;
        // Pixi.js يُحمّل عند الحاجة فقط كي تبقى حزمة الصدفة خفيفة (BUDGETS.md).
        return import('@/render/pixi/PixiMapRenderer')
          .then(({ PixiMapRenderer }) => PixiMapRenderer.create(host, data.countries))
          .then((renderer) => {
            if (cancelled) {
              renderer.destroy();
              return;
            }
            rendererRef.current = renderer;
            const rect = host.getBoundingClientRect();
            setViewport({ width: Math.max(1, rect.width), height: Math.max(1, rect.height) });
            setMapReady(true);
            startFrameSampling();
          });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setMapError(error instanceof Error ? error.message : 'خطأ غير معروف');
      });

    return () => {
      cancelled = true;
      stopFrameSampling();
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, [setMapError, setMapReady, setViewport]);

  // تتبّع المقاس الفعلي للحاوية
  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      const next = { width: Math.max(1, rect.width), height: Math.max(1, rect.height) };
      rendererRef.current?.resize(next.width, next.height);
      const state = useEditorStore.getState();
      if (
        Math.abs(state.viewport.width - next.width) > 0.5 ||
        Math.abs(state.viewport.height - next.height) > 0.5
      ) {
        setViewport(next);
      }
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, [setViewport]);

  // مزامنة الطبقة مع الحالة (قراءة فقط)
  useEffect(() => {
    rendererRef.current?.resize(viewport.width, viewport.height);
    rendererRef.current?.update(cameraState, selectedCountryId);
  }, [cameraState, viewport, selectedCountryId]);

  const pickCountry = (screen: ScreenPoint) => {
    const countries = countriesRef.current;
    if (!countries) return;
    const world = screenToWorld(cameraState, viewport, screen);
    const hit = hitTest(countries, world.x, world.y);
    if (hit) selectCountry(hit.id, hit.name);
    else clearSelection();
  };

  // إيماءات المؤشر: تحريك + قرص + نقرة اختيار
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const points = () => Array.from(pointersRef.current.values());

    const onPointerDown = (event: PointerEvent) => {
      host.setPointerCapture(event.pointerId);
      pointersRef.current.set(event.pointerId, { x: event.offsetX, y: event.offsetY });
      tapRef.current = { x: event.offsetX, y: event.offsetY, time: performance.now(), moved: 0 };
    };

    const onPointerMove = (event: PointerEvent) => {
      const existing = pointersRef.current.get(event.pointerId);
      if (!existing) return;
      const previous = points();
      pointersRef.current.set(event.pointerId, { x: event.offsetX, y: event.offsetY });
      const next = points();
      const tap = tapRef.current;
      if (tap) tap.moved += Math.hypot(event.movementX, event.movementY);
      const state = useEditorStore.getState();
      setCamera(applyPointers(state.camera, state.viewport, next, previous));
    };

    const onPointerUp = (event: PointerEvent) => {
      const tap = tapRef.current;
      pointersRef.current.delete(event.pointerId);
      if (pointersRef.current.size > 0) return;
      tapRef.current = null;
      if (!tap) return;
      const duration = performance.now() - tap.time;
      if (duration <= TAP_MAX_MS && tap.moved <= TAP_MAX_PX) {
        pickCountry({ x: event.offsetX, y: event.offsetY });
      }
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const state = useEditorStore.getState();
      const factor = Math.exp(-event.deltaY * 0.0015);
      setCamera(
        zoomAt(state.camera, state.viewport, factor, { x: event.offsetX, y: event.offsetY }),
      );
    };

    host.addEventListener('pointerdown', onPointerDown);
    host.addEventListener('pointermove', onPointerMove);
    host.addEventListener('pointerup', onPointerUp);
    host.addEventListener('pointercancel', onPointerUp);
    host.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      host.removeEventListener('pointerdown', onPointerDown);
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerup', onPointerUp);
      host.removeEventListener('pointercancel', onPointerUp);
      host.removeEventListener('wheel', onWheel);
    };
    // pickCountry يقرأ من refs وحالة المتجر مباشرة، فلا حاجة لإعادة الربط
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setCamera]);

  // خطّاف تشخيص للاختبارات فقط، يُحذف من بناء الإنتاج
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const api: DebugApi = {
      centerOn: (lon, lat, zoom = 2) => {
        const point = project(lon, lat);
        const state = useEditorStore.getState();
        setCamera({
          centerX: point.x,
          centerY: point.y,
          zoom: Math.min(4, Math.max(0.25, zoom)),
        });
        void state;
      },
      frames: () => frameStats(),
      resetFrames: () => resetFrameSampling(),
      camera: () => useEditorStore.getState().camera,
      selectAtCenter: () => {
        const state = useEditorStore.getState();
        pickCountry({ x: state.viewport.width / 2, y: state.viewport.height / 2 });
        return useEditorStore.getState().selectedCountryName;
      },
    };
    (globalThis as unknown as { __studioDebug?: DebugApi }).__studioDebug = api;
    return () => {
      delete (globalThis as unknown as { __studioDebug?: DebugApi }).__studioDebug;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setCamera]);

  return (
    <div
      ref={hostRef}
      data-testid="map-canvas"
      data-map-ready={useEditorStore((state) => state.mapReady) ? 'true' : 'false'}
      data-zoom={cameraState.zoom.toFixed(4)}
      // لا نضع `relative` مع `absolute` هنا: تعارض أدوات Tailwind يحسمه ترتيب
      // التوليد لا ترتيب الأصناف، وقد يجعل الحاوية في التدفق بارتفاع صفر.
      className={`absolute inset-0 touch-none select-none ${className ?? ''}`}
    />
  );
}
