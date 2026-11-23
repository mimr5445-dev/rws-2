import React, { useRef } from 'react';
import {
  CheckCircle2,
  ClipboardCopy,
  FileUp,
  ImagePlus,
  Pause,
  Play,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Video,
  Volume2,
  VolumeX
} from 'lucide-react';
import { MapPack, SavedScenarioRecord, ValidationIssue } from '../../core/types';

interface SidebarPlaybackYamlSectionProps {
  maps: Record<string, MapPack>;
  scenarios: SavedScenarioRecord[];
  selectedScenarioId: string;
  onSelectScenarioId: (id: string) => void;
  onLoadSelectedScenario: () => void;
  onDeleteSelectedScenario: () => void;
  playing: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  speed: number;
  onChangeSpeed: (speed: number) => void;
  muted: boolean;
  onToggleMute: () => void;
  recording: boolean;
  onToggleRecord: () => void;
  aiTopic: string;
  onChangeAiTopic: (val: string) => void;
  onCopyAiPrompt: () => void;
  onCopyCatalog: () => void;
  yamlText: string;
  onChangeYaml: (val: string) => void;
  onApplyYaml: () => void;
  onRequestSaveYaml: () => void;
  onUploadYamlFile: (file: File) => void;
  onUploadMapImage: (file: File) => void;
  issues: ValidationIssue[];
  yamlSyntaxError: string | null;
  statusNotice: string | null;
}

