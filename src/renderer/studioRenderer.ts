import { Application, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import {
  TwoFingerGestureSession,
  clampCameraState,
  clampTiltDeg,
  computeSafeFitZoom,
  getMinAllowedZoom,
  normalizeAngleDeg,
  projectWorldToScreen,
  tiltToScaleYRatio,
  unprojectScreenToWorld
} from '../core/cameraTransform';
import { CinematicDirector, CinematicFocusKind } from '../core/cinematicDirector';
import { StudioEngine } from '../engine/engine';
import { StrikeLockPhase, StrikeModeConfig, TargetingLockCandidate } from '../core/targetingLock';
import {
  ExplosionState,
  MapPack,
  MuzzleFlashState,
  Point,
  ProjectileState
} from '../core/types';
import {
  CameraControllerState,
  populateAnchorLayer,
  stepRendererCameraAndTransform
} from './layers/rendererCamera';
import { renderCombatFx } from './layers/rendererCombatFx';
import { renderEntitiesAndCallouts } from './layers/rendererEntities';
import { MapOverlayCacheState, renderMapOverlays } from './layers/rendererMapOverlays';
import { attachRendererPointerEvents, RendererPointerState } from './layers/rendererPointerInput';
import { renderTargetingLock } from './layers/rendererTargeting';
import {
  CalloutView,
  EditorOverlayState,
  EntityView,
  FxParticle,
  Particle,
  WakeRipple,
  loadSvgOrUrlTexture
} from './layers/rendererUtils';

export type { EditorOverlayState } from './layers/rendererUtils';

export class StudioRenderer {
  public app = new Application();
  private cameraStage = new Container();
  private world = new Container();
  private mapLayer = new Container();
  private countryTintGraphics = new Graphics();
  private geoHoverGraphics = new Graphics();
  private geoSelectGraphics = new Graphics();
  private navOverlay = new Graphics();
  private zoneGraphics = new Graphics();
  private craterGraphics = new Graphics();
  private wakeGraphics = new Graphics();
  private pathGraphics = new Graphics();
  private arrowGraphics = new Graphics();
  private pulseGraphics = new Graphics();
  private particleGraphics = new Graphics();
  private anchorLayer = new Container();
  private anchorLabels: Text[] = [];
  private entityLayer = new Container();
  private projectileGraphics = new Graphics();
  private explosionGraphics = new Graphics();
  private fxParticleGraphics = new Graphics();
  private targetingGraphics = new Graphics();
  private calloutLayer = new Container();

  private actorTextures = new Map<string, Texture>();
  private entityViews = new Map<string, EntityView>();
  private calloutViews = new Map<string, CalloutView>();
  private particles: Particle[] = [];
  private fxParticles: FxParticle[] = [];
  private wakeRipples: WakeRipple[] = [];
  private seenMuzzleFlashes = new WeakSet<MuzzleFlashState>();
  private seenProjectiles = new WeakSet<ProjectileState>();
  private seenExplosions = new WeakSet<ExplosionState>();
  private lockCandidate: TargetingLockCandidate | null = null;
  private hoverWorldPt: Point | null = null;
  private cinematicDirector = new CinematicDirector();
  private lastCinematicLabel = '';

  private camX = 600;
  private camY = 400;
  private camZoom = 1;
  private targetCamZoom = 1;
  private zoomGlideActive = false;
  private zoomAnchor: { sx: number; sy: number; wx: number; wy: number } | null = null;
  private camBearingDeg = 0;
  private camTiltDeg = 0;
  private targetBearingDeg = 0;
  private targetTiltDeg = 0;
  private lastEmittedAngles: { bearingDeg: number; tiltDeg: number } | null = null;
  private lastCamSeq = -1;
  private currentTargetSeq = 0;
  private activePointers = new Map<number, Point>();
  private twoFingerSession: TwoFingerGestureSession | null = null;
  private isOrbitDragging = false;
  private pointerDownClient: Point | null = null;
  private pinchUsed = false;
  private painting = false;
  private dragMoved = false;
  private mapWidth = 1200;
  private mapHeight = 800;
  private lastUnitFactor = 1;
  private currentHitTest?: (pt: Point) => string | null;
  private lastEmittedSelPos: { id: string; x: number; y: number } | null = null;
  private userAdjustedCamera = false;
  private lastScreenW = 0;
  private lastScreenH = 0;
  private overlayCache: MapOverlayCacheState = {
    countryTintDirty: true,
    hoverHighlightCacheKey: '',
    selectHighlightCacheKey: '',
    hadNavOverlay: false,
    hadActiveZones: false,
    hadActiveCraters: false
  };

  public userUnitScale = 1.0;
  public selectedEntityId: string | null = null;
  public hoveredRegionId: string | null = null;
  public selectedRegionId: string | null = null;
  public hideUIHelpers = false;
  public showAnchors = true;
  public cinematicCameraEnabled = false;
  private wasCinematicEnabled = false;
  private countryColorMap: Record<string, string> = {};

  setCountryColorMap(colors: Record<string, string>): void {
    this.countryColorMap = colors;
    this.overlayCache.countryTintDirty = true;
  }

  public editorOverlay: EditorOverlayState = {
    enabled: false,
    showNavGrid: false,
    paintActive: false,
    draftZonePoints: []
  };

  getCameraState(): { x: number; y: number; zoom: number } {
    return { x: this.camX, y: this.camY, zoom: this.camZoom };
  }

  getCameraAngles(): { bearingDeg: number; tiltDeg: number } {
    return {
      bearingDeg: Math.round(this.targetBearingDeg * 10) / 10,
      tiltDeg: Math.round(this.targetTiltDeg * 10) / 10
    };
  }

  setCameraAngles(bearingDeg: number, tiltDeg: number, immediate = false): void {
    this.targetBearingDeg = normalizeAngleDeg(bearingDeg);
    this.targetTiltDeg = clampTiltDeg(tiltDeg);
    if (immediate) {
      this.camBearingDeg = this.targetBearingDeg;
      this.camTiltDeg = this.targetTiltDeg;
    }
    this.userAdjustedCamera = true;
    this.emitCameraAngles(true);
  }

  resetCameraAngles(immediate = false): void {
    this.setCameraAngles(0, 0, immediate);
  }

  private emitCameraAngles(force = false): void {
    if (!this.onCameraAnglesChange) return;
    const nextB = Math.round(this.targetBearingDeg * 10) / 10;
    const nextT = Math.round(this.targetTiltDeg * 10) / 10;
    const prev = this.lastEmittedAngles;
    if (!force && prev && Math.abs(prev.bearingDeg - nextB) < 0.25 && Math.abs(prev.tiltDeg - nextT) < 0.25) {
      return;
    }
    this.lastEmittedAngles = { bearingDeg: nextB, tiltDeg: nextT };
    this.onCameraAnglesChange({ bearingDeg: nextB, tiltDeg: nextT });
  }

  worldToScreen(pt: Point): Point {
    return projectWorldToScreen(
      pt.x,
      pt.y,
      this.camX,
      this.camY,
      this.camZoom,
      this.app.screen.width,
      this.app.screen.height,
      this.cinematicCameraEnabled,
      this.camBearingDeg,
      this.camTiltDeg
    );
  }

  private getMinZoom(): number {
    return getMinAllowedZoom(
      this.mapWidth,
      this.mapHeight,
      this.app.screen.width,
      this.app.screen.height,
      this.cinematicCameraEnabled
    );
  }

  private clampZoom(z: number): number {
    return Math.max(this.getMinZoom(), Math.min(6.0, Number.isFinite(z) && z > 0 ? z : this.getMinZoom()));
  }

  public strikeModeConfig: StrikeModeConfig | null = null;

  public onMapClick?: (
    worldPt: Point,
    clickedEntityId: string | null,
    shiftKey?: boolean,
    lockPhase?: StrikeLockPhase
  ) => void;
  public onStrikeLockChange?: (phase: StrikeLockPhase, targetPt?: Point, targetEntityId?: string | null) => void;
  public onCinematicFocusChange?: (kind: CinematicFocusKind, labelAr: string) => void;
  public onCameraAnglesChange?: (angles: { bearingDeg: number; tiltDeg: number }) => void;
  public onMapPaint?: (worldPt: Point) => void;
  public onSelectionChange?: (entityId: string | null) => void;
  public onSelectedScreenPos?: (pos: { id: string; x: number; y: number; offsetPx: number } | null) => void;
  public onRegionHover?: (regionId: string | null) => void;
  public onRegionDoubleClick?: (regionId: string) => void;

  private cleanupListeners: Array<() => void> = [];
  private destroyed = false;

  async init(host: HTMLElement): Promise<void> {
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    try {
      await this.app.init({
        resizeTo: host,
        backgroundColor: 0x090f1a,
        antialias: true,
        autoStart: false,
        autoDensity: true,
        resolution: dpr,
        preference: 'webgl',
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true
      });
    } catch {
      await this.app.init({
        resizeTo: host,
        backgroundColor: 0x090f1a,
        antialias: true,
        autoStart: false,
        autoDensity: true,
        resolution: dpr,
        preserveDrawingBuffer: true
      });
    }
    this.app.ticker?.stop();
    if (this.destroyed) return;
    this.app.canvas.style.display = 'block';
    this.app.canvas.style.width = '100%';
    this.app.canvas.style.height = '100%';
    this.app.canvas.style.touchAction = 'none';
    this.app.canvas.setAttribute('data-testid', 'studio-canvas');
    host.appendChild(this.app.canvas);

    this.world.addChild(
      this.mapLayer,
      this.countryTintGraphics,
      this.geoHoverGraphics,
      this.geoSelectGraphics,
      this.navOverlay,
      this.zoneGraphics,
      this.craterGraphics,
      this.wakeGraphics,
      this.pathGraphics,
      this.arrowGraphics,
      this.pulseGraphics,
      this.particleGraphics,
      this.anchorLayer,
      this.entityLayer,
      this.projectileGraphics,
      this.explosionGraphics,
      this.fxParticleGraphics,
      this.targetingGraphics,
      this.calloutLayer
    );
    this.cameraStage.addChild(this.world);
    this.app.stage.addChild(this.cameraStage);
    this.setupPointerEvents();
  }

  private screenToWorld(clientX: number, clientY: number): Point {
    const rect = this.app.canvas.getBoundingClientRect();
    const scaleX = this.app.screen.width / Math.max(1, rect.width);
    const scaleY = this.app.screen.height / Math.max(1, rect.height);
    const sx = (clientX - rect.left) * scaleX;
    const sy = (clientY - rect.top) * scaleY;
    return unprojectScreenToWorld(
      sx,
      sy,
      this.camX,
      this.camY,
      this.camZoom,
      this.app.screen.width,
      this.app.screen.height,
      this.cinematicCameraEnabled,
      this.camBearingDeg,
      this.camTiltDeg
    );
  }

  private setupPointerEvents(): void {
    const self = this;
    const state: RendererPointerState = {
      get activePointers() { return self.activePointers; },
      get twoFingerSession() { return self.twoFingerSession; },
      set twoFingerSession(v) { self.twoFingerSession = v; },
      get isOrbitDragging() { return self.isOrbitDragging; },
      set isOrbitDragging(v) { self.isOrbitDragging = v; },
      get pointerDownClient() { return self.pointerDownClient; },
      set pointerDownClient(v) { self.pointerDownClient = v; },
      get pinchUsed() { return self.pinchUsed; },
      set pinchUsed(v) { self.pinchUsed = v; },
      get painting() { return self.painting; },
      set painting(v) { self.painting = v; },
      get dragMoved() { return self.dragMoved; },
      set dragMoved(v) { self.dragMoved = v; },
      get lockCandidate() { return self.lockCandidate; },
      set lockCandidate(v) { self.lockCandidate = v; },
      get hoverWorldPt() { return self.hoverWorldPt; },
      set hoverWorldPt(v) { self.hoverWorldPt = v; },
      get camX() { return self.camX; },
      set camX(v) { self.camX = v; },
      get camY() { return self.camY; },
      set camY(v) { self.camY = v; },
      get camZoom() { return self.camZoom; },
      set camZoom(v) { self.camZoom = v; },
      get targetCamZoom() { return self.targetCamZoom; },
      set targetCamZoom(v) { self.targetCamZoom = v; },
      get zoomGlideActive() { return self.zoomGlideActive; },
      set zoomGlideActive(v) { self.zoomGlideActive = v; },
      get zoomAnchor() { return self.zoomAnchor; },
      set zoomAnchor(v) { self.zoomAnchor = v; },
      get camBearingDeg() { return self.camBearingDeg; },
      set camBearingDeg(v) { self.camBearingDeg = v; },
      get camTiltDeg() { return self.camTiltDeg; },
      set camTiltDeg(v) { self.camTiltDeg = v; },
      get targetBearingDeg() { return self.targetBearingDeg; },
      set targetBearingDeg(v) { self.targetBearingDeg = v; },
      get targetTiltDeg() { return self.targetTiltDeg; },
      set targetTiltDeg(v) { self.targetTiltDeg = v; },
      get lastCamSeq() { return self.lastCamSeq; },
      set lastCamSeq(v) { self.lastCamSeq = v; },
      get currentTargetSeq() { return self.currentTargetSeq; },
      get userAdjustedCamera() { return self.userAdjustedCamera; },
      set userAdjustedCamera(v) { self.userAdjustedCamera = v; },
      get hoveredRegionId() { return self.hoveredRegionId; },
      set hoveredRegionId(v) { self.hoveredRegionId = v; },
      get selectedEntityId() { return self.selectedEntityId; },
      get cinematicCameraEnabled() { return self.cinematicCameraEnabled; },
      get mapWidth() { return self.mapWidth; },
      get mapHeight() { return self.mapHeight; },
      get strikeModeConfig() { return self.strikeModeConfig; },
      get editorOverlay() { return self.editorOverlay; }
    };

    const cleanup = attachRendererPointerEvents({
      canvas: this.app.canvas,
      getScreenSize: () => ({ width: this.app.screen.width, height: this.app.screen.height }),
      state,
      screenToWorld: (cx, cy) => this.screenToWorld(cx, cy),
      pickEntity: (wx, wy) => this.pickEntity(wx, wy),
      clampZoom: (z) => this.clampZoom(z),
      hitTestRegion: (pt) => this.currentHitTest?.(pt) ?? null,
      hasHitTest: () => Boolean(this.currentHitTest),
      notifyUserInteraction: (nowSec, holdSec) => this.cinematicDirector.notifyUserInteraction(nowSec, holdSec),
      resumeCinematicImmediately: () => this.cinematicDirector.resumeImmediately(),
      emitCameraAngles: () => this.emitCameraAngles(),
      onStrikeLockChange: (phase) => this.onStrikeLockChange?.(phase),
      onMapPaint: (pt) => this.onMapPaint?.(pt),
      onMapClick: (pt, hit, shiftKey, phase) => this.onMapClick?.(pt, hit, shiftKey, phase),
      onRegionHover: (id) => this.onRegionHover?.(id),
      onRegionDoubleClick: (id) => this.onRegionDoubleClick?.(id)
    });
    this.cleanupListeners.push(cleanup);
  }

  private pickEntity(wx: number, wy: number): string | null {
    for (const [id, view] of this.entityViews) {
      const hitRadius = Math.max(18 / this.camZoom, 24 * view.container.scale.x);
      if (Math.hypot(view.container.x - wx, view.container.y - wy) <= hitRadius) return id;
    }
    return null;
  }

  private computeClampedCameraGoal(targetX: number, targetY: number, targetZoom: number): { x: number; y: number } {
    const clamped = clampCameraState(
      targetX,
      targetY,
      targetZoom,
      this.mapWidth,
      this.mapHeight,
      this.app.screen.width,
      this.app.screen.height,
      this.cinematicCameraEnabled,
      this.camBearingDeg,
      this.camTiltDeg
    );
    return { x: clamped.x, y: clamped.y };
  }

  zoomBy(factor: number): void {
    this.lastCamSeq = this.currentTargetSeq;
    this.userAdjustedCamera = true;
    this.cinematicDirector.notifyUserInteraction(performance.now() / 1000, 4.0);
    const baseZoom = this.zoomGlideActive ? this.targetCamZoom : this.camZoom;
    this.targetCamZoom = this.clampZoom(baseZoom * factor);
    this.zoomAnchor = null;
    this.zoomGlideActive = true;
  }

  resetCamera(): void {
    this.lastCamSeq = this.currentTargetSeq;
    this.userAdjustedCamera = false;
    this.cinematicDirector.notifyUserInteraction(performance.now() / 1000, 4.0);
    this.camX = this.mapWidth / 2;
    this.camY = this.mapHeight / 2;
    const sw = Math.max(1, this.app.screen.width);
    const sh = Math.max(1, this.app.screen.height);
    this.lastScreenW = sw;
    this.lastScreenH = sh;
    this.camZoom = computeSafeFitZoom(this.mapWidth, this.mapHeight, sw, sh, this.cinematicCameraEnabled);
    this.targetCamZoom = this.camZoom;
    this.zoomAnchor = null;
    this.zoomGlideActive = false;
  }

  resumeCameraTracking(): void {
    this.lastCamSeq = -1;
    this.cinematicDirector.reset();
    this.lastCinematicLabel = '';
    this.onCinematicFocusChange?.('none', '');
  }

  resumeCinematicDirector(): void {
    this.cinematicDirector.resumeImmediately();
  }

  syncCameraImmediate(engine: StudioEngine): void {
    if (engine.cameraTarget) {
      this.currentTargetSeq = engine.cameraTarget.seq;
      const targetZoom = this.clampZoom(engine.cameraTarget.zoom);
      const clamped = this.computeClampedCameraGoal(
        engine.cameraTarget.x,
        engine.cameraTarget.y,
        targetZoom
      );
      this.camX = clamped.x;
      this.camY = clamped.y;
      this.camZoom = targetZoom;
      this.targetCamZoom = targetZoom;
      this.zoomAnchor = null;
      this.zoomGlideActive = false;
      this.lastCamSeq = engine.cameraTarget.seq;
    }
    this.particles = [];
    this.fxParticles = [];
    this.wakeRipples = [];
    this.seenMuzzleFlashes = new WeakSet();
    this.seenProjectiles = new WeakSet();
    this.seenExplosions = new WeakSet();
  }

  async syncActorTextures(actors: Record<string, { id: string; svg: string }>): Promise<void> {
    for (const actor of Object.values(actors)) {
      if (!this.actorTextures.has(actor.id)) {
        this.actorTextures.set(actor.id, await loadSvgOrUrlTexture(actor.svg, 64, 64));
      }
    }
  }

  focusRegion(engine: StudioEngine, regionId: string, zoomBoost = 3.2): void {
    const reg = engine.map.regions?.[regionId];
    if (!reg) return;
    const rw = Math.max(40, reg.bounds.maxX - reg.bounds.minX);
    const rh = Math.max(40, reg.bounds.maxY - reg.bounds.minY);
    const sw = Math.max(1, this.app.screen.width);
    const sh = Math.max(1, this.app.screen.height);
    const fitZoom = Math.min(sw / rw, sh / rh) * 0.65;
    engine.cameraTarget = {
      x: reg.center.x,
      y: reg.center.y,
      zoom: Math.max(1.2, Math.min(zoomBoost, fitZoom)),
      durationSec: 0.8,
      seq: (engine.cameraTarget?.seq ?? 0) + 1
    };
  }

  refreshAnchors(map: MapPack): void {
    this.anchorLabels = populateAnchorLayer(this.anchorLayer, map, this.editorOverlay.enabled);
  }

  async loadEngineAssets(engine: StudioEngine): Promise<void> {
    this.mapLayer.removeChildren();
    this.entityLayer.removeChildren();
    this.calloutLayer.removeChildren();
    this.countryTintGraphics.clear();
    this.overlayCache.countryTintDirty = true;
    this.geoHoverGraphics.clear();
    this.geoSelectGraphics.clear();
    this.craterGraphics.clear();
    this.wakeGraphics.clear();
    this.projectileGraphics.clear();
    this.explosionGraphics.clear();
    this.fxParticleGraphics.clear();
    this.targetingGraphics.clear();
    this.lockCandidate = null;
    this.cinematicDirector.reset();
    this.lastCinematicLabel = '';
    this.onStrikeLockChange?.('idle');
    this.onCinematicFocusChange?.('none', '');
    this.entityViews.clear();
    this.calloutViews.clear();
    this.particles = [];
    this.fxParticles = [];
    this.wakeRipples = [];
    this.seenMuzzleFlashes = new WeakSet();
    this.seenProjectiles = new WeakSet();
    this.seenExplosions = new WeakSet();
    this.selectedEntityId = null;
    this.hoveredRegionId = null;
    this.selectedRegionId = null;
    this.currentHitTest = engine.map.hitTest;
    this.onSelectionChange?.(null);

    this.overlayCache.hoverHighlightCacheKey = '';
    this.overlayCache.selectHighlightCacheKey = '';
    this.overlayCache.hadNavOverlay = false;
    this.overlayCache.hadActiveZones = false;
    this.overlayCache.hadActiveCraters = false;

    this.mapWidth = engine.map.width;
    this.mapHeight = engine.map.height;

    const mapTex = await loadSvgOrUrlTexture(engine.map.svgOrUrl, engine.map.width, engine.map.height);
    if (this.destroyed) return;
    const mapSprite = new Sprite(mapTex);
    mapSprite.width = engine.map.width;
    mapSprite.height = engine.map.height;
    const mapFrame = new Graphics()
      .rect(0, 0, engine.map.width, engine.map.height)
      .stroke({ width: 2, color: 0x334155, alpha: 0.9 });
    this.mapLayer.addChild(mapSprite, mapFrame);

    this.refreshAnchors(engine.map);
    await this.syncActorTextures(engine.actors);

    this.camX = engine.map.width / 2;
    this.camY = engine.map.height / 2;
    const sw = Math.max(1, this.app.screen.width);
    const sh = Math.max(1, this.app.screen.height);
    this.lastScreenW = sw;
    this.lastScreenH = sh;
    this.userAdjustedCamera = false;
    this.wasCinematicEnabled = this.cinematicCameraEnabled;
    this.camZoom = computeSafeFitZoom(engine.map.width, engine.map.height, sw, sh, this.cinematicCameraEnabled);
    this.targetCamZoom = this.camZoom;
    this.zoomAnchor = null;
    this.zoomGlideActive = false;
    this.cameraStage.position.set(sw / 2, sh / 2);
    this.cameraStage.scale.set(this.camZoom, this.camZoom * tiltToScaleYRatio(this.camTiltDeg));
    this.world.position.set(0, 0);
    this.world.scale.set(1, 1);
    this.world.rotation = (this.camBearingDeg * Math.PI) / 180;
    this.world.skew.set(0, 0);
    this.currentTargetSeq = engine.cameraTarget?.seq ?? 0;
    this.lastCamSeq = -1;
  }

  private stepCameraAndTransform(
    engine: StudioEngine,
    alpha: number,
    timeSec: number,
    safeDt: number,
    curSw: number,
    curSh: number
  ): { worldRotation: number; tiltCompY: number } {
    const self = this;
    const cam: CameraControllerState = {
      get camX() { return self.camX; },
      set camX(v) { self.camX = v; },
      get camY() { return self.camY; },
      set camY(v) { self.camY = v; },
      get camZoom() { return self.camZoom; },
      set camZoom(v) { self.camZoom = v; },
      get targetCamZoom() { return self.targetCamZoom; },
      set targetCamZoom(v) { self.targetCamZoom = v; },
      get zoomGlideActive() { return self.zoomGlideActive; },
      set zoomGlideActive(v) { self.zoomGlideActive = v; },
      get zoomAnchor() { return self.zoomAnchor; },
      set zoomAnchor(v) { self.zoomAnchor = v; },
      get camBearingDeg() { return self.camBearingDeg; },
      set camBearingDeg(v) { self.camBearingDeg = v; },
      get camTiltDeg() { return self.camTiltDeg; },
      set camTiltDeg(v) { self.camTiltDeg = v; },
      get targetBearingDeg() { return self.targetBearingDeg; },
      set targetBearingDeg(v) { self.targetBearingDeg = v; },
      get targetTiltDeg() { return self.targetTiltDeg; },
      set targetTiltDeg(v) { self.targetTiltDeg = v; },
      get lastCamSeq() { return self.lastCamSeq; },
      set lastCamSeq(v) { self.lastCamSeq = v; },
      get currentTargetSeq() { return self.currentTargetSeq; },
      set currentTargetSeq(v) { self.currentTargetSeq = v; },
      get userAdjustedCamera() { return self.userAdjustedCamera; },
      set userAdjustedCamera(v) { self.userAdjustedCamera = v; },
      get wasCinematicEnabled() { return self.wasCinematicEnabled; },
      set wasCinematicEnabled(v) { self.wasCinematicEnabled = v; },
      get lastScreenW() { return self.lastScreenW; },
      set lastScreenW(v) { self.lastScreenW = v; },
      get lastScreenH() { return self.lastScreenH; },
      set lastScreenH(v) { self.lastScreenH = v; },
      get lastCinematicLabel() { return self.lastCinematicLabel; },
      set lastCinematicLabel(v) { self.lastCinematicLabel = v; }
    };

    return stepRendererCameraAndTransform({
      engine,
      alpha,
      timeSec,
      safeDt,
      curSw,
      curSh,
      mapWidth: this.mapWidth,
      mapHeight: this.mapHeight,
      hideUIHelpers: this.hideUIHelpers,
      showAnchors: this.showAnchors,
      cinematicCameraEnabled: this.cinematicCameraEnabled,
      lockCandidate: this.lockCandidate,
      activePointersCount: this.activePointers.size,
      cinematicDirector: this.cinematicDirector,
      clampZoom: (z) => this.clampZoom(z),
      cam,
      cameraStage: this.cameraStage,
      world: this.world,
      anchorLayer: this.anchorLayer,
      anchorLabels: this.anchorLabels,
      onCinematicFocusChange: this.onCinematicFocusChange
    });
  }

  render(engine: StudioEngine, alpha: number, timeSec: number, frameDt = 1 / 60, isPlaying = true): void {
    if (this.destroyed) return;
    const safeDt = Math.max(0.0002, Math.min(0.05, Number.isFinite(frameDt) ? frameDt : 1 / 60));
    const curSw = Math.max(1, this.app.screen.width);
    const curSh = Math.max(1, this.app.screen.height);
    const { worldRotation, tiltCompY } = this.stepCameraAndTransform(engine, alpha, timeSec, safeDt, curSw, curSh);

    renderMapOverlays({
      engine,
      alpha,
      camZoom: this.camZoom,
      hideUIHelpers: this.hideUIHelpers,
      selectedEntityId: this.selectedEntityId,
      hoveredRegionId: this.hoveredRegionId,
      selectedRegionId: this.selectedRegionId,
      countryColorMap: this.countryColorMap,
      editorOverlay: this.editorOverlay,
      cache: this.overlayCache,
      layers: {
        countryTintGraphics: this.countryTintGraphics,
        geoHoverGraphics: this.geoHoverGraphics,
        geoSelectGraphics: this.geoSelectGraphics,
        navOverlay: this.navOverlay,
        zoneGraphics: this.zoneGraphics,
        craterGraphics: this.craterGraphics,
        pathGraphics: this.pathGraphics,
        arrowGraphics: this.arrowGraphics,
        pulseGraphics: this.pulseGraphics
      }
    });

    const entOut = renderEntitiesAndCallouts({
      engine,
      alpha,
      timeSec,
      safeDt,
      isPlaying,
      camZoom: this.camZoom,
      userUnitScale: this.userUnitScale,
      worldRotation,
      tiltCompY,
      hideUIHelpers: this.hideUIHelpers,
      selectedEntityId: this.selectedEntityId,
      actorTextures: this.actorTextures,
      entityViews: this.entityViews,
      calloutViews: this.calloutViews,
      particles: this.particles,
      wakeRipples: this.wakeRipples,
      entityLayer: this.entityLayer,
      calloutLayer: this.calloutLayer,
      wakeGraphics: this.wakeGraphics,
      particleGraphics: this.particleGraphics,
      worldToScreen: (pt) => this.worldToScreen(pt),
      lastEmittedSelPos: this.lastEmittedSelPos,
      onSelectedScreenPos: this.onSelectedScreenPos
    });
    this.lastUnitFactor = entOut.lastUnitFactor;
    this.lastEmittedSelPos = entOut.lastEmittedSelPos;

    renderCombatFx({
      engine,
      alpha,
      timeSec,
      safeDt,
      isPlaying,
      fxParticles: this.fxParticles,
      seenMuzzleFlashes: this.seenMuzzleFlashes,
      seenProjectiles: this.seenProjectiles,
      seenExplosions: this.seenExplosions,
      projectileGraphics: this.projectileGraphics,
      explosionGraphics: this.explosionGraphics,
      fxParticleGraphics: this.fxParticleGraphics
    });

    this.lockCandidate = renderTargetingLock({
      engine,
      alpha,
      timeSec,
      camZoom: this.camZoom,
      hideUIHelpers: this.hideUIHelpers,
      strikeModeConfig: this.strikeModeConfig,
      lockCandidate: this.lockCandidate,
      hoverWorldPt: this.hoverWorldPt,
      targetingGraphics: this.targetingGraphics,
      onStrikeLockChange: this.onStrikeLockChange
    });

    // تصيير الإطار يدوياً مرة واحدة فقط متزامنة مع حلقة 120 FPS الخارجية
    this.app.render();
  }

  destroy(): void {
    this.destroyed = true;
    this.cleanupListeners.forEach((fn) => fn());
    this.cleanupListeners = [];
    for (const tex of this.actorTextures.values()) {
      if (tex !== Texture.EMPTY) tex.destroy(true);
    }
    this.actorTextures.clear();
    try {
      this.app.destroy(true, { children: true });
    } catch {
      // Ignore destroy errors if init hadn't finished
    }
  }
}
