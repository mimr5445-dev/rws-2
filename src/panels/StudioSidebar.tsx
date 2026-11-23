import React from 'react';
import { BookOpen, Map as MapIcon } from 'lucide-react';
import { ActorPack, Faction, MapPack, SavedScenarioRecord, ValidationIssue } from '../core/types';
import { MapEditTool, PackBuilderPanel } from './PackBuilderPanel';
import { SidebarPlaybackYamlSection } from './sidebar/SidebarPlaybackYamlSection';
import { SidebarRecorderSection } from './sidebar/SidebarRecorderSection';
import { SidebarSandboxSection } from './sidebar/SidebarSandboxSection';

interface StudioSidebarProps {
  activeTab: 'play' | 'pack';
  onChangeTab: (tab: 'play' | 'pack') => void;
  maps: Record<string, MapPack>;
  activeMapId: string;
  onSelectEnvironmentMap: (mapId: string) => void;
  onClearBoard: () => void;
  unitScale: number;
  onChangeUnitScale: (scale: number) => void;
  actionRecording: boolean;
  recClockSec: number;
  recStepCount: number;
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
  onOpenSpec: () => void;
  onSelectActiveMapForBuilder: (mapId: string) => void;
  newMapId: string;
  onChangeNewMapId: (val: string) => void;
  onUploadNewMapImage: (file: File) => void;
  mapTool: MapEditTool;
  onSelectMapTool: (tool: MapEditTool) => void;
  pointName: string;
  onChangePointName: (val: string) => void;
  draftZoneCount: number;
  onFinishZone: () => void;
  onClearDraftZone: () => void;
  onSaveCurrentMap: () => void;
  onCreateStarterScenario: () => void;
  newActorId: string;
  onChangeNewActorId: (val: string) => void;
  newActorLabel: string;
  onChangeNewActorLabel: (val: string) => void;
  newActorTpl: string;
  onChangeNewActorTpl: (val: string) => void;
  hasPendingActorImage: boolean;
  onUploadActorImage: (file: File) => void;
  onSaveCustomActor: () => void;
  onExportPack: () => void;
  onImportPackFile: (file: File) => void;
  packNotice: { kind: 'ok' | 'err'; text: string } | null;
}

