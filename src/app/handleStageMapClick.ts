import React from 'react';
import { ActionRecorder } from '../core/actionRecorder';
import { StrikeLockPhase, computeLockedStrikeRadius } from '../core/targetingLock';
import { Faction, Point } from '../core/types';
import { StudioEngine } from '../engine/engine';
import { isPointNearWalkable } from '../engine/pathfinding';
import { PackRegistry } from '../packs/packRegistry';
import { StudioRenderer } from '../renderer/studioRenderer';
import { ArmedAbilityState } from './studioAppTypes';

export interface StageMapClickContext {
  pt: Point;
  hitId: string | null;
  shiftKey: boolean;
  lockPhase: StrikeLockPhase;
  eng: StudioEngine;
  reg: PackRegistry;
  rec: ActionRecorder;
  renderer: StudioRenderer;
  pendingActionModeRef: React.MutableRefObject<'none' | 'arrow_start' | 'arrow_end' | 'pulse'>;
  arrowStartPtRef: React.MutableRefObject<Point | null>;
  armedAbilityRef: React.MutableRefObject<ArmedAbilityState | null>;
  activeToolRef: React.MutableRefObject<string>;
  sandboxFactionRef: React.MutableRefObject<Faction>;
  sandboxCounterRef: React.MutableRefObject<number>;
  toolScalesRef: React.MutableRefObject<Record<string, number>>;
  setArmedAbility: (v: ArmedAbilityState | null) => void;
  setStrikeLockPhase: (p: StrikeLockPhase) => void;
  setSelectedEntityId: (id: string | null) => void;
  setSelectedEntityScale: (s: number) => void;
  setSelectedRegionId: (id: string | null) => void;
  setActiveTool: (tool: string) => void;
  showToast: (msg: string) => void;
  syncHudFromEngine: (eng: StudioEngine) => void;
}

