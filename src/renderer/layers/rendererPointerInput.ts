import {
  TwoFingerGestureSession,
  beginTwoFingerGesture,
  clampCameraState,
  clampTiltDeg,
  normalizeAngleDeg,
  stepTwoFingerGesture,
  unprojectScreenDeltaToWorld,
  unprojectScreenToWorld
} from '../../core/cameraTransform';
import { LOCK_MOVE_TOLERANCE_PX, StrikeLockPhase, StrikeModeConfig, TargetingLockCandidate } from '../../core/targetingLock';
import { Point } from '../../core/types';

export interface RendererPointerState {
  activePointers: Map<number, Point>;
  twoFingerSession: TwoFingerGestureSession | null;
  isOrbitDragging: boolean;
  pointerDownClient: Point | null;
  pinchUsed: boolean;
  painting: boolean;
  dragMoved: boolean;
  lockCandidate: TargetingLockCandidate | null;
  hoverWorldPt: Point | null;
  camX: number;
  camY: number;
  camZoom: number;
  targetCamZoom: number;
  zoomGlideActive: boolean;
  zoomAnchor: { sx: number; sy: number; wx: number; wy: number } | null;
  camBearingDeg: number;
  camTiltDeg: number;
  targetBearingDeg: number;
  targetTiltDeg: number;
  lastCamSeq: number;
  currentTargetSeq: number;
  userAdjustedCamera: boolean;
  hoveredRegionId: string | null;
  selectedEntityId: string | null;
  cinematicCameraEnabled: boolean;
  mapWidth: number;
  mapHeight: number;
  strikeModeConfig: StrikeModeConfig | null;
  editorOverlay: { enabled: boolean; paintActive: boolean };
}

export interface RendererPointerHost {
  canvas: HTMLCanvasElement;
  getScreenSize: () => { width: number; height: number };
  state: RendererPointerState;
  screenToWorld: (clientX: number, clientY: number) => Point;
  pickEntity: (wx: number, wy: number) => string | null;
  clampZoom: (z: number) => number;
  hitTestRegion: (pt: Point) => string | null;
  hasHitTest: () => boolean;
  notifyUserInteraction: (nowSec: number, holdSec: number) => void;
  resumeCinematicImmediately: () => void;
  emitCameraAngles: () => void;
  onStrikeLockChange?: (phase: StrikeLockPhase) => void;
  onMapPaint?: (pt: Point) => void;
  onMapClick?: (worldPt: Point, clickedEntityId: string | null, shiftKey?: boolean, lockPhase?: StrikeLockPhase) => void;
  onRegionHover?: (regionId: string | null) => void;
  onRegionDoubleClick?: (regionId: string) => void;
}

