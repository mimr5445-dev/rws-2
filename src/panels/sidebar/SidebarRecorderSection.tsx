import React, { useState } from 'react';

interface SidebarRecorderSectionProps {
  actionRecording: boolean;
  recClockSec: number;
  recStepCount: number;
  selectedEntityId: string | null;
  onStartActionRecord: () => void;
  onRequestStopActionRecord: () => void;
  onRecCamera: () => void;
  onRecCaptionSubmit: (text: string) => void;
  onRecZone: () => void;
  onRecArrow: () => void;
  onRecPulse: () => void;
  onRecDeleteUnit: () => void;
  pendingSaveMode: 'recorded' | 'code' | null;
  saveDraftTitle: string;
  onChangeSaveDraftTitle: (val: string) => void;
  onConfirmSaveScenario: () => void;
  onCancelSaveScenario: () => void;
}

export function SidebarRecorderSection({
  actionRecording,
  recClockSec,
  recStepCount,
  selectedEntityId,
  onStartActionRecord,
  onRequestStopActionRecord,
  onRecCamera,
  onRecCaptionSubmit,
  onRecZone,
  onRecArrow,
  onRecPulse,
  onRecDeleteUnit,
  pendingSaveMode,
  saveDraftTitle,
  onChangeSaveDraftTitle,
  onConfirmSaveScenario,
  onCancelSaveScenario
}: SidebarRecorderSectionProps) {
  const [captionInputOpen, setCaptionInputOpen] = useState(false);
  const [captionDraft, setCaptionDraft] = useState('');

  const handleCaptionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = captionDraft.trim();
    if (!clean) return;
    onRecCaptionSubmit(clean);
    setCaptionDraft('');
    setCaptionInputOpen(false);
  };

  return (
    <section
      id="recorderPanel"
      aria-label="مسجل السيناريو الحي"
      className={`rounded-lg p-2.5 space-y-2 border transition-colors ${
        actionRecording ? 'border-red-500 bg-red-950/30' : 'border-slate-800 bg-slate-950/70'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-slate-300">مسجل السيناريو بالتحركات اليدوية</span>
        {actionRecording && (
          <span id="recTimer" className="inline-flex items-center gap-1.5 text-[11px] font-mono text-red-200">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <b id="recClock">{recClockSec.toFixed(1)}s</b>
            <span className="text-slate-400">
              (<span id="recCount">{recStepCount}</span> خطوة)
            </span>
          </span>
        )}
      </div>

      {!actionRecording ? (
        <button
          type="button"
          id="startActionRecBtn"
          onClick={onStartActionRecord}
          className="w-full px-3 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white border border-sky-400 rounded-md transition-colors"
        >
          🔴 بدء تسجيل سيناريو حي
        </button>
      ) : (
        <>
          <button
            type="button"
            id="stopActionRecBtn"
            onClick={() => {
              setCaptionInputOpen(false);
              onRequestStopActionRecord();
            }}
            className="w-full px-3 py-1.5 text-xs font-semibold bg-red-700 hover:bg-red-600 text-white border border-red-400 rounded-md transition-colors"
          >
            ⏹ إيقاف وحفظ في السجل
          </button>

          <div id="recQuickActions" className="flex flex-wrap gap-1.5">
            <button
              type="button"
              id="recCamBtn"
              onClick={onRecCamera}
              className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded whitespace-nowrap"
            >
              📷 لقطة كاميرا
            </button>
            <button
              type="button"
              id="recCaptionBtn"
              onClick={() => setCaptionInputOpen((v) => !v)}
              className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded whitespace-nowrap"
            >
              💬 نص شرح
            </button>
            <button
              type="button"
              id="recZoneBtn"
              onClick={onRecZone}
              className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded whitespace-nowrap"
            >
              🎨 تلوين المحددة
            </button>
            <button
              type="button"
              id="recArrowBtn"
              onClick={onRecArrow}
              className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded whitespace-nowrap"
            >
              ↗ رسم سهم
            </button>
            <button
              type="button"
              id="recPulseBtn"
              onClick={onRecPulse}
              className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded whitespace-nowrap"
            >
              📡 نبضة تنبيه
            </button>
            <button
              type="button"
              id="recDelUnitBtn"
              onClick={onRecDeleteUnit}
              disabled={!selectedEntityId}
              className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-100 border border-slate-700 rounded whitespace-nowrap"
            >
              🗑 حذف المحددة
            </button>
          </div>

          {captionInputOpen && (
            <form onSubmit={handleCaptionSubmit} className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                id="recCaptionInput"
                value={captionDraft}
                onChange={(e) => setCaptionDraft(e.target.value)}
                placeholder="اكتب نص الشرح ليظهر بالأسفل..."
                aria-label="نص الشرح المسجل"
                className="flex-1 min-w-0 bg-slate-900 text-slate-100 border border-slate-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-sky-400"
              />
              <button
                type="submit"
                id="recCaptionConfirmBtn"
                className="px-2.5 py-1 text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white rounded shrink-0"
              >
                إضافة
              </button>
            </form>
          )}
        </>
      )}

      {/* Inline Save Title Form (for recorded or code scenarios) */}
      {pendingSaveMode && (
        <div id="saveScenarioDialog" className="bg-slate-900 border border-sky-500/60 rounded-md p-2 space-y-1.5">
          <label htmlFor="saveTitleInput" className="block text-[11px] text-sky-300 font-medium">
            {pendingSaveMode === 'recorded' ? 'اسم السيناريو المسجّل لحفظه في السجل:' : 'اسم السيناريو لحفظه في قاعدة البيانات:'}
          </label>
          <input
            type="text"
            id="saveTitleInput"
            value={saveDraftTitle}
            onChange={(e) => onChangeSaveDraftTitle(e.target.value)}
            className="w-full bg-slate-950 text-slate-100 border border-slate-700 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-sky-400"
          />
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              id="confirmSaveScenarioBtn"
              onClick={onConfirmSaveScenario}
              className="flex-1 px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded"
            >
              حفظ وإعادة تشغيل
            </button>
            <button
              type="button"
              id="cancelSaveScenarioBtn"
              onClick={onCancelSaveScenario}
              className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