export function SidebarPlaybackYamlSection({
  maps,
  scenarios,
  selectedScenarioId,
  onSelectScenarioId,
  onLoadSelectedScenario,
  onDeleteSelectedScenario,
  playing,
  onTogglePlay,
  onRestart,
  speed,
  onChangeSpeed,
  muted,
  onToggleMute,
  recording,
  onToggleRecord,
  aiTopic,
  onChangeAiTopic,
  onCopyAiPrompt,
  onCopyCatalog,
  yamlText,
  onChangeYaml,
  onApplyYaml,
  onRequestSaveYaml,
  onUploadYamlFile,
  onUploadMapImage,
  issues,
  yamlSyntaxError,
  statusNotice
}: SidebarPlaybackYamlSectionProps) {
  const yamlInputRef = useRef<HTMLInputElement>(null);
  const mapInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, handler: (f: File) => void) => {
    const file = e.target.files?.[0];
    if (file) handler(file);
    e.target.value = '';
  };

  return (
    <>
      {/* 4. Saved Scenarios Registry (IndexedDB) + Playback Controls */}
      <section aria-label="سجل السيناريوهات والتحكم" className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 space-y-2">
        <span className="block text-[11px] font-medium text-slate-400">سجل السيناريوهات المحفوظة (IndexedDB):</span>
        <div className="flex items-center gap-1.5">
          <select
            id="scenarioSelect"
            aria-label="سجل السيناريوهات المحفوظة"
            value={selectedScenarioId}
            onChange={(e) => onSelectScenarioId(e.target.value)}
            className="flex-1 min-w-0 bg-slate-900 text-slate-100 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-sky-400"
          >
            {scenarios.map((s) => {
              const tag = s.source === 'recorded' ? '[مسجّل] ' : s.source === 'code' ? '[محفوظ] ' : '';
              const mapTitle = maps[s.mapId]?.title ?? s.mapId;
              return (
                <option key={s.id} value={s.id}>
                  {`${tag}${s.title} (${mapTitle})`}
                </option>
              );
            })}
          </select>
          <button
            type="button"
            id="loadScenarioBtn"
            onClick={onLoadSelectedScenario}
            className="px-2.5 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white border border-sky-400 rounded-md whitespace-nowrap shrink-0"
          >
            تشغيل
          </button>
          <button
            type="button"
            id="delScenarioBtn"
            aria-label="حذف السيناريو المحدد"
            title="حذف السيناريو المحدد"
            onClick={onDeleteSelectedScenario}
            disabled={!selectedScenarioId}
            className="p-1.5 text-xs bg-slate-800 hover:bg-red-900/70 disabled:opacity-40 text-slate-300 hover:text-red-200 border border-slate-700 rounded-md shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            id="playBtn"
            onClick={onTogglePlay}
            className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 transition-colors ${
              playing
                ? 'bg-sky-600 border-sky-400 text-white hover:bg-sky-500'
                : 'bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700'
            }`}
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{playing ? 'إيقاف مؤقت' : 'تشغيل'}</span>
          </button>

          <button
            type="button"
            id="restartBtn"
            onClick={onRestart}
            className="inline-flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-md whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة</span>
          </button>

          <select
            id="speedSelect"
            aria-label="سرعة المحاكاة"
            value={String(speed)}
            onChange={(e) => onChangeSpeed(parseFloat(e.target.value))}
            className="bg-slate-800 text-slate-100 border border-slate-700 rounded-md px-2 py-1 text-xs font-mono tabular-nums focus:outline-none focus:border-sky-400"
          >
            <option value="0.5">0.5x</option>
            <option value="1">1x</option>
            <option value="2">2x</option>
          </select>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'تفعيل الصوت' : 'كتم الصوت'}
            title={muted ? 'تفعيل الصوت' : 'كتم الصوت'}
            className="inline-flex items-center justify-center p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md shrink-0"
          >
            {muted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-sky-400" />}
          </button>

          <button
            type="button"
            id="recBtn"
            onClick={onToggleRecord}
            className={`inline-flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 transition-colors ${
              recording
                ? 'bg-red-800 border-red-500 text-white hover:bg-red-700'
                : 'bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>{recording ? 'إيقاف وحفظ' : 'فيديو WebM'}</span>
          </button>
        </div>
      </section>

      {/* 5. AI Prompt & Live YAML Editor */}
      <section aria-label="الذكاء الاصطناعي ومحرر السيناريو" className="flex-1 flex flex-col gap-2 min-h-[210px]">
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2 space-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>تجهيز الذكاء الاصطناعي على هذه الخريطة</span>
          </span>
          <input
            type="text"
            id="aiTopic"
            value={aiTopic}
            onChange={(e) => onChangeAiTopic(e.target.value)}
            placeholder="موضوع السيناريو للذكاء الاصطناعي..."
            aria-label="موضوع السيناريو للذكاء الاصطناعي"
            className="w-full bg-slate-900 text-slate-100 border border-slate-700 rounded-md px-2.5 py-1 text-xs focus:outline-none focus:border-sky-400"
          />
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              id="copyPromptBtn"
              onClick={onCopyAiPrompt}
              className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-md whitespace-nowrap"
            >
              <ClipboardCopy className="w-3 h-3 text-sky-400" />
              <span>نسخ Prompt للـ AI</span>
            </button>
            <button
              type="button"
              id="copyCatalogBtn"
              onClick={onCopyCatalog}
              className="inline-flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md whitespace-nowrap shrink-0"
            >
              <span>نسخ CATALOG.md</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <label htmlFor="yamlEditor" className="text-xs font-medium text-slate-400">
            محرر السيناريو (YAML)
          </label>
          <div className="flex items-center gap-1.5">
            <input
              ref={yamlInputRef}
              type="file"
              accept=".yaml,.yml"
              className="hidden"
              onChange={(e) => handleFileChange(e, onUploadYamlFile)}
            />
            <input
              ref={mapInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, onUploadMapImage)}
            />
            <button
              type="button"
              onClick={() => yamlInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded whitespace-nowrap shrink-0"
            >
              <FileUp className="w-3 h-3" />
              <span>ملف YAML</span>
            </button>
            <button
              type="button"
              onClick={() => mapInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded whitespace-nowrap shrink-0"
            >
              <ImagePlus className="w-3 h-3" />
              <span>صورة خلفية</span>
            </button>
          </div>
        </div>

        <textarea
          id="yamlEditor"
          dir="ltr"
          spellCheck={false}
          value={yamlText}
          onChange={(e) => onChangeYaml(e.target.value)}
          className="w-full flex-1 min-h-[145px] bg-slate-950 text-cyan-200 border border-slate-700 rounded-md p-2.5 font-mono text-xs leading-5 resize-y [direction:ltr] text-left focus:outline-none focus:border-sky-400"
        />

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            id="applyBtn"
            onClick={onApplyYaml}
            className="flex-1 px-3 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white border border-sky-400 rounded-md whitespace-nowrap transition-colors"
          >
            تطبيق الكود
          </button>
          <button
            type="button"
            id="saveYamlBtn"
            onClick={onRequestSaveYaml}
            className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-md whitespace-nowrap transition-colors"
          >
            <Save className="w-3.5 h-3.5 text-emerald-400" />
            <span>حفظ في السجل</span>
          </button>
        </div>

        {statusNotice && issues.length === 0 && !yamlSyntaxError && (
          <span id="statusBox" className="inline-flex items-center gap-1 text-xs text-emerald-400 truncate">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{statusNotice}</span>
          </span>
        )}

        {(yamlSyntaxError || issues.length > 0) && (
          <div
            id="errorBox"
            role="alert"
            className="bg-red-950/85 border border-red-600/80 text-red-200 rounded-md p-2.5 text-xs leading-5 space-y-1.5"
          >
            {yamlSyntaxError && (
              <div className="space-y-1">
                <div className="font-semibold">خطأ في صياغة YAML:</div>
                <pre dir="ltr" className="font-mono text-[11px] whitespace-pre-wrap overflow-x-auto text-red-200/95">
                  {yamlSyntaxError}
                </pre>
              </div>
            )}
            {issues.map((issue, i) => (
              <div key={`${issue.stepIndex}-${issue.field}-${i}`}>
                • [{issue.field}] {issue.message}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
