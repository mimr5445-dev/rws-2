import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActionRecorder } from './core/actionRecorder';
import { CinematicFocusKind } from './core/cinematicDirector';
import { StudioEngine, TICK_RATE } from './engine/engine';
import { StrikeLockPhase } from './core/targetingLock';
import { ActorPack, Faction, MapPack, Point, ValidationIssue } from './core/types';
import { CountryRegistry } from './countries/countryRegistry';
import { PackRegistry } from './packs/packRegistry';
import { SoundSynth } from './renderer/soundSynth';
import { StudioRenderer } from './renderer/studioRenderer';
import { studioDb } from './storage/studioDb';
import { SpecModal } from './modals/SpecModal';
import { ToolsDock } from './panels/ToolsDock';
import { UnitActionBar } from './panels/UnitActionBar';
import { UnitsDock } from './panels/UnitsDock';
import { StudioBottomOverlays } from './app/StudioBottomOverlays';
import { StudioTopHud } from './app/StudioTopHud';
import { ArmedAbilityState, DEFAULT_EMPTY_YAML, INITIAL_HUD_STATE } from './app/studioAppTypes';
import { createScenarioActionHandlers } from './app/useScenarioActions';
import { useStudioEngineController } from './app/useStudioEngineController';
import { toggleStudioVideoRecord } from './app/useVideoRecording';

