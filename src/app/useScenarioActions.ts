import React from 'react';
import * as yaml from 'js-yaml';
import { ActionRecorder } from '../core/actionRecorder';
import { MapPack, Point, SavedScenarioRecord, ScenarioFile } from '../core/types';
import { StudioEngine } from '../engine/engine';
import { PackRegistry } from '../packs/packRegistry';
import { StudioRenderer } from '../renderer/studioRenderer';
import { studioDb } from '../storage/studioDb';

export interface ScenarioActionHandlersContext {
  activeMap: MapPack;
  yamlText: string;
  selectedScenarioId: string;
  pendingSaveMode: 'recorded' | 'code' | null;
  saveDraftTitle: string;
  registryRef: React.MutableRefObject<PackRegistry | null>;
  engineRef: React.MutableRefObject<StudioEngine | null>;
  rendererRef: React.MutableRefObject<StudioRenderer | null>;
  actionRecorderRef: React.MutableRefObject<ActionRecorder>;
  pendingActionModeRef: React.MutableRefObject<'none' | 'arrow_start' | 'arrow_end' | 'pulse'>;
  openEmptyMapBoard: (mapId: string, preserveRecording?: boolean) => Promise<void>;
  loadScenario: (rawYaml: string, noticeText?: string | null, savedScenarioId?: string) => Promise<boolean>;
  syncHudFromEngine: (eng: StudioEngine) => void;
  showToast: (msg: string) => void;
  setPlaying: (v: boolean) => void;
  setYamlText: (v: string) => void;
  setPendingSaveMode: (v: 'recorded' | 'code' | null) => void;
  setActionRecording: (v: boolean) => void;
  setRecStats: (v: { clockSec: number; stepCount: number }) => void;
  setSaveDraftTitle: (v: string) => void;
  setSelectedScenarioId: (v: string) => void;
  setPackVersion: React.Dispatch<React.SetStateAction<number>>;
  setStatusNotice: (v: string | null) => void;
}

export function createScenarioActionHandlers(ctx: ScenarioActionHandlersContext) {
  const handleStartActionRecord = async () => {
    const eng = ctx.engineRef.current;
    const renderer = ctx.rendererRef.current;
    if (!eng || !renderer) return;
    await ctx.openEmptyMapBoard(eng.map.id, true);
    ctx.setPlaying(true);
    ctx.actionRecorderRef.current.start(eng.map.id, renderer.getCameraState());
    ctx.setPendingSaveMode(null);
    ctx.setActionRecording(true);
    ctx.setRecStats({ clockSec: 0, stepCount: ctx.actionRecorderRef.current.steps.length });
  };

  const handleRequestStopActionRecord = () => {
    ctx.actionRecorderRef.current.stop();
    ctx.setActionRecording(false);
    ctx.pendingActionModeRef.current = 'none';
    ctx.setSaveDraftTitle(`سيناريو مسجّل (${ctx.activeMap.title})`);
    ctx.setPendingSaveMode('recorded');
  };

  const handleRequestSaveYaml = async () => {
    const ok = await ctx.loadScenario(ctx.yamlText);
    if (!ok) return;
    const parsed = yaml.load(ctx.yamlText) as ScenarioFile;
    ctx.setSaveDraftTitle(parsed?.meta?.title || `سيناريو (${ctx.activeMap.title})`);
    ctx.setPendingSaveMode('code');
  };

  const handleConfirmSaveScenario = async () => {
    const reg = ctx.registryRef.current!;
    const title = ctx.saveDraftTitle.trim() || `سيناريو (${ctx.activeMap.title})`;
    if (ctx.pendingSaveMode === 'recorded') {
      const generatedYaml = ctx.actionRecorderRef.current.toYaml(title);
      ctx.setYamlText(generatedYaml);
      const rec: SavedScenarioRecord = {
        id: `rec_${Date.now()}`,
        title,
        mapId: ctx.actionRecorderRef.current.mapId || ctx.activeMap.id,
        yaml: generatedYaml,
        source: 'recorded',
        updatedAt: Date.now()
      };
      await reg.saveScenarioRecord(rec);
      ctx.setSelectedScenarioId(rec.id);
      ctx.setPackVersion((v) => v + 1);
      ctx.setPendingSaveMode(null);
      ctx.setPlaying(true);
      await ctx.loadScenario(generatedYaml, `تم حفظ "${title}" (${ctx.actionRecorderRef.current.steps.length} خطوة)`, rec.id);
    } else if (ctx.pendingSaveMode === 'code') {
      const parsed = yaml.load(ctx.yamlText) as ScenarioFile;
      const rec: SavedScenarioRecord = {
        id: `scen_${Date.now()}`,
        title,
        mapId: parsed?.meta?.map ?? ctx.activeMap.id,
        yaml: ctx.yamlText,
        source: 'code',
        updatedAt: Date.now()
      };
      await reg.saveScenarioRecord(rec);
      ctx.setSelectedScenarioId(rec.id);
      ctx.setPackVersion((v) => v + 1);
      ctx.setPendingSaveMode(null);
      await studioDb.setSetting('lastScenarioId', rec.id);
      ctx.setStatusNotice(`تم حفظ "${title}"`);
    }
  };

  const handleLoadSelectedScenario = async () => {
    const rec = ctx.registryRef.current!.scenarios.find((s) => s.id === ctx.selectedScenarioId);
    if (!rec) return;
    ctx.setYamlText(rec.yaml);
    ctx.setPlaying(true);
    await ctx.loadScenario(rec.yaml, `تم تشغيل "${rec.title}"`, rec.id);
  };

  const handleDeleteSelectedScenario = async () => {
    if (!ctx.selectedScenarioId) return;
    const deletedId = ctx.selectedScenarioId;
    const reg = ctx.registryRef.current!;
    await reg.deleteScenarioRecord(deletedId);
    ctx.setPackVersion((v) => v + 1);
    const nextId = reg.scenarios[0]?.id ?? '';
    ctx.setSelectedScenarioId(nextId);
    const storedLastId = await studioDb.getSetting<string>('lastScenarioId');
    if (storedLastId === deletedId) {
      await studioDb.setSetting('lastScenarioId', nextId);
    }
    ctx.setStatusNotice('تم حذف السيناريو');
  };

  const handleRecCamera = () => {
    const renderer = ctx.rendererRef.current;
    if (!renderer) return;
    const c = renderer.getCameraState();
    ctx.actionRecorderRef.current.recordCamera(c.x, c.y, c.zoom);
    ctx.showToast('📷 تم تسجيل لقطة الكاميرا');
  };

  const handleRecCaptionSubmit = (text: string) => {
    if (!ctx.engineRef.current) return;
    ctx.engineRef.current.caption = text;
    ctx.actionRecorderRef.current.recordCaption(text);
    ctx.syncHudFromEngine(ctx.engineRef.current);
  };

  const handleRecArrow = () => {
    ctx.pendingActionModeRef.current = 'arrow_start';
    ctx.showToast('اضغط نقطة بداية السهم ثم نقطة نهايته');
  };

  const handleRecPulse = () => {
    ctx.pendingActionModeRef.current = 'pulse';
    ctx.showToast('اضغط على الخريطة لوضع موجة تنبيه');
  };

  return {
    handleStartActionRecord,
    handleRequestStopActionRecord,
    handleRequestSaveYaml,
    handleConfirmSaveScenario,
    handleLoadSelectedScenario,
    handleDeleteSelectedScenario,
    handleRecCamera,
    handleRecCaptionSubmit,
    handleRecArrow,
    handleRecPulse
  };
}
