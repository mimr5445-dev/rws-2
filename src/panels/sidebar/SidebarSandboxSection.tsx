import React from 'react';
import { ActorPack, Faction } from '../../core/types';

const FACTION_BUTTONS: Array<{ id: Faction; label: string }> = [
  { id: 'blue', label: 'أزرق' },
  { id: 'red', label: 'أحمر' },
  { id: 'neutral', label: 'محايد' }
];

interface SidebarSandboxSectionProps {
  actors: Record<string, ActorPack>;
  activeTool: string;
  onSelectTool: (tool: string) => void;
  strikeMode: 'none' | 'airstrike' | 'missile';
  onSelectStrikeMode: (mode: 'airstrike' | 'missile') => void;
  sandboxFaction: Faction;
  onSelectFaction: (faction: Faction) => void;
  selectedEntityId: string | null;
  selectedEntityLabel: string | null;
  selectedEntityScale: number;
  onChangeSelectedEntityScale: (scale: number) => void;
  activeToolScale: number;
  onChangeActiveToolScale: (scale: number) => void;
}

export function SidebarSandboxSection({
  actors,
  activeTool,
  onSelectTool,
  strikeMode,
  onSelectStrikeMode,
  sandboxFaction,
  onSelectFaction,
  selectedEntityId,
  selectedEntityLabel,
  selectedEntityScale,
  onChangeSelectedEntityScale,
  activeToolScale,
  onChangeActiveToolScale
}: SidebarSandboxSectionProps) {
  return (
    <section aria-label="أدوات اللعب الحر" className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-slate-400">الأدوات والآليات</span>
        <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-md border border-slate-800">
          {FACTION_BUTTONS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onSelectFaction(f.id)}
              className={`px-2 py-0.5 text-[11px] font-medium rounded whitespace-nowrap shrink-0 transition-colors ${
                sandboxFaction === f.id
                  ? f.id === 'blue'
                    ? 'bg-sky-600 text-white'
                    : f.id === 'red'
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div id="sandboxBar" className="flex flex-wrap gap-1 max-h-36 overflow-y-auto pl-0.5">
        <button
          type="button"
          data-tool="select"
          onClick={() => onSelectTool('select')}
          className={`px-2 py-1 text-[11px] font-medium rounded-md border whitespace-nowrap shrink-0 transition-colors ${
            activeTool === 'select' && strikeMode === 'none'
              ? 'bg-sky-600 border-sky-400 text-white'
              : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
          }`}
        >
          تحديد / تحريك
        </button>
        {Object.values(actors).map((act) => (
          <button
            key={act.id}
            type="button"
            data-tool={act.id}
            onClick={() => onSelectTool(act.id)}
            className={`px-2 py-1 text-[11px] font-medium rounded-md border whitespace-nowrap shrink-0 transition-colors ${
              activeTool === act.id && strikeMode === 'none'
                ? 'bg-sky-600 border-sky-400 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
            }`}
          >
            + {act.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5 pt-0.5">
        <button
          type="button"
          id="strikeAirBtn"
          aria-pressed={strikeMode === 'airstrike'}
          onClick={() => onSelectStrikeMode('airstrike')}
          className={`flex-1 px-2 py-1 text-[11px] font-semibold rounded-md border whitespace-nowrap transition-colors ${
            strikeMode === 'airstrike'
              ? 'bg-amber-600 border-amber-300 text-white shadow-sm'
              : 'bg-slate-900 border-slate-700 text-amber-200 hover:bg-slate-800'
          }`}
        >
          {strikeMode === 'airstrike' ? '✖ إيقاف القصف الجوي' : '✈️ أمر قصف جوي'}
        </button>
        <button
          type="button"
          id="strikeMissileBtn"
          aria-pressed={strikeMode === 'missile'}
          onClick={() => onSelectStrikeMode('missile')}
          className={`flex-1 px-2 py-1 text-[11px] font-semibold rounded-md border whitespace-nowrap transition-colors ${
            strikeMode === 'missile'
              ? 'bg-red-700 border-red-300 text-white shadow-sm'
              : 'bg-slate-900 border-slate-700 text-red-200 hover:bg-slate-800'
          }`}
        >
          {strikeMode === 'missile' ? '✖ إيقاف البالستي' : '🚀 إطلاق بالستي'}
        </button>
      </div>

      {activeTool === 'select' && selectedEntityId && (
        <div id="selectedEntityScalePanel" className="bg-slate-900/90 border border-sky-500/40 rounded-md p-2 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-semibold text-sky-300 truncate">
              حجم المحددة: {selectedEntityLabel ?? selectedEntityId}
            </span>
            <button
              type="button"
              id="resetSelectedScaleBtn"
              onClick={() => onChangeSelectedEntityScale(1.0)}
              className="px-1.5 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded shrink-0"
            >
              1.0x
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              id="shrinkSelectedBtn"
              aria-label="تصغير الوحدة المحددة"
              onClick={() => onChangeSelectedEntityScale(selectedEntityScale - 0.15)}
              className="px-2 py-0.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded shrink-0"
            >
              −
            </button>
            <input
              id="selectedUnitScaleSlider"
              aria-label="حجم الوحدة المحددة"
              type="range"
              min="0.3"
              max="2.8"
              step="0.05"
              value={selectedEntityScale}
              onChange={(e) => onChangeSelectedEntityScale(parseFloat(e.target.value))}
              className="flex-1 accent-sky-400 cursor-pointer"
            />
            <button
              type="button"
              id="enlargeSelectedBtn"
              aria-label="تكبير الوحدة المحددة"
              onClick={() => onChangeSelectedEntityScale(selectedEntityScale + 0.15)}
              className="px-2 py-0.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded shrink-0"
            >
              +
            </button>
            <span id="selectedUnitScaleVal" dir="ltr" className="font-mono tabular-nums text-[11px] text-sky-300 w-10 text-left shrink-0">
              {selectedEntityScale.toFixed(2)}x
            </span>
          </div>
        </div>
      )}

      {activeTool !== 'select' && strikeMode === 'none' && actors[activeTool] && (
        <div id="toolScalePanel" className="bg-slate-900/90 border border-slate-700 rounded-md p-2 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-medium text-slate-200 truncate">
              حجم الأداة الفردي ({actors[activeTool].label}):
            </span>
            <button
              type="button"
              id="resetToolScaleBtn"
              onClick={() => onChangeActiveToolScale(1.0)}
              className="px-1.5 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded shrink-0"
            >
              1.0x
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              aria-label="تصغير الأداة المختارة"
              onClick={() => onChangeActiveToolScale(activeToolScale - 0.15)}
              className="px-2 py-0.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded shrink-0"
            >
              −
            </button>
            <input
              id="toolUnitScaleSlider"
              aria-label="حجم الأداة الفردي"
              type="range"
              min="0.3"
              max="2.8"
              step="0.05"
              value={activeToolScale}
              onChange={(e) => onChangeActiveToolScale(parseFloat(e.target.value))}
              className="flex-1 accent-sky-400 cursor-pointer"
            />
            <button
              type="button"
              aria-label="تكبير الأداة المختارة"
              onClick={() => onChangeActiveToolScale(activeToolScale + 0.15)}
              className="px-2 py-0.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded shrink-0"
            >
              +
            </button>
            <span id="toolUnitScaleVal" dir="ltr" className="font-mono tabular-nums text-[11px] text-sky-300 w-10 text-left shrink-0">
              {activeToolScale.toFixed(2)}x
            </span>
          </div>
        </div>
      )}

      <p className="text-[11px] text-slate-400 leading-4">
        {strikeMode === 'airstrike'
          ? 'وضع القصف المستمر مفعل: اضغط على عدة أهداف لتقلع الطائرات وتقصف ثم تعود لقاعدتها (اضغط الزر مجددًا أو Esc للإيقاف).'
          : strikeMode === 'missile'
            ? 'وضع الإطلاق المستمر مفعل: اضغط عدة مواقع متتالية لإطلاق صواريخ بالستية (اضغط الزر مجددًا أو Esc للإيقاف).'
            : activeTool === 'select'
              ? selectedEntityId
                ? `الوحدة المحددة: ${selectedEntityId} — اضغط على الوجهة للتحريك أو عدّل حجمها المنفرد أعلاه`
                : 'اضغط على أي وحدة لتحديدها وتكبيرها/تصغيرها منفردة أو لتحريكها، أو اضغط على أي دولة لتحديدها.'
              : 'اضغط على الخريطة لوضع الكيان المختار بالحجم الفردي المحدد.'}
      </p>
    </section>
  );
}