export function StudioSidebar(props: StudioSidebarProps) {
  const { activeTab, onChangeTab, maps, activeMapId, onSelectEnvironmentMap, onClearBoard, unitScale, onChangeUnitScale, onOpenSpec } = props;

  return (
    <aside
      aria-label="لوحة التحكم وصانع الحزم"
      className="bg-slate-900 border-b lg:border-b-0 lg:border-l border-slate-800 p-3.5 flex flex-col gap-2.5 overflow-y-auto max-h-[48vh] lg:max-h-screen lg:h-screen"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <h1 className="text-base font-bold text-sky-400 tracking-wide whitespace-nowrap truncate">
          استوديو السيناريوهات التفاعلي
        </h1>
        <button
          type="button"
          onClick={onOpenSpec}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          <BookOpen className="w-3.5 h-3.5 text-sky-400" />
          <span>دليل YAML</span>
        </button>
      </div>

      {/* Mode Tabs */}
      <div role="tablist" aria-label="أقسام الاستوديو" className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 shrink-0">
        <button
          type="button"
          role="tab"
          id="tabPlay"
          aria-selected={activeTab === 'play'}
          onClick={() => onChangeTab('play')}
          className={`px-2.5 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
            activeTab === 'play' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          البيئة والسيناريو
        </button>
        <button
          type="button"
          role="tab"
          id="tabPack"
          aria-selected={activeTab === 'pack'}
          onClick={() => onChangeTab('pack')}
          className={`px-2.5 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
            activeTab === 'pack' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          صانع الحزم (خرائط/كيانات)
        </button>
      </div>

      {activeTab === 'play' ? (
        <div id="viewPlay" className="flex flex-col gap-2.5 flex-1 min-h-0">
          {/* 1. Independent Map Environment & Adaptive Scale */}
          <section aria-label="البيئة والخريطة الحالية" className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                <MapIcon className="w-3.5 h-3.5 text-sky-400" />
                <span>البيئة / الخريطة الحالية (مستقلة):</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <select
                id="mapSelect"
                aria-label="اختيار البيئة أو الخريطة"
                value={activeMapId}
                onChange={(e) => onSelectEnvironmentMap(e.target.value)}
                className="flex-1 min-w-0 bg-slate-900 text-slate-100 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-sky-400"
              >
                {Object.values(maps).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                id="clearBoardBtn"
                onClick={onClearBoard}
                title="تفريغ الخريطة للعب أو التسجيل الحر"
                className="px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-md whitespace-nowrap shrink-0"
              >
                لوح فارغ
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs pt-0.5">
              <label htmlFor="unitScaleSlider" className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                الحجم العام للآليات:
              </label>
              <input
                id="unitScaleSlider"
                type="range"
                min="0.3"
                max="2.0"
                step="0.05"
                value={unitScale}
                onChange={(e) => onChangeUnitScale(parseFloat(e.target.value))}
                className="flex-1 accent-sky-400 cursor-pointer"
              />
              <span id="unitScaleVal" dir="ltr" className="font-mono tabular-nums text-[11px] text-sky-300 w-10 text-left shrink-0">
                {unitScale.toFixed(2)}x
              </span>
            </div>
          </section>

          <SidebarRecorderSection
            actionRecording={props.actionRecording}
            recClockSec={props.recClockSec}
            recStepCount={props.recStepCount}
            selectedEntityId={props.selectedEntityId}
            onStartActionRecord={props.onStartActionRecord}
            onRequestStopActionRecord={props.onRequestStopActionRecord}
            onRecCamera={props.onRecCamera}
            onRecCaptionSubmit={props.onRecCaptionSubmit}
            onRecZone={props.onRecZone}
            onRecArrow={props.onRecArrow}
            onRecPulse={props.onRecPulse}
            onRecDeleteUnit={props.onRecDeleteUnit}
            pendingSaveMode={props.pendingSaveMode}
            saveDraftTitle={props.saveDraftTitle}
            onChangeSaveDraftTitle={props.onChangeSaveDraftTitle}
            onConfirmSaveScenario={props.onConfirmSaveScenario}
            onCancelSaveScenario={props.onCancelSaveScenario}
          />

          <SidebarSandboxSection
            actors={props.actors}
            activeTool={props.activeTool}
            onSelectTool={props.onSelectTool}
            strikeMode={props.strikeMode}
            onSelectStrikeMode={props.onSelectStrikeMode}
            sandboxFaction={props.sandboxFaction}
            onSelectFaction={props.onSelectFaction}
            selectedEntityId={props.selectedEntityId}
            selectedEntityLabel={props.selectedEntityLabel}
            selectedEntityScale={props.selectedEntityScale}
            onChangeSelectedEntityScale={props.onChangeSelectedEntityScale}
            activeToolScale={props.activeToolScale}
            onChangeActiveToolScale={props.onChangeActiveToolScale}
          />

          <SidebarPlaybackYamlSection
            maps={props.maps}
            scenarios={props.scenarios}
            selectedScenarioId={props.selectedScenarioId}
            onSelectScenarioId={props.onSelectScenarioId}
            onLoadSelectedScenario={props.onLoadSelectedScenario}
            onDeleteSelectedScenario={props.onDeleteSelectedScenario}
            playing={props.playing}
            onTogglePlay={props.onTogglePlay}
            onRestart={props.onRestart}
            speed={props.speed}
            onChangeSpeed={props.onChangeSpeed}
            muted={props.muted}
            onToggleMute={props.onToggleMute}
            recording={props.recording}
            onToggleRecord={props.onToggleRecord}
            aiTopic={props.aiTopic}
            onChangeAiTopic={props.onChangeAiTopic}
            onCopyAiPrompt={props.onCopyAiPrompt}
            onCopyCatalog={props.onCopyCatalog}
            yamlText={props.yamlText}
            onChangeYaml={props.onChangeYaml}
            onApplyYaml={props.onApplyYaml}
            onRequestSaveYaml={props.onRequestSaveYaml}
            onUploadYamlFile={props.onUploadYamlFile}
            onUploadMapImage={props.onUploadMapImage}
            issues={props.issues}
            yamlSyntaxError={props.yamlSyntaxError}
            statusNotice={props.statusNotice}
          />
        </div>
      ) : (
        <PackBuilderPanel
          maps={props.maps}
          activeMapId={props.activeMapId}
          onSelectActiveMap={props.onSelectActiveMapForBuilder}
          newMapId={props.newMapId}
          onChangeNewMapId={props.onChangeNewMapId}
          onUploadNewMapImage={props.onUploadNewMapImage}
          mapTool={props.mapTool}
          onSelectMapTool={props.onSelectMapTool}
          pointName={props.pointName}
          onChangePointName={props.onChangePointName}
          draftZoneCount={props.draftZoneCount}
          onFinishZone={props.onFinishZone}
          onClearDraftZone={props.onClearDraftZone}
          onSaveCurrentMap={props.onSaveCurrentMap}
          onCreateStarterScenario={props.onCreateStarterScenario}
          newActorId={props.newActorId}
          onChangeNewActorId={props.onChangeNewActorId}
          newActorLabel={props.newActorLabel}
          onChangeNewActorLabel={props.onChangeNewActorLabel}
          newActorTpl={props.newActorTpl}
          onChangeNewActorTpl={props.onChangeNewActorTpl}
          hasPendingActorImage={props.hasPendingActorImage}
          onUploadActorImage={props.onUploadActorImage}
          onSaveCustomActor={props.onSaveCustomActor}
          onExportPack={props.onExportPack}
          onImportPackFile={props.onImportPackFile}
          packNotice={props.packNotice}
        />
      )}
    </aside>
  );
}