export function handleStageMapClick(ctx: StageMapClickContext): void {
  const {
    pt,
    hitId,
    shiftKey,
    lockPhase,
    eng,
    reg,
    rec,
    renderer,
    pendingActionModeRef,
    arrowStartPtRef,
    armedAbilityRef,
    activeToolRef,
    sandboxFactionRef,
    sandboxCounterRef,
    toolScalesRef,
    setArmedAbility,
    setStrikeLockPhase,
    setSelectedEntityId,
    setSelectedEntityScale,
    setSelectedRegionId,
    setActiveTool,
    showToast,
    syncHudFromEngine
  } = ctx;

  // 1. وضع التسجيل اليدوي للأسهم أو الموجات
  if (pendingActionModeRef.current === 'arrow_start') {
    arrowStartPtRef.current = pt;
    pendingActionModeRef.current = 'arrow_end';
    showToast('اضغط نقطة نهاية السهم على الخريطة');
    return;
  }
  if (pendingActionModeRef.current === 'arrow_end' && arrowStartPtRef.current) {
    const id = `arr_${Date.now()}`;
    eng.arrows.set(id, {
      id,
      from: arrowStartPtRef.current,
      to: pt,
      color: '#f59e0b',
      dashed: true,
      progress: 0,
      prevProgress: 0,
      rate: 0.8
    });
    rec.recordArrow(id, arrowStartPtRef.current, pt, '#f59e0b', true);
    pendingActionModeRef.current = 'none';
    arrowStartPtRef.current = null;
    return;
  }
  if (pendingActionModeRef.current === 'pulse') {
    eng.pulses.push({ x: pt.x, y: pt.y, color: '#ef4444', maxRadius: 70, progress: 0, prevProgress: 0 });
    rec.recordPulse(pt, '#ef4444');
    pendingActionModeRef.current = 'none';
    return;
  }

  // 2. وضع الإطلاق المستمر المسلّح لآلية محددة
  const armed = armedAbilityRef.current;
  if (armed) {
    const attacker = eng.entities.get(armed.entityId);
    if (!attacker) {
      armedAbilityRef.current = null;
      renderer.strikeModeConfig = null;
      setArmedAbility(null);
      setStrikeLockPhase('idle');
    } else {
      const strikeRadius = computeLockedStrikeRadius(armed.radius, lockPhase);
      const strikeColor = lockPhase === 'locked' ? '#ff1e42' : armed.color;
      eng.dispatchOrder({
        type: 'strike',
        attackerId: attacker.id,
        mode: armed.mode,
        to: pt,
        radius: strikeRadius,
        color: strikeColor,
        faction: attacker.faction
      });
      eng.flushOrders();
      rec.recordStrike(armed.mode, pt, attacker.id, undefined, strikeRadius, strikeColor);
      setStrikeLockPhase('idle');
      syncHudFromEngine(eng);
      return;
    }
  }

  // 3. اختصار Shift+Click لإطلاق قدرة الوحدة المحددة بسرعة
  if (shiftKey && renderer.selectedEntityId) {
    const selected = eng.entities.get(renderer.selectedEntityId);
    const actor = selected ? reg.actors[selected.actorId] : undefined;
    if (selected && actor?.ability) {
      eng.dispatchOrder({
        type: 'strike',
        attackerId: selected.id,
        mode: actor.ability.mode,
        to: pt,
        radius: actor.ability.radius,
        color: actor.ability.accentColor,
        faction: selected.faction
      });
      eng.flushOrders();
      rec.recordStrike(
        actor.ability.mode,
        pt,
        selected.id,
        undefined,
        actor.ability.radius,
        actor.ability.accentColor
      );
      syncHudFromEngine(eng);
      return;
    }
  }

  // 4. أداة التحديد/التحريك أو إنزال آلية/منشأة
  const tool = activeToolRef.current;
  if (tool === 'select') {
    if (hitId) {
      renderer.selectedEntityId = hitId;
      setSelectedEntityId(hitId);
      setSelectedEntityScale(eng.entities.get(hitId)?.scaleMul ?? 1.0);
    } else if (renderer.selectedEntityId) {
      const sel = eng.entities.get(renderer.selectedEntityId);
      if (sel && sel.kind !== 'building') {
        eng.dispatchOrder({ type: 'move', entityId: renderer.selectedEntityId, to: pt });
        eng.flushOrders();
        rec.recordMove(renderer.selectedEntityId, pt);
        syncHudFromEngine(eng);
      } else {
        renderer.selectedEntityId = null;
        setSelectedEntityId(null);
      }
    } else {
      const regionHit = eng.map.hitTest?.(pt) ?? null;
      renderer.selectedRegionId = regionHit;
      setSelectedRegionId(regionHit);
    }
  } else {
    const actor = reg.actors[tool];
    if (!actor) return;
    if (!isPointNearWalkable(eng.map, pt, actor.domain, 2)) {
      showToast(
        actor.domain === 'land'
          ? '⚠️ لا يمكن وضع أو بناء وحدة برية في وسط البحر!'
          : '⚠️ لا يمكن وضع وحدة بحرية فوق اليابسة!'
      );
      return;
    }
    const id = `sb_${sandboxCounterRef.current++}`;
    const faction = sandboxFactionRef.current;
    const spawnScale = toolScalesRef.current[actor.id] ?? 1.0;
    if (actor.kind === 'building') {
      eng.dispatchOrder({ type: 'construct', id, actorId: actor.id, at: pt, faction, durationSec: 1.5, scale: spawnScale });
      rec.recordConstruct(id, actor.id, pt, faction, 1.5, spawnScale);
      renderer.selectedEntityId = id;
      setSelectedEntityId(id);
      setSelectedEntityScale(spawnScale);
      setActiveTool('select');
    } else {
      eng.dispatchOrder({ type: 'spawn', id, actorId: actor.id, at: pt, faction, scale: spawnScale });
      rec.recordSpawn(id, actor.id, pt, faction, spawnScale);
      renderer.selectedEntityId = id;
      setSelectedEntityId(id);
      setSelectedEntityScale(spawnScale);
      setActiveTool('select');
    }
    eng.flushOrders();
    syncHudFromEngine(eng);
  }
}
