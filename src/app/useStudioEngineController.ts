import React, { useCallback, useEffect } from 'react';
import * as yaml from 'js-yaml';
import { ActionRecorder } from '../core/actionRecorder';
import { computeFrameDt, stepFixedAccumulator } from '../core/cameraTransform';
import { CinematicFocusKind } from '../core/cinematicDirector';
import { StrikeLockPhase } from '../core/targetingLock';
import { Faction, MapPack, Point, ScenarioFile, ValidationIssue } from '../core/types';
import { CountryRegistry } from '../countries/countryRegistry';
import { buildRegionColorMap } from '../countries/countrySelection';
import { DT, StudioEngine, TICK_RATE } from '../engine/engine';
import { buildCountryProvincesMapPack } from '../maps/worldGeoEngine';
import { WORLD_CLASSIC_MAP_ID, WORLD_PACIFIC_MAP_ID, WORLD_SHADED_RELIEF_MAP_ID } from '../maps/worldMapIds';
import { PackRegistry } from '../packs/packRegistry';
import { SoundSynth } from '../renderer/soundSynth';
import { getBundledSoundBank } from '../content/bundledSounds';
import { StudioRenderer } from '../renderer/studioRenderer';
import { studioDb } from '../storage/studioDb';
import { validateScenario, formatYamlSyntaxErrorAr } from '../validation/validator';
import { handleStageMapClick } from './handleStageMapClick';
import { ArmedAbilityState, StudioHudState } from './studioAppTypes';

export interface StudioEngineControllerInput {
  stageHostRef: React.RefObject<HTMLDivElement | null>;
  registryRef: React.MutableRefObject<PackRegistry | null>;
  countryRegistryRef: React.MutableRefObject<CountryRegistry | null>;
  rendererRef: React.MutableRefObject<StudioRenderer | null>;
  engineRef: React.MutableRefObject<StudioEngine | null>;
  soundRef: React.MutableRefObject<SoundSynth | null>;
  recorderRef: React.MutableRefObject<MediaRecorder | null>;
  actionRecorderRef: React.MutableRefObject<ActionRecorder>;
  playingRef: React.MutableRefObject<boolean>;
  speedRef: React.MutableRefObject<number>;
  activeToolRef: React.MutableRefObject<string>;
  sandboxFactionRef: React.MutableRefObject<Faction>;
  sandboxCounterRef: React.MutableRefObject<number>;
  toolScalesRef: React.MutableRefObject<Record<string, number>>;
  armedAbilityRef: React.MutableRefObject<ArmedAbilityState | null>;
  pendingActionModeRef: React.MutableRefObject<'none' | 'arrow_start' | 'arrow_end' | 'pulse'>;
  arrowStartPtRef: React.MutableRefObject<Point | null>;
  toastTimerRef: React.MutableRefObject<number | null>;
  accumulatorRef: React.MutableRefObject<number>;
  lastAlphaRef: React.MutableRefObject<number>;
  showToast: (msg: string) => void;
  syncHudFromEngine: (eng: StudioEngine) => void;
  setPackVersion: React.Dispatch<React.SetStateAction<number>>;
  setSelectedScenarioId: (id: string) => void;
  setYamlText: (v: string) => void;
  setPlaying: (v: boolean) => void;
  setUnitScale: (v: number) => void;
  setCinematicCamera: (v: boolean) => void;
  setVideoFps: (v: 30 | 60 | 120) => void;
  setActiveTool: (v: string) => void;
  setSelectedEntityId: (v: string | null) => void;
  setSelectedEntityScale: (v: number) => void;
  setArmedAbility: (v: ArmedAbilityState | null) => void;
  setStrikeLockPhase: (v: StrikeLockPhase) => void;
  setIssues: (v: ValidationIssue[]) => void;
  setYamlSyntaxError: (v: string | null) => void;
  setStatusNotice: (v: string | null) => void;
  setCinematicFocus: (v: { kind: CinematicFocusKind; labelAr: string }) => void;
  setCameraAngles: (v: { bearingDeg: number; tiltDeg: number }) => void;
  setActiveMap: (v: MapPack) => void;
  setSelectedRegionId: (v: string | null) => void;
  setGeoLoadingMsg: (v: string | null) => void;
  setActionRecording: (v: boolean) => void;
  setRecStats: (v: { clockSec: number; stepCount: number }) => void;
  setHudState: (v: StudioHudState) => void;
}