export default function App() {
  const registryRef = useRef<PackRegistry | null>(null);
  if (!registryRef.current) {
    registryRef.current = new PackRegistry(true);
  }
  const countryRegistryRef = useRef<CountryRegistry | null>(null);
  if (!countryRegistryRef.current) {
    countryRegistryRef.current = new CountryRegistry(true);
  }

  const stageHostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<StudioRenderer | null>(null);
  const engineRef = useRef<StudioEngine | null>(null);
  const soundRef = useRef<SoundSynth | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const actionRecorderRef = useRef<ActionRecorder>(new ActionRecorder());

  const playingRef = useRef(true);
  const speedRef = useRef(1);
  const activeToolRef = useRef<string>('select');
  const sandboxFactionRef = useRef<Faction>('blue');
  const sandboxCounterRef = useRef(1);
  const toolScalesRef = useRef<Record<string, number>>({});
  const armedAbilityRef = useRef<ArmedAbilityState | null>(null);
  const pendingActionModeRef = useRef<'none' | 'arrow_start' | 'arrow_end' | 'pulse'>('none');
  const arrowStartPtRef = useRef<Point | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const accumulatorRef = useRef(0);
  const lastAlphaRef = useRef(1);

  const [, setPackVersion] = useState(0);
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [topHudExpanded, setTopHudExpanded] = useState(false);
  const [anglesOpen, setAnglesOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);

  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');
  const [yamlText, setYamlText] = useState(DEFAULT_EMPTY_YAML);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [muted, setMuted] = useState(false);
  const [recording, setRecording] = useState(false);
  const [videoFps, setVideoFps] = useState<30 | 60 | 120>(120);
  const [unitScale, setUnitScale] = useState(1.0);
  const [activeTool, setActiveTool] = useState<string>('select');
  const [sandboxFaction, setSandboxFaction] = useState<Faction>('blue');

  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedEntityScale, setSelectedEntityScale] = useState<number>(1.0);
  const [armedAbility, setArmedAbility] = useState<ArmedAbilityState | null>(null);
  const [strikeLockPhase, setStrikeLockPhase] = useState<StrikeLockPhase>('idle');

  const [toolScales, setToolScales] = useState<Record<string, number>>({});
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [yamlSyntaxError, setYamlSyntaxError] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [showAnchors, setShowAnchors] = useState(true);
  const [cinematicCamera, setCinematicCamera] = useState(false);
  const [cameraAngles, setCameraAngles] = useState<{ bearingDeg: number; tiltDeg: number }>({
    bearingDeg: 0,
    tiltDeg: 0
  });
  const [cinematicFocus, setCinematicFocus] = useState<{ kind: CinematicFocusKind; labelAr: string }>({
    kind: 'none',
    labelAr: ''
  });
  const [specOpen, setSpecOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const [activeMap, setActiveMap] = useState<MapPack>(registryRef.current.maps.world_live);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [geoLoadingMsg, setGeoLoadingMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [viewportSize, setViewportSize] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 720
  }));

  const [actionRecording, setActionRecording] = useState(false);
  const [recStats, setRecStats] = useState({ clockSec: 0, stepCount: 0 });
  const [pendingSaveMode, setPendingSaveMode] = useState<'recorded' | 'code' | null>(null);
  const [saveDraftTitle, setSaveDraftTitle] = useState('');
  const [hudState, setHudState] = useState(INITIAL_HUD_STATE);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  useEffect(() => {
    sandboxFactionRef.current = sandboxFaction;
  }, [sandboxFaction]);

  useEffect(() => {
    armedAbilityRef.current = armedAbility;
    if (rendererRef.current) {
      rendererRef.current.strikeModeConfig = armedAbility
        ? {
            entityId: armedAbility.entityId,
            mode: armedAbility.mode,
            radius: armedAbility.radius,
            accentColor: armedAbility.color
          }
        : null;
    }
    if (!armedAbility) {
      setStrikeLockPhase('idle');
    }
  }, [armedAbility]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.cinematicCameraEnabled = cinematicCamera;
      if (cinematicCamera) {
        rendererRef.current.resumeCinematicDirector();
      } else {
        setCinematicFocus({ kind: 'none', labelAr: '' });
      }
    }
  }, [cinematicCamera]);

  useEffect(() => {
    const onResize = () => {
      setViewportSize({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        pendingActionModeRef.current = 'none';
        arrowStartPtRef.current = null;
        if (armedAbilityRef.current) {
          armedAbilityRef.current = null;
          setArmedAbility(null);
          return;
        }
        if (activeToolRef.current !== 'select') {
          setActiveTool('select');
          return;
        }
        if (rendererRef.current) {
          rendererRef.current.selectedEntityId = null;
        }
        setSelectedEntityId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMsg(null);
      toastTimerRef.current = null;
    }, 3000);
  }, []);

  const syncHudFromEngine = useCallback((eng: StudioEngine) => {
    const hasSteps = (eng.scenario.timeline?.length ?? 0) > 0;
    const maxTicks = hasSteps ? Math.max(TICK_RATE * 2, Math.ceil(eng.estimateDurationSec() * TICK_RATE)) : Math.round(20 * TICK_RATE);
    setHudState({
      simTimeSec: eng.tick / TICK_RATE,
      tick: eng.tick,
      maxTicks,
      caption: eng.caption,
      entityCount: eng.entities.size,
      executedSteps: eng.executedStepCount,
      totalSteps: eng.totalStepCount
    });
  }, []);

  const { openEmptyMapBoard, loadScenario, enterCountryProvinces } = useStudioEngineController({
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
  });

  const handleChangeUnitScale = async (nextScale: number) => {
    setUnitScale(nextScale);
    if (rendererRef.current) rendererRef.current.userUnitScale = nextScale;
    await studioDb.setSetting('unitScale', nextScale);
  };

  const handleChangeSelectedEntityScale = (nextScale: number) => {
    const eng = engineRef.current;
    const entityId = rendererRef.current?.selectedEntityId;
    if (!eng || !entityId) return;
    const clamped = Number(Math.max(0.3, Math.min(2.8, nextScale)).toFixed(2));
    setSelectedEntityScale(clamped);
    eng.dispatchOrder({ type: 'resize', entityId, scale: clamped });
    eng.flushOrders();
    actionRecorderRef.current.recordResize(entityId, clamped);
  };

  const handleChangeToolScale = (toolId: string, nextScale: number) => {
    const clamped = Number(Math.max(0.3, Math.min(2.8, nextScale)).toFixed(2));
    toolScalesRef.current = { ...toolScalesRef.current, [toolId]: clamped };
    setToolScales((prev) => ({ ...prev, [toolId]: clamped }));
  };

  const handleDeleteEntity = (entityId: string) => {
    const eng = engineRef.current;
    const renderer = rendererRef.current;
    if (!eng || !renderer) return;
    eng.dispatchOrder({ type: 'remove', entityId });
    eng.flushOrders();
    actionRecorderRef.current.recordRemove(entityId);
    if (armedAbilityRef.current?.entityId === entityId) {
      armedAbilityRef.current = null;
      setArmedAbility(null);
    }
    if (renderer.selectedEntityId === entityId) {
      renderer.selectedEntityId = null;
      setSelectedEntityId(null);
    }
    syncHudFromEngine(eng);
  };

  const scenarioActions = createScenarioActionHandlers({
    activeMap,
    yamlText,
    selectedScenarioId,
    pendingSaveMode,
    saveDraftTitle,
    registryRef,
    engineRef,
    rendererRef,
    actionRecorderRef,
    pendingActionModeRef,
    openEmptyMapBoard,
    loadScenario,
    syncHudFromEngine,
    showToast,
    setPlaying,
    setYamlText,
    setPendingSaveMode,
    setActionRecording,
    setRecStats,
    setSaveDraftTitle,
    setSelectedScenarioId,
    setPackVersion,
    setStatusNotice
  });

  const handleRestart = () => {
    const eng = engineRef.current;
    if (!eng) return;
    accumulatorRef.current = 0;
    lastAlphaRef.current = 1;
    eng.reset();
    armedAbilityRef.current = null;
    setArmedAbility(null);
    if (rendererRef.current) {
      rendererRef.current.selectedEntityId = null;
      rendererRef.current.resumeCameraTracking();
      setSelectedEntityId(null);
    }
    syncHudFromEngine(eng);
  };

  const handleScrub = (targetTick: number) => {
    const eng = engineRef.current;
    if (!eng) return;
    setPlaying(false);
    accumulatorRef.current = 0;
    lastAlphaRef.current = 1;
    eng.seekToTick(targetTick);
    rendererRef.current?.syncCameraImmediate(eng);
    const selId = rendererRef.current?.selectedEntityId;
    if (selId) {
      setSelectedEntityScale(eng.entities.get(selId)?.scaleMul ?? 1.0);
    }
    syncHudFromEngine(eng);
  };

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (soundRef.current) soundRef.current.muted = next;
  };

  const handleToggleAnchors = () => {
    const next = !showAnchors;
    setShowAnchors(next);
    if (rendererRef.current) rendererRef.current.showAnchors = next;
  };

  const handleToggleCinematicCamera = () => {
    setCinematicCamera((prev) => {
      const next = !prev;
      if (rendererRef.current) {
        rendererRef.current.cinematicCameraEnabled = next;
        if (next) rendererRef.current.resumeCinematicDirector();
      }
      if (!next) setCinematicFocus({ kind: 'none', labelAr: '' });
      void studioDb.setSetting('cinematicCamera', next);
      showToast(next ? '🎬 تم تفعيل الكاميرا السينمائية الآلية مع الأحداث' : 'تم إيقاف الكاميرا السينمائية الآلية');
      return next;
    });
  };

  const handleUploadYamlFile = async (file: File) => {
    const text = await file.text();
    setYamlText(text);
    await loadScenario(text, 'تم استيراد السيناريو وتشغيله');
  };

  const handleStageDrop = async (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
      await handleUploadYamlFile(file);
    }
  };

  const handleChangeVideoFps = (fps: 30 | 60 | 120) => {
    setVideoFps(fps);
    void studioDb.setSetting('videoFps', fps);
  };

  const handleToggleVideoRecord = () => {
    toggleStudioVideoRecord({
      recording,
      videoFps,
      recorderRef,
      rendererRef,
      soundRef,
      setRecording,
      setPlaying,
      showToast
    });
  };

  const reg = registryRef.current!;
  const actorsList: ActorPack[] = Object.values(reg.actors);
  const selectedRegionObj = selectedRegionId ? activeMap.regions?.[selectedRegionId] : undefined;
  const selectedEntity = selectedEntityId ? engineRef.current?.entities.get(selectedEntityId) : undefined;
  const selectedActor = selectedEntity ? reg.actors[selectedEntity.actorId] : undefined;
  const placementActor = activeTool !== 'select' ? reg.actors[activeTool] : undefined;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 h-[100dvh] w-screen bg-[#090f1a] text-slate-100 overflow-hidden select-none"
    >
      <main
        className="relative w-full h-full overflow-hidden"
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleStageDrop}
      >
        <div
          ref={stageHostRef}
          data-strike-lock={armedAbility ? strikeLockPhase : 'off'}
          data-cinematic-cam={cinematicCamera ? (cinematicFocus.kind !== 'none' ? cinematicFocus.kind : 'ready') : 'off'}
          className={`w-full h-full touch-none ${armedAbility ? 'cursor-crosshair' : ''}`}
          aria-label="مسرح الخريطة التفاعلية"
        />

        {cinematicCamera && (
          <div
            aria-hidden="true"
            data-cinematic-safe-frame="true"
            className="pointer-events-none fixed inset-0 z-10"
          >
            <div className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-b from-black/75 via-black/30 to-transparent border-b border-amber-400/15" />
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 via-black/35 to-transparent border-t border-amber-400/15" />
            <div className="absolute inset-0 shadow-[inset_0_0_80px_rgba(0,0,0,0.45)]" />
          </div>
        )}

        <StudioTopHud
          activeMap={activeMap}
          availableMaps={Object.values(reg.maps)}
          onSelectMap={(mapId) => void openEmptyMapBoard(mapId)}
          topHudExpanded={topHudExpanded}
          onToggleTopHud={() =>
            setTopHudExpanded((v) => {
              const next = !v;
              if (next) {
                setAnglesOpen(false);
                if (viewportSize.w < 640) {
                  setUnitsOpen(false);
                  setToolsOpen(false);
                }
              }
              return next;
            })
          }
          cinematicCamera={cinematicCamera}
          onToggleCinematicCamera={handleToggleCinematicCamera}
          cinematicFocus={cinematicFocus}
          anglesOpen={anglesOpen}
          onToggleAngles={() =>
            setAnglesOpen((v) => {
              const next = !v;
              if (next) {
                setTopHudExpanded(false);
                if (viewportSize.w < 640) {
                  setUnitsOpen(false);
                  setToolsOpen(false);
                }
              }
              return next;
            })
          }
          onCloseAngles={() => setAnglesOpen(false)}
          cameraAngles={cameraAngles}
          selectedRegionId={selectedRegionId}
          selectedRegionObj={selectedRegionObj}
          onEnterCountryProvinces={(id) => void enterCountryProvinces(id)}
          onBackToWorld={() => void openEmptyMapBoard('world_live')}
          hudState={hudState}
          showAnchors={showAnchors}
          onToggleAnchors={handleToggleAnchors}
          geoLoadingMsg={geoLoadingMsg}
          toastMsg={toastMsg}
          rendererRef={rendererRef}
        />

        <UnitsDock
          open={unitsOpen}
          onToggleOpen={() => {
            setUnitsOpen((v) => {
              const next = !v;
              if (next && viewportSize.w < 640) {
                setToolsOpen(false);
                setTopHudExpanded(false);
                setAnglesOpen(false);
              }
              return next;
            });
          }}
          actors={actorsList}
          activeTool={activeTool}
          onSelectTool={(toolId) => {
            setActiveTool(toolId);
            if (toolId !== 'select') {
              armedAbilityRef.current = null;
              setArmedAbility(null);
              if (viewportSize.w < 640) setUnitsOpen(false);
            }
          }}
          sandboxFaction={sandboxFaction}
          onChangeFaction={setSandboxFaction}
          toolScales={toolScales}
          onChangeToolScale={handleChangeToolScale}
        />

        <ToolsDock
          open={toolsOpen}
          onToggleOpen={() => {
            setToolsOpen((v) => {
              const next = !v;
              if (next && viewportSize.w < 640) {
                setUnitsOpen(false);
                setTopHudExpanded(false);
                setAnglesOpen(false);
              }
              return next;
            });
          }}
          playing={playing}
          onTogglePlay={() => setPlaying((p) => !p)}
          onRestart={handleRestart}
          speed={speed}
          onChangeSpeed={setSpeed}
          muted={muted}
          onToggleMute={handleToggleMute}
          recordingVideo={recording}
          onToggleVideoRecord={handleToggleVideoRecord}
          videoFps={videoFps}
          onChangeVideoFps={handleChangeVideoFps}
          cinematicCamera={cinematicCamera}
          onToggleCinematicCamera={handleToggleCinematicCamera}
          unitScale={unitScale}
          onChangeUnitScale={handleChangeUnitScale}
          onSelectMode={() => {
            setActiveTool('select');
            armedAbilityRef.current = null;
            setArmedAbility(null);
            if (viewportSize.w < 640) setToolsOpen(false);
          }}
          onClearBoard={() => void openEmptyMapBoard(activeMap.id)}
          actionRecording={actionRecording}
          recStats={recStats}
          onStartActionRecord={() => void scenarioActions.handleStartActionRecord()}
          onStopActionRecord={scenarioActions.handleRequestStopActionRecord}
          onRecCamera={scenarioActions.handleRecCamera}
          onRecCaptionSubmit={scenarioActions.handleRecCaptionSubmit}
          onRecArrow={scenarioActions.handleRecArrow}
          onRecPulse={scenarioActions.handleRecPulse}
          onRecDeleteUnit={() => {
            if (selectedEntityId) handleDeleteEntity(selectedEntityId);
          }}
          hasSelectedEntity={Boolean(selectedEntityId)}
          pendingSaveMode={pendingSaveMode}
          saveDraftTitle={saveDraftTitle}
          onChangeSaveDraftTitle={setSaveDraftTitle}
          onConfirmSaveScenario={() => void scenarioActions.handleConfirmSaveScenario()}
          onCancelSaveScenario={() => setPendingSaveMode(null)}
          userScenarios={reg.scenarios}
          selectedScenarioId={selectedScenarioId}
          onSelectScenarioId={setSelectedScenarioId}
          onLoadSelectedScenario={() => void scenarioActions.handleLoadSelectedScenario()}
          onDeleteSelectedScenario={() => void scenarioActions.handleDeleteSelectedScenario()}
          yamlText={yamlText}
          onChangeYamlText={setYamlText}
          onRunYaml={async () => {
            const ok = await loadScenario(yamlText, 'تم تشغيل السيناريو');
            setPlaying(ok);
          }}
          onRequestSaveYaml={() => void scenarioActions.handleRequestSaveYaml()}
          onUploadYamlFile={(f) => void handleUploadYamlFile(f)}
          onOpenSpecModal={() => setSpecOpen(true)}
          issues={issues}
          yamlSyntaxError={yamlSyntaxError}
          statusNotice={statusNotice}
        />

        {selectedEntity && selectedActor?.ability && (
          <UnitActionBar
            entityId={selectedEntity.id}
            actorLabel={selectedActor.label}
            actorSvg={selectedActor.svg}
            ability={selectedActor.ability}
            isArmed={armedAbility?.entityId === selectedEntity.id}
            strikeLockPhase={strikeLockPhase}
            scaleMul={selectedEntityScale}
            bottomOffsetClass={cinematicCamera || timelineOpen ? 'bottom-18' : 'bottom-13'}
            onToggleArm={() => {
              if (armedAbility?.entityId === selectedEntity.id) {
                armedAbilityRef.current = null;
                if (rendererRef.current) rendererRef.current.strikeModeConfig = null;
                setArmedAbility(null);
                setStrikeLockPhase('idle');
              } else {
                const next: ArmedAbilityState = {
                  entityId: selectedEntity.id,
                  mode: selectedActor.ability!.mode,
                  radius: selectedActor.ability!.radius,
                  color: selectedActor.ability!.accentColor,
                  label: selectedActor.ability!.label,
                  shortLabel: selectedActor.ability!.shortLabel
                };
                armedAbilityRef.current = next;
                if (rendererRef.current) {
                  rendererRef.current.strikeModeConfig = {
                    entityId: next.entityId,
                    mode: next.mode,
                    radius: next.radius,
                    accentColor: next.color
                  };
                }
                setArmedAbility(next);
                setStrikeLockPhase('idle');
                setActiveTool('select');
                setPlaying(true);
              }
            }}
            onChangeScale={handleChangeSelectedEntityScale}
            onDelete={() => handleDeleteEntity(selectedEntity.id)}
            onDeselect={() => {
              armedAbilityRef.current = null;
              if (rendererRef.current) {
                rendererRef.current.strikeModeConfig = null;
                rendererRef.current.selectedEntityId = null;
              }
              setArmedAbility(null);
              setStrikeLockPhase('idle');
              setSelectedEntityId(null);
            }}
          />
        )}

        <StudioBottomOverlays
          placementActor={placementActor}
          armedAbility={armedAbility}
          selectedEntity={selectedEntity}
          selectedActor={selectedActor}
          cinematicCamera={cinematicCamera}
          timelineOpen={timelineOpen}
          setTimelineOpen={setTimelineOpen}
          dragActive={dragActive}
          hudState={hudState}
          onStopCurrentMode={() => {
            if (armedAbility) {
              armedAbilityRef.current = null;
              setArmedAbility(null);
            } else {
              setActiveTool('select');
            }
          }}
          onScrub={handleScrub}
        />
      </main>

      <SpecModal
        open={specOpen}
        onClose={() => setSpecOpen(false)}
        activeMap={activeMap}
        maps={reg.maps}
        actors={reg.actors}
      />
    </div>
  );
}