export function attachRendererPointerEvents(host: RendererPointerHost): () => void {
  const { canvas, state } = host;

  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  const onPointerDown = (e: PointerEvent) => {
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignore capture failures on synthetic events
    }
    const pt = { x: e.clientX, y: e.clientY };
    state.activePointers.set(e.pointerId, pt);

    if (state.activePointers.size >= 2) {
      state.pinchUsed = true;
      state.dragMoved = true;
      state.painting = false;
      state.isOrbitDragging = false;
      state.zoomGlideActive = false;
      state.zoomAnchor = null;
      state.lastCamSeq = state.currentTargetSeq;
      const pts = [...state.activePointers.values()];
      state.twoFingerSession = beginTwoFingerGesture(pts[0], pts[1]);
      if (state.lockCandidate) {
        if (state.lockCandidate.lastPhase !== 'idle') {
          host.onStrikeLockChange?.('idle');
        }
        state.lockCandidate = null;
      }
      return;
    }

    state.pinchUsed = false;
    state.twoFingerSession = null;

    if (e.button === 2 || (e.button === 0 && e.altKey && !state.editorOverlay.enabled)) {
      state.isOrbitDragging = true;
      state.painting = false;
      state.dragMoved = false;
      state.pointerDownClient = pt;
      state.lockCandidate = null;
      return;
    }
    state.isOrbitDragging = false;

    if (state.editorOverlay.enabled && (e.shiftKey || (state.editorOverlay.paintActive && e.button === 0))) {
      state.painting = true;
      state.dragMoved = true;
      host.onMapPaint?.(host.screenToWorld(e.clientX, e.clientY));
      return;
    }
    state.painting = false;
    state.dragMoved = false;
    state.pointerDownClient = pt;

    if (state.strikeModeConfig && e.button === 0) {
      const wpt = host.screenToWorld(e.clientX, e.clientY);
      state.hoverWorldPt = wpt;
      state.lockCandidate = {
        startClient: pt,
        currentClient: pt,
        worldPt: wpt,
        targetEntityId: host.pickEntity(wpt.x, wpt.y),
        startedAtMs: performance.now(),
        lastPhase: 'idle'
      };
    } else {
      state.lockCandidate = null;
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!state.activePointers.has(e.pointerId)) return;
    const { width: sw, height: sh } = host.getScreenSize();

    if (state.activePointers.size >= 2) {
      state.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const ptsAfter = [...state.activePointers.values()];
      const p1 = ptsAfter[0];
      const p2 = ptsAfter[1];
      if (!state.twoFingerSession) {
        state.twoFingerSession = beginTwoFingerGesture(p1, p2);
        return;
      }

      const out = stepTwoFingerGesture(
        state.twoFingerSession,
        p1,
        p2,
        state.camZoom,
        state.camBearingDeg,
        state.camTiltDeg
      );

      const nextBearing = normalizeAngleDeg(state.targetBearingDeg + out.bearingDeltaDeg);
      const nextTilt = clampTiltDeg(state.targetTiltDeg + out.tiltDeltaDeg);
      const nextZoom = host.clampZoom(state.camZoom * out.zoomFactor);

      const clamped = clampCameraState(
        state.camX - out.panWorldDx,
        state.camY - out.panWorldDy,
        nextZoom,
        state.mapWidth,
        state.mapHeight,
        sw,
        sh,
        state.cinematicCameraEnabled,
        nextBearing,
        nextTilt
      );

      state.camZoom = clamped.zoom;
      state.camX = clamped.x;
      state.camY = clamped.y;
      state.targetBearingDeg = nextBearing;
      state.targetTiltDeg = nextTilt;
      state.camBearingDeg = nextBearing;
      state.camTiltDeg = nextTilt;
      state.lastCamSeq = state.currentTargetSeq;
      state.userAdjustedCamera = true;
      host.notifyUserInteraction(performance.now() / 1000, 2.6);
      host.emitCameraAngles();
      return;
    }

    const prev = state.activePointers.get(e.pointerId)!;
    state.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (state.painting || (state.editorOverlay.enabled && e.shiftKey)) {
      host.onMapPaint?.(host.screenToWorld(e.clientX, e.clientY));
      return;
    }

    if (state.isOrbitDragging) {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      if (state.pointerDownClient && Math.hypot(e.clientX - state.pointerDownClient.x, e.clientY - state.pointerDownClient.y) > 4) {
        state.dragMoved = true;
        state.userAdjustedCamera = true;
        host.notifyUserInteraction(performance.now() / 1000, 2.6);
      }
      if (Math.abs(dx) >= Math.abs(dy) * 0.75) {
        state.targetBearingDeg = normalizeAngleDeg(state.targetBearingDeg + Math.max(-10, Math.min(10, dx * 0.28)));
      }
      if (Math.abs(dy) >= Math.abs(dx) * 0.75) {
        state.targetTiltDeg = clampTiltDeg(state.targetTiltDeg - Math.max(-6, Math.min(6, dy * 0.24)));
      }
      state.camBearingDeg = state.targetBearingDeg;
      state.camTiltDeg = state.targetTiltDeg;
      host.emitCameraAngles();
      return;
    }

    if (state.lockCandidate && state.strikeModeConfig) {
      const moveFromStart = Math.hypot(
        e.clientX - state.lockCandidate.startClient.x,
        e.clientY - state.lockCandidate.startClient.y
      );
      if (state.lockCandidate.lastPhase === 'idle' && moveFromStart > LOCK_MOVE_TOLERANCE_PX) {
        state.lockCandidate = null;
      } else {
        state.lockCandidate.currentClient = { x: e.clientX, y: e.clientY };
        const wpt = host.screenToWorld(e.clientX, e.clientY);
        state.lockCandidate.worldPt = wpt;
        state.hoverWorldPt = wpt;
        const hit = host.pickEntity(wpt.x, wpt.y);
        if (hit) state.lockCandidate.targetEntityId = hit;
        return;
      }
    }

    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    if (state.pointerDownClient && Math.hypot(e.clientX - state.pointerDownClient.x, e.clientY - state.pointerDownClient.y) > 5) {
      state.dragMoved = true;
      state.lastCamSeq = state.currentTargetSeq;
      state.userAdjustedCamera = true;
      host.notifyUserInteraction(performance.now() / 1000, 2.6);
    }
    const worldDelta = unprojectScreenDeltaToWorld(dx, dy, state.camZoom, state.camBearingDeg, state.camTiltDeg);
    const clampedPan = clampCameraState(
      state.camX - worldDelta.dx,
      state.camY - worldDelta.dy,
      state.camZoom,
      state.mapWidth,
      state.mapHeight,
      sw,
      sh,
      state.cinematicCameraEnabled,
      state.camBearingDeg,
      state.camTiltDeg
    );
    state.camX = clampedPan.x;
    state.camY = clampedPan.y;
  };

  const onPointerUp = (e: PointerEvent) => {
    const hadPointer = state.activePointers.has(e.pointerId);
    state.activePointers.delete(e.pointerId);
    try {
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore capture errors
    }
    if (!hadPointer) return;

    if (state.activePointers.size < 2) {
      state.twoFingerSession = null;
    }
    if (state.activePointers.size > 0) return;

    const wasPainting = state.painting;
    const wasPinch = state.pinchUsed;
    const wasMoved = state.dragMoved;
    const wasOrbit = state.isOrbitDragging;
    const lockCand = state.lockCandidate;
    state.lockCandidate = null;
    state.painting = false;
    state.isOrbitDragging = false;
    state.pointerDownClient = null;

    if (wasOrbit) return;

    if (lockCand && lockCand.lastPhase !== 'idle') {
      const firedPhase = lockCand.lastPhase;
      host.onStrikeLockChange?.('idle');
      if (!wasPainting && !wasPinch) {
        host.resumeCinematicImmediately();
        host.onMapClick?.(lockCand.worldPt, lockCand.targetEntityId, e.shiftKey, firedPhase);
      }
      return;
    }

    if (!wasPainting && !wasPinch && !wasMoved && e.target === canvas) {
      const pt = host.screenToWorld(e.clientX, e.clientY);
      const hit = host.pickEntity(pt.x, pt.y);
      if (state.strikeModeConfig || state.selectedEntityId) {
        host.resumeCinematicImmediately();
      }
      host.onMapClick?.(pt, hit, e.shiftKey, 'idle');
    }
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    state.lastCamSeq = state.currentTargetSeq;
    state.userAdjustedCamera = true;
    host.notifyUserInteraction(performance.now() / 1000, 2.6);
    if (e.shiftKey || e.altKey) {
      state.targetBearingDeg = normalizeAngleDeg(state.targetBearingDeg + (e.deltaY > 0 ? 8 : -8));
      host.emitCameraAngles();
      return;
    }
    const { width: sw, height: sh } = host.getScreenSize();
    const normDelta = Math.max(-180, Math.min(180, e.deltaY));
    const factor = Math.exp(-normDelta * 0.0014);
    const baseZoom = state.zoomGlideActive ? state.targetCamZoom : state.camZoom;
    const nextZoom = host.clampZoom(baseZoom * factor);

    const rect = canvas.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) * sw) / Math.max(1, rect.width);
    const sy = ((e.clientY - rect.top) * sh) / Math.max(1, rect.height);
    const worldUnderCursor = unprojectScreenToWorld(
      sx,
      sy,
      state.camX,
      state.camY,
      state.camZoom,
      sw,
      sh,
      state.cinematicCameraEnabled,
      state.camBearingDeg,
      state.camTiltDeg
    );
    state.targetCamZoom = nextZoom;
    state.zoomAnchor = { sx, sy, wx: worldUnderCursor.x, wy: worldUnderCursor.y };
    state.zoomGlideActive = true;
  };

  const onCanvasHoverMove = (e: PointerEvent) => {
    if (state.activePointers.size > 0) return;
    const pt = host.screenToWorld(e.clientX, e.clientY);
    state.hoverWorldPt = pt;
    if (!host.hasHitTest()) return;
    const hit = host.hitTestRegion(pt);
    if (hit !== state.hoveredRegionId) {
      state.hoveredRegionId = hit;
      host.onRegionHover?.(hit);
    }
  };

  const onCanvasDblClick = (e: MouseEvent) => {
    if (!host.hasHitTest()) return;
    const pt = host.screenToWorld(e.clientX, e.clientY);
    const hit = host.hitTestRegion(pt);
    if (hit) host.onRegionDoubleClick?.(hit);
  };

  const onPointerLeave = () => {
    state.hoverWorldPt = null;
    if (state.hoveredRegionId !== null) {
      state.hoveredRegionId = null;
      host.onRegionHover?.(null);
    }
  };

  canvas.addEventListener('contextmenu', onContextMenu);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onCanvasHoverMove);
  canvas.addEventListener('pointerleave', onPointerLeave);
  canvas.addEventListener('dblclick', onCanvasDblClick);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  return () => {
    canvas.removeEventListener('contextmenu', onContextMenu);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onCanvasHoverMove);
    canvas.removeEventListener('pointerleave', onPointerLeave);
    canvas.removeEventListener('dblclick', onCanvasDblClick);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    canvas.removeEventListener('wheel', onWheel);
  };
}