export function useStudioEngineController(input: StudioEngineControllerInput) {
  const {
    stageHostRef,
    registryRef,
    countryRegistryRef,
    rendererRef,
    engineRef,
    soundRef,
    recorderRef,
    actionRecorderRef,
    playingRef,
    speedRef,
    activeToolRef,
    sandboxFactionRef,
    sandboxCounterRef,
    toolScalesRef,
    armedAbilityRef,
    pendingActionModeRef,
    arrowStartPtRef,
    toastTimerRef,
    accumulatorRef,
    lastAlphaRef,
    showToast,
    syncHudFromEngine,
    setPackVersion,
    setSelectedScenarioId,
    setYamlText,
    setPlaying,
    setUnitScale,
    setCinematicCamera,
    setVideoFps,
    setActiveTool,
    setSelectedEntityId,
    setSelectedEntityScale,
    setArmedAbility,
    setStrikeLockPhase,
    setIssues,
    setYamlSyntaxError,
    setStatusNotice,
    setCinematicFocus,
    setCameraAngles,
    setActiveMap,
    setSelectedRegionId,
    setGeoLoadingMsg,
    setActionRecording,
    setRecStats,
    setHudState
  } = input;

  const attachEngineListeners = useCallback(
    (eng: StudioEngine) => {
      if (soundRef.current) {
        soundRef.current.setBundledSounds(getBundledSoundBank());
        eng.onSound((id) => soundRef.current?.play(id));
      }
      eng.onMoveBlocked((ent) => {
        showToast(
          ent.domain === 'land'
            ? '⚠️ لا يوجد مسار بري متصل — الدبابات والمشاة لا تعبر البحر!'
            : '⚠️ لا يوجد مسار بحري متصل — السفن لا تعبر اليابسة!'
        );
      });
    },
    [showToast, soundRef]
  );

  const cancelActiveActionRecording = useCallback(() => {
    if (actionRecorderRef.current.isRecording) {
      actionRecorderRef.current.stop();
      setActionRecording(false);
    }
    pendingActionModeRef.current = 'none';
    arrowStartPtRef.current = null;
  }, [actionRecorderRef, arrowStartPtRef, pendingActionModeRef, setActionRecording]);

  const openEmptyMapBoard = useCallback(
    async (mapId: string, preserveRecording = false) => {
      const reg = registryRef.current!;
      const map =
        reg.maps[mapId] ??
        reg.maps[WORLD_SHADED_RELIEF_MAP_ID] ??
        reg.maps[WORLD_PACIFIC_MAP_ID] ??
        reg.maps[WORLD_CLASSIC_MAP_ID];
      if (!map) return;

      if (!preserveRecording) cancelActiveActionRecording();
      setIssues([]);
      setYamlSyntaxError(null);
      setStatusNotice(null);
      armedAbilityRef.current = null;
      setArmedAbility(null);

      const blankScenario: ScenarioFile = {
        meta: { title: map.title, map: map.id },
        timeline: []
      };
      const engine = new StudioEngine(map, reg.actors, blankScenario);
      attachEngineListeners(engine);
      engineRef.current = engine;
      accumulatorRef.current = 0;
      lastAlphaRef.current = 1;
      setActiveMap(map);
      setSelectedEntityId(null);
      setSelectedRegionId(null);
      sandboxCounterRef.current = 1;

      if (rendererRef.current) {
        await rendererRef.current.loadEngineAssets(engine);
        rendererRef.current.setCountryColorMap(buildRegionColorMap(map, countryRegistryRef.current!));
      }

      syncHudFromEngine(engine);
      await studioDb.setSetting('lastMapId', map.id);
      await studioDb.setSetting('lastScenarioId', '');
    },
    [
      accumulatorRef,
      armedAbilityRef,
      attachEngineListeners,
      cancelActiveActionRecording,
      countryRegistryRef,
      engineRef,
      lastAlphaRef,
      registryRef,
      rendererRef,
      sandboxCounterRef,
      setActiveMap,
      setArmedAbility,
      setIssues,
      setSelectedEntityId,
      setSelectedRegionId,
      setStatusNotice,
      setYamlSyntaxError,
      syncHudFromEngine
    ]
  );

  const loadScenario = useCallback(
    async (rawYaml: string, noticeText: string | null = null, savedScenarioId?: string): Promise<boolean> => {
      const reg = registryRef.current!;
      cancelActiveActionRecording();
      setIssues([]);
      setYamlSyntaxError(null);
      setStatusNotice(null);
      armedAbilityRef.current = null;
      setArmedAbility(null);

      try {
        const parsed = yaml.load(rawYaml) as ScenarioFile;
        const map = reg.maps[parsed?.meta?.map];
        const foundIssues = validateScenario(parsed, map, reg.actors);
        if (foundIssues.length > 0) {
          setPlaying(false);
          setIssues(foundIssues);
          return false;
        }

        const engine = new StudioEngine(map, reg.actors, parsed);
        attachEngineListeners(engine);
        engineRef.current = engine;
        accumulatorRef.current = 0;
        lastAlphaRef.current = 1;
        setActiveMap(map);
        setSelectedEntityId(null);
        setSelectedRegionId(null);

        if (rendererRef.current) {
          await rendererRef.current.loadEngineAssets(engine);
          rendererRef.current.setCountryColorMap(buildRegionColorMap(map, countryRegistryRef.current!));
        }

        syncHudFromEngine(engine);
        await studioDb.setSetting('lastMapId', map.id);
        if (savedScenarioId !== undefined) {
          await studioDb.setSetting('lastScenarioId', savedScenarioId);
        }
        if (noticeText) {
          setStatusNotice(noticeText);
        }
        return true;
      } catch (err) {
        setPlaying(false);
        setYamlSyntaxError(formatYamlSyntaxErrorAr(err));
        return false;
      }
    },
    [
      accumulatorRef,
      armedAbilityRef,
      attachEngineListeners,
      cancelActiveActionRecording,
      countryRegistryRef,
      engineRef,
      lastAlphaRef,
      registryRef,
      rendererRef,
      setActiveMap,
      setArmedAbility,
      setIssues,
      setPlaying,
      setSelectedEntityId,
      setSelectedRegionId,
      setStatusNotice,
      setYamlSyntaxError,
      syncHudFromEngine
    ]
  );

  const enterCountryProvinces = useCallback(
    async (regionId: string) => {
      const eng = engineRef.current;
      const renderer = rendererRef.current;
      const reg = registryRef.current!;
      const regMap = eng?.map.regions?.[regionId];
      if (!eng || !renderer || !regMap?.iso3) return;

      const title = regMap.nameAr ? `${regMap.nameAr} (${regMap.name})` : regMap.name;
      setGeoLoadingMsg(`⏳ جاري تحميل محافظات ${title}...`);
      renderer.focusRegion(eng, regionId);

      try {
        const cachedId = `country_${regMap.iso3.toLowerCase()}`;
        let countryMap = reg.maps[cachedId];
        if (!countryMap) {
          countryMap = await buildCountryProvincesMapPack(regMap.iso3, title);
          await reg.saveCustomMap(countryMap);
        }
        setPackVersion((v) => v + 1);
        setPlaying(true);
        await openEmptyMapBoard(countryMap.id);
        showToast(`خريطة محافظات ${title}`);
      } catch (err) {
        showToast((err as Error).message);
      } finally {
        setGeoLoadingMsg(null);
      }
    },
    [engineRef, openEmptyMapBoard, registryRef, rendererRef, setGeoLoadingMsg, setPackVersion, setPlaying, showToast]
  );

  useEffect(() => {
    const host = stageHostRef.current;
    if (!host) return;

    let cancelled = false;
    let rafId = 0;

    const sound = new SoundSynth();
    soundRef.current = sound;

    const renderer = new StudioRenderer();
    rendererRef.current = renderer;

    renderer.onSelectionChange = (id) => {
      setSelectedEntityId(id);
      const ent = id ? engineRef.current?.entities.get(id) : undefined;
      setSelectedEntityScale(ent?.scaleMul ?? 1.0);
    };
    renderer.onRegionDoubleClick = (id) => {
      if (engineRef.current?.map.geoLevel === 'world') {
        void enterCountryProvinces(id);
      }
    };
    renderer.onStrikeLockChange = (phase) => {
      setStrikeLockPhase(phase);
      if (phase === 'locking') sound.playLockTone(false);
      else if (phase === 'locked') sound.playLockTone(true);
    };
    renderer.onCinematicFocusChange = (kind, labelAr) => setCinematicFocus({ kind, labelAr });
    renderer.onCameraAnglesChange = (angles) => setCameraAngles(angles);

    renderer.onMapClick = (pt: Point, hitId: string | null, shiftKey = false, lockPhase: StrikeLockPhase = 'idle') => {
      const eng = engineRef.current;
      const reg = registryRef.current;
      if (!eng || !reg) return;
      handleStageMapClick({
        pt,
        hitId,
        shiftKey,
        lockPhase,
        eng,
        reg,
        rec: actionRecorderRef.current,
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
      });
    };

    const boot = async () => {
      const reg = registryRef.current!;
      const countryReg = countryRegistryRef.current!;
      await Promise.all([reg.init([]), countryReg.init()]);
      await renderer.init(host);
      if (cancelled) return;

      const savedScale = await studioDb.getSetting<number>('unitScale');
      if (savedScale && Number.isFinite(savedScale)) {
        renderer.userUnitScale = savedScale;
        setUnitScale(savedScale);
      }

      const savedCinCam = await studioDb.getSetting<boolean>('cinematicCamera');
      if (typeof savedCinCam === 'boolean') {
        renderer.cinematicCameraEnabled = savedCinCam;
        setCinematicCamera(savedCinCam);
      }

      const savedVideoFps = await studioDb.getSetting<number>('videoFps');
      if (savedVideoFps === 30 || savedVideoFps === 60 || savedVideoFps === 120) {
        setVideoFps(savedVideoFps);
      }

      const lastScenId = await studioDb.getSetting<string>('lastScenarioId');
      setPackVersion((v) => v + 1);

      const userScen = lastScenId ? reg.scenarios.find((s) => s.id === lastScenId) : undefined;
      if (userScen && reg.maps[(() => { try { return (yaml.load(userScen.yaml) as ScenarioFile)?.meta?.map; } catch { return ''; } })()]) {
        setSelectedScenarioId(userScen.id);
        setYamlText(userScen.yaml);
        await loadScenario(userScen.yaml, null, userScen.id);
      } else {
        await openEmptyMapBoard(WORLD_SHADED_RELIEF_MAP_ID);
      }

      accumulatorRef.current = 0;
      lastAlphaRef.current = 1;
      let lastTime = performance.now();
      let lastHudTenths = -1;
      let lastHudCaption = '';
      let lastHudEntities = -1;
      let lastHudSteps = -1;
      let lastRecTenths = -1;
      let lastRecCount = -1;

      const loop = (now: number) => {
        if (cancelled) return;
        const frameDt = computeFrameDt(now, lastTime);
        lastTime = now;

        const eng = engineRef.current;
        let alpha = lastAlphaRef.current;
        if (eng && playingRef.current) {
          const stepped = stepFixedAccumulator(accumulatorRef.current, frameDt, DT, speedRef.current, 6);
          accumulatorRef.current = stepped.nextAccumulator;
          for (let s = 0; s < stepped.steps; s++) {
            eng.step();
          }
          alpha = stepped.alpha;
          lastAlphaRef.current = alpha;
        }

        if (eng && armedAbilityRef.current && !eng.entities.has(armedAbilityRef.current.entityId)) {
          armedAbilityRef.current = null;
          setArmedAbility(null);
        }

        const rec = actionRecorderRef.current;
        if (rec.isRecording) {
          const recSec = rec.elapsedSec();
          const recTenths = Math.floor(recSec * 10);
          if (recTenths !== lastRecTenths || rec.steps.length !== lastRecCount) {
            lastRecTenths = recTenths;
            lastRecCount = rec.steps.length;
            setRecStats({ clockSec: recSec, stepCount: rec.steps.length });
          }
        }

        if (eng) {
          renderer.render(eng, alpha, now / 1000, frameDt, playingRef.current);

          const simSec = eng.tick * DT;
          const tenths = Math.floor(simSec * 10);
          const entCount = eng.entities.size;
          const execSteps = eng.executedStepCount;

          if (
            tenths !== lastHudTenths ||
            eng.caption !== lastHudCaption ||
            entCount !== lastHudEntities ||
            execSteps !== lastHudSteps
          ) {
            lastHudTenths = tenths;
            lastHudCaption = eng.caption;
            lastHudEntities = entCount;
            lastHudSteps = execSteps;
            const hasSteps = (eng.scenario.timeline?.length ?? 0) > 0;
            const maxTicks = hasSteps ? Math.max(TICK_RATE * 2, Math.ceil(eng.estimateDurationSec() * TICK_RATE)) : Math.round(20 * TICK_RATE);
            setHudState({
              simTimeSec: simSec,
              tick: eng.tick,
              maxTicks,
              caption: eng.caption,
              entityCount: entCount,
              executedSteps: execSteps,
              totalSteps: eng.totalStepCount
            });
          }
        }

        rafId = requestAnimationFrame(loop);
      };

      rafId = requestAnimationFrame(loop);
    };

    void boot();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (recorderRef.current && recorderRef.current.state === 'recording') {
        recorderRef.current.stop();
      }
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      renderer.destroy();
    };
  }, [
    accumulatorRef,
    actionRecorderRef,
    activeToolRef,
    armedAbilityRef,
    arrowStartPtRef,
    countryRegistryRef,
    engineRef,
    enterCountryProvinces,
    lastAlphaRef,
    loadScenario,
    openEmptyMapBoard,
    pendingActionModeRef,
    playingRef,
    recorderRef,
    registryRef,
    rendererRef,
    sandboxCounterRef,
    sandboxFactionRef,
    setActiveTool,
    setArmedAbility,
    setCameraAngles,
    setCinematicCamera,
    setCinematicFocus,
    setHudState,
    setPackVersion,
    setRecStats,
    setSelectedEntityId,
    setSelectedEntityScale,
    setSelectedRegionId,
    setSelectedScenarioId,
    setStrikeLockPhase,
    setUnitScale,
    setVideoFps,
    setYamlText,
    showToast,
    soundRef,
    speedRef,
    stageHostRef,
    syncHudFromEngine,
    toastTimerRef,
    toolScalesRef
  ]);

  return { openEmptyMapBoard, loadScenario, enterCountryProvinces };
}
