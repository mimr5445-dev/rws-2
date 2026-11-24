import React from 'react';
import {
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Compass,
  Eye,
  EyeOff,
  Globe2,
  Maximize2,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { CAMERA_ANGLE_PRESETS, MAX_TILT_DEG, clampTiltDeg, normalizeAngleDeg } from '../core/cameraTransform';
import { CinematicFocusKind } from '../core/cinematicDirector';
import { GeoRegionItem, MapPack } from '../core/types';
import { StudioRenderer } from '../renderer/studioRenderer';
import { StudioHudState } from './studioAppTypes';

export interface StudioTopHudProps {
  activeMap: MapPack;
  topHudExpanded: boolean;
  onToggleTopHud: () => void;
  cinematicCamera: boolean;
  onToggleCinematicCamera: () => void;
  cinematicFocus: { kind: CinematicFocusKind; labelAr: string };
  anglesOpen: boolean;
  onToggleAngles: () => void;
  onCloseAngles: () => void;
  cameraAngles: { bearingDeg: number; tiltDeg: number };
  selectedRegionId: string | null;
  selectedRegionObj: GeoRegionItem | undefined;
  onEnterCountryProvinces: (regionId: string) => void;
  onBackToWorld: () => void;
  onSelectMapStyle: (style: 'briefing' | 'relief') => void;
  hudState: StudioHudState;
  showAnchors: boolean;
  onToggleAnchors: () => void;
  geoLoadingMsg: string | null;
  toastMsg: string | null;
  rendererRef: React.MutableRefObject<StudioRenderer | null>;
}

export function StudioTopHud({
  activeMap,
  topHudExpanded,
  onToggleTopHud,
  cinematicCamera,
  onToggleCinematicCamera,
  cinematicFocus,
  anglesOpen,
  onToggleAngles,
  onCloseAngles,
  cameraAngles,
  selectedRegionId,
  selectedRegionObj,
  onEnterCountryProvinces,
  onBackToWorld,
  onSelectMapStyle,
  hudState,
  showAnchors,
  onToggleAnchors,
  geoLoadingMsg,
  toastMsg,
  rendererRef
}: StudioTopHudProps) {
  return (
    <div className="pointer-events-none fixed top-2 left-2 right-2 z-30 flex flex-col items-center gap-1.5">
      <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-950/90 border border-slate-700/90 rounded-xl px-2 py-1 shadow-xl backdrop-blur-md max-w-full">
        <button
          type="button"
          id="topHudCollapseBtn"
          aria-expanded={topHudExpanded}
          onClick={onToggleTopHud}
          className="min-h-[36px] px-2 rounded-lg flex items-center gap-1.5 text-xs font-semibold text-sky-300 hover:bg-slate-900 whitespace-nowrap"
        >
          <Globe2 className="w-4 h-4 shrink-0" />
          <span className="truncate max-w-[115px] sm:max-w-[240px]">
            {activeMap.geoLevel === 'country'
              ? activeMap.title.replace(' — المحافظات', '')
              : 'خريطة العالم'}
          </span>
          {topHudExpanded ? <ChevronUp className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
        </button>

        <div
          className="flex items-center gap-0.5 bg-slate-900/80 border border-slate-700 rounded-lg p-0.5"
          aria-label="نمط خريطة العالم"
        >
          <button
            type="button"
            id="mapStyleBriefingBtn"
            aria-pressed={activeMap.id !== 'world_relief'}
            onClick={() => onSelectMapStyle('briefing')}
            className={`min-h-[30px] px-2 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors border ${
              activeMap.id !== 'world_relief'
                ? 'bg-sky-600 text-white border-sky-400'
                : 'text-slate-300 border-transparent hover:bg-slate-800'
            }`}
          >
            لوح الإحاطة
          </button>
          <button
            type="button"
            id="mapStyleReliefBtn"
            aria-pressed={activeMap.id === 'world_relief'}
            onClick={() => onSelectMapStyle('relief')}
            className={`min-h-[30px] px-2 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors border ${
              activeMap.id === 'world_relief'
                ? 'bg-sky-600 text-white border-sky-400'
                : 'text-slate-300 border-transparent hover:bg-slate-800'
            }`}
          >
            تضاريس
          </button>
        </div>

        <button
          type="button"
          id="cinematicCamBtn"
          aria-pressed={cinematicCamera}
          aria-label="كاميرا سينمائية آلية مع الأحداث"
          title="كاميرا سينمائية آلية مع الأحداث"
          onClick={onToggleCinematicCamera}
          className={`min-h-[34px] px-2 rounded-lg text-xs font-semibold border flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
            cinematicCamera
              ? 'bg-amber-600/95 hover:bg-amber-500 border-amber-300 text-white shadow-md shadow-amber-950/50'
              : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
          }`}
        >
          <Clapperboard className={`w-3.5 h-3.5 shrink-0 ${cinematicCamera ? 'text-white' : 'text-amber-400'}`} />
          <span className="hidden sm:inline">سينمائية</span>
        </button>

        <button
          type="button"
          id="cameraAngleBtn"
          aria-expanded={anglesOpen}
          aria-label="زوايا الكاميرا والمنظور"
          title="زوايا الكاميرا والمنظور"
          onClick={onToggleAngles}
          className={`min-h-[34px] px-2 rounded-lg text-xs font-semibold border flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
            anglesOpen || Math.abs(cameraAngles.bearingDeg) >= 1 || cameraAngles.tiltDeg >= 1
              ? 'bg-sky-600/95 hover:bg-sky-500 border-sky-300 text-white shadow-md shadow-sky-950/50'
              : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
          }`}
        >
          <Compass className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">الزاوية</span>
          {(Math.abs(cameraAngles.bearingDeg) >= 1 || cameraAngles.tiltDeg >= 1) && (
            <span className="font-mono tabular-nums text-[10px] opacity-90">
              {Math.round(cameraAngles.tiltDeg)}°
            </span>
          )}
        </button>

        {activeMap.geoLevel === 'world' && selectedRegionId && selectedRegionObj?.iso3 && (
          <button
            type="button"
            id="drillDownBtn"
            onClick={() => onEnterCountryProvinces(selectedRegionId)}
            className="min-h-[34px] px-2.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white border border-sky-400 whitespace-nowrap shrink-0"
          >
            محافظات {selectedRegionObj.nameAr ?? selectedRegionObj.name} ↗
          </button>
        )}

        {activeMap.geoLevel === 'country' && (
          <button
            type="button"
            id="backWorldBtn"
            onClick={onBackToWorld}
            className="min-h-[34px] px-2.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 whitespace-nowrap shrink-0"
          >
            ↩ خريطة العالم
          </button>
        )}
      </div>

      {cinematicCamera && (
        <div
          id="cinematicStatusPill"
          className={`pointer-events-none max-w-[calc(100vw-116px)] sm:max-w-[75vw] px-2.5 py-0.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 shadow-lg backdrop-blur-md ${
            cinematicFocus.kind !== 'none'
              ? 'bg-amber-950/90 border-amber-400/80 text-amber-100'
              : 'bg-slate-950/85 border-slate-700/80 text-slate-300'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              cinematicFocus.kind !== 'none' ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'
            }`}
          />
          <span className="truncate">
            {cinematicFocus.labelAr ? `كاميرا سينمائية: ${cinematicFocus.labelAr}` : 'كاميرا سينمائية: بانتظار حدث'}
          </span>
        </div>
      )}

      {anglesOpen && (
        <div
          id="cameraAnglesPanel"
          aria-label="خيارات زوايا الكاميرا"
          className="pointer-events-auto w-[min(370px,calc(100vw-116px))] sm:w-[400px] bg-slate-950/95 border border-slate-700/90 rounded-xl p-2 sm:p-2.5 shadow-2xl backdrop-blur-md text-xs space-y-2 overflow-hidden"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-100">
              <Compass className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>زوايا الكاميرا</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                id="resetCameraAngleBtn"
                onClick={() => rendererRef.current?.resetCameraAngles()}
                className="px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-200 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>تصفير</span>
              </button>
              <button
                type="button"
                aria-label="إغلاق لوحة الزوايا"
                onClick={onCloseAngles}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {CAMERA_ANGLE_PRESETS.map((preset) => {
              const isActive =
                Math.abs(cameraAngles.bearingDeg - preset.bearingDeg) < 2 &&
                Math.abs(cameraAngles.tiltDeg - preset.tiltDeg) < 2;
              return (
                <button
                  key={preset.id}
                  type="button"
                  id={`anglePreset_${preset.id}`}
                  data-angle-preset={preset.id}
                  aria-pressed={isActive}
                  onClick={() => rendererRef.current?.setCameraAngles(preset.bearingDeg, preset.tiltDeg)}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-sky-600 border-sky-300 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
              <span className="w-9 sm:w-12 text-[11px] text-slate-300 shrink-0">الدوران</span>
              <button
                type="button"
                aria-label="تدوير لليسار"
                onClick={() =>
                  rendererRef.current?.setCameraAngles(
                    normalizeAngleDeg(cameraAngles.bearingDeg - 15),
                    cameraAngles.tiltDeg
                  )
                }
                className="px-1 sm:px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] sm:text-[11px] font-mono shrink-0"
              >
                -15°
              </button>
              <input
                id="cameraBearingSlider"
                type="range"
                aria-label="زاوية دوران الكاميرا"
                min={-180}
                max={180}
                step={1}
                value={Math.round(cameraAngles.bearingDeg)}
                onChange={(e) =>
                  rendererRef.current?.setCameraAngles(parseFloat(e.target.value), cameraAngles.tiltDeg, true)
                }
                className="flex-1 min-w-0 accent-sky-400 cursor-pointer"
              />
              <button
                type="button"
                aria-label="تدوير لليمين"
                onClick={() =>
                  rendererRef.current?.setCameraAngles(
                    normalizeAngleDeg(cameraAngles.bearingDeg + 15),
                    cameraAngles.tiltDeg
                  )
                }
                className="px-1 sm:px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] sm:text-[11px] font-mono shrink-0"
              >
                +15°
              </button>
              <span className="w-8 sm:w-10 text-left font-mono tabular-nums text-[11px] text-sky-300 shrink-0">
                {Math.round(cameraAngles.bearingDeg)}°
              </span>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
              <span className="w-9 sm:w-12 text-[11px] text-slate-300 shrink-0">الميلان</span>
              <input
                id="cameraTiltSlider"
                type="range"
                aria-label="زاوية ميلان الكاميرا"
                min={0}
                max={MAX_TILT_DEG}
                step={1}
                value={Math.round(cameraAngles.tiltDeg)}
                onChange={(e) =>
                  rendererRef.current?.setCameraAngles(
                    cameraAngles.bearingDeg,
                    clampTiltDeg(parseFloat(e.target.value)),
                    true
                  )
                }
                className="flex-1 min-w-0 accent-amber-400 cursor-pointer"
              />
              <span className="w-8 sm:w-10 text-left font-mono tabular-nums text-[11px] text-amber-300 shrink-0">
                {Math.round(cameraAngles.tiltDeg)}°
              </span>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 leading-snug">
            اللمس بإصبعين: تقريب/تبعيد • سحب يمين/يسار للدوران • أعلى/أسفل للميلان (أو زر الفأرة الأيمن)
          </p>
        </div>
      )}

      {topHudExpanded && (
        <div
          id="topHudControls"
          className="pointer-events-auto max-w-[calc(100vw-116px)] sm:max-w-full flex flex-wrap items-center justify-center gap-1.5 bg-slate-950/92 border border-slate-700/90 rounded-xl px-2.5 py-1.5 shadow-xl backdrop-blur-md text-xs"
        >
          <span className="font-mono tabular-nums text-sky-300 px-1.5">
            {hudState.simTimeSec.toFixed(1)}s
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-300 px-1">{hudState.entityCount} وحدة</span>
          <button
            type="button"
            onClick={() => rendererRef.current?.zoomBy(1.22)}
            aria-label="تكبير الخريطة"
            className="min-h-[36px] min-w-[36px] rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => rendererRef.current?.zoomBy(0.82)}
            aria-label="تصغير الخريطة"
            className="min-h-[36px] min-w-[36px] rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            id="fitMapBtn"
            onClick={() => rendererRef.current?.resetCamera()}
            aria-label="ملاءمة الخريطة"
            className="min-h-[36px] min-w-[36px] rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onToggleAnchors}
            aria-label={showAnchors ? 'إخفاء المراسي' : 'إظهار المراسي'}
            className="min-h-[36px] min-w-[36px] rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center"
          >
            {showAnchors ? <Eye className="w-4 h-4 text-amber-300" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>
      )}

      {geoLoadingMsg && (
        <div className="pointer-events-auto max-w-[calc(100vw-116px)] sm:max-w-[80vw] bg-sky-950/95 border border-sky-400 text-sky-100 px-3 py-1 rounded-lg text-xs font-medium shadow-lg text-center">
          {geoLoadingMsg}
        </div>
      )}

      {toastMsg && (
        <div
          id="toastBar"
          role="alert"
          className="pointer-events-none max-w-[calc(100vw-116px)] sm:max-w-[85vw] bg-slate-950/95 border border-amber-400/80 text-slate-100 px-3.5 py-1.5 rounded-lg text-xs font-medium text-center shadow-xl"
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
}
