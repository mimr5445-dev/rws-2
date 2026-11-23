import React from 'react';
import { ChevronDown, ChevronUp, Clock, Crosshair, X } from 'lucide-react';
import { TICK_RATE } from '../engine/engine';
import { ActorPack, EntityState } from '../core/types';
import { ArmedAbilityState, StudioHudState } from './studioAppTypes';

export interface StudioBottomOverlaysProps {
  placementActor: ActorPack | undefined;
  armedAbility: ArmedAbilityState | null;
  selectedEntity: EntityState | undefined;
  selectedActor: ActorPack | undefined;
  cinematicCamera: boolean;
  timelineOpen: boolean;
  setTimelineOpen: (v: boolean) => void;
  dragActive: boolean;
  hudState: StudioHudState;
  onStopCurrentMode: () => void;
  onScrub: (targetTick: number) => void;
}

export function StudioBottomOverlays({
  placementActor,
  armedAbility,
  selectedEntity,
  selectedActor,
  cinematicCamera,
  timelineOpen,
  setTimelineOpen,
  dragActive,
  hudState,
  onStopCurrentMode,
  onScrub
}: StudioBottomOverlaysProps) {
  return (
    <>
      {(placementActor || (armedAbility && armedAbility.entityId !== selectedEntity?.id)) && (
        <div
          id="placementModeBanner"
          className={`pointer-events-auto fixed left-1/2 -translate-x-1/2 z-25 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/92 border border-sky-500/70 shadow-xl backdrop-blur-md text-xs ${
            cinematicCamera || timelineOpen ? 'bottom-18' : 'bottom-13'
          }`}
        >
          <Crosshair className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-slate-100 font-medium whitespace-nowrap">
            {armedAbility
              ? `مفعّل: ${armedAbility.label} — اضغط أهدافًا متتالية`
              : `اضغط الخريطة لوضع: ${placementActor?.label}`}
          </span>
          <button
            type="button"
            onClick={onStopCurrentMode}
            className="p-1 rounded bg-slate-800 hover:bg-red-900 text-slate-200"
            aria-label="إيقاف الوضع الحالي"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {dragActive && (
        <div className="pointer-events-none fixed inset-4 z-40 flex items-center justify-center rounded-xl border-2 border-dashed border-sky-400 bg-slate-950/85">
          <p className="text-sm font-semibold text-sky-300">أفلت ملف السيناريو (.yaml) هنا</p>
        </div>
      )}

      {hudState.caption && (
        <div
          id="captionBar"
          data-testid="caption-bar"
          className={`pointer-events-none fixed left-1/2 -translate-x-1/2 z-20 max-w-[88vw] bg-slate-950/92 border border-sky-500/70 px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-100 text-center shadow-xl ${
            selectedEntity && selectedActor?.ability
              ? armedAbility?.entityId === selectedEntity.id
                ? cinematicCamera || timelineOpen
                  ? 'bottom-41'
                  : 'bottom-36'
                : cinematicCamera || timelineOpen
                  ? 'bottom-34'
                  : 'bottom-29'
              : placementActor || armedAbility
                ? cinematicCamera || timelineOpen
                  ? 'bottom-29'
                  : 'bottom-24'
                : cinematicCamera || timelineOpen
                  ? 'bottom-18'
                  : 'bottom-14'
          }`}
        >
          {hudState.caption}
        </div>
      )}

      <div className="fixed bottom-2 left-2 right-2 z-25 flex items-center justify-center pointer-events-none">
        {!timelineOpen ? (
          <button
            type="button"
            id="timelineToggleBtn"
            aria-expanded={false}
            onClick={() => setTimelineOpen(true)}
            className="pointer-events-auto min-h-[34px] px-3 rounded-lg bg-slate-950/88 border border-slate-700/90 text-xs font-mono tabular-nums text-sky-300 flex items-center gap-1.5 shadow-lg backdrop-blur-md hover:bg-slate-900"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{hudState.simTimeSec.toFixed(1)}s</span>
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          </button>
        ) : (
          <div
            aria-label="شريط الزمن التفاعلي"
            className="pointer-events-auto w-full max-w-xl bg-slate-950/94 border border-slate-700/90 rounded-xl px-3 py-1.5 flex items-center gap-2.5 text-xs shadow-xl backdrop-blur-md"
          >
            <button
              type="button"
              onClick={() => setTimelineOpen(false)}
              aria-label="طي شريط الزمن"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 shrink-0"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <span id="timeLabel" className="font-mono tabular-nums text-sky-300 w-10 shrink-0 text-center">
              {hudState.simTimeSec.toFixed(1)}s
            </span>
            <input
              id="timeScrubber"
              type="range"
              aria-label="التقديم والترجيع في شريط الزمن"
              min={0}
              max={hudState.maxTicks}
              value={Math.min(hudState.maxTicks, hudState.tick)}
              onChange={(e) => onScrub(parseInt(e.target.value, 10))}
              className="flex-1 accent-sky-400 cursor-pointer"
            />
            <span id="durLabel" className="font-mono tabular-nums text-slate-400 w-10 shrink-0 text-center">
              {(hudState.maxTicks / TICK_RATE).toFixed(1)}s
            </span>
          </div>
        )}
      </div>
    </>
  );
}
