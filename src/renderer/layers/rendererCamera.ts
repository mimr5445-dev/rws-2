import { Container, Graphics, Text } from 'pixi.js';
import {
  clampCameraState,
  clampTiltDeg,
  computeSafeFitZoom,
  computeWorldTransform,
  frameRateIndependentEase,
  normalizeAngleDeg,
  shortestAngleDiffDeg,
  tiltToScaleYRatio,
  unprojectScreenToWorld
} from '../../core/cameraTransform';
import { CinematicDirector, CinematicFocusKind } from '../../core/cinematicDirector';
import { TargetingLockCandidate } from '../../core/targetingLock';
import { MapPack, Point } from '../../core/types';
import { StudioEngine } from '../../engine/engine';
import { lerp } from './rendererUtils';

export interface CameraControllerState {
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
  wasCinematicEnabled: boolean;
  lastScreenW: number;
  lastScreenH: number;
  lastCinematicLabel: string;
}

export function populateAnchorLayer(
  anchorLayer: Container,
  map: MapPack,
  editorEnabled: boolean
): Text[] {
  anchorLayer.removeChildren();
  const labels: Text[] = [];
  const isWorldMap = map.geoLevel === 'world';
  if (isWorldMap && !editorEnabled) return labels;
  for (const [id, pt] of Object.entries(map.anchors)) {
    const dot = new Graphics()
      .circle(0, 0, 5)
      .fill({ color: 0xfef08a, alpha: 0.92 })
      .stroke({ width: 2, color: 0x0f172a });
    dot.position.set(pt.x, pt.y);
    // لا تُعرض أسماء الدول أو المراسي على خرائط العالم، حتى في وضع التحرير.
    if (isWorldMap || map.geoLevel === 'country') {
      anchorLayer.addChild(dot);
      continue;
    }
    const anchorText =
      map.geoLevel === 'country'
        ? id
        : pt.label && pt.label !== id
          ? `${pt.label} (${id})`
          : id;
    const label = new Text({
      text: anchorText,
      style: {
        fontFamily: 'IBM Plex Sans Arabic, system-ui, sans-serif',
        fontSize: map.geoLevel === 'country' ? 10 : 12,
        fontWeight: '600',
        fill: map.geoLevel === 'country' ? 0xbae6fd : 0xe2e8f0,
        stroke: { color: 0x090f1a, width: 3.5 }
      }
    });
    label.anchor.set(0.5, 1);
    label.position.set(pt.x, pt.y - 9);
    labels.push(label);
    anchorLayer.addChild(dot, label);
  }
  return labels;
}

export function stepRendererCameraAndTransform(params: {
  engine: StudioEngine;
  alpha: number;
  timeSec: number;
  safeDt: number;
  curSw: number;
  curSh: number;
  mapWidth: number;
  mapHeight: number;
  hideUIHelpers: boolean;
  showAnchors: boolean;
  cinematicCameraEnabled: boolean;
  lockCandidate: TargetingLockCandidate | null;
  activePointersCount: number;
  cinematicDirector: CinematicDirector;
  clampZoom: (z: number) => number;
  cam: CameraControllerState;
  cameraStage: Container;
  world: Container;
  anchorLayer: Container;
  anchorLabels: Text[];
  onCinematicFocusChange?: (kind: CinematicFocusKind, labelAr: string) => void;
}): { worldRotation: number; tiltCompY: number } {
  const {
    engine,
    alpha,
    timeSec,
    safeDt,
    curSw,
    curSh,
    mapWidth,
    mapHeight,
    hideUIHelpers,
    showAnchors,
    cinematicCameraEnabled,
    lockCandidate,
    activePointersCount,
    cinematicDirector,
    clampZoom,
    cam,
    cameraStage,
    world,
    anchorLayer,
    anchorLabels,
    onCinematicFocusChange
  } = params;

  const clampGoal = (tx: number, ty: number, tz: number): Point => {
    const clamped = clampCameraState(
      tx,
      ty,
      tz,
      mapWidth,
      mapHeight,
      curSw,
      curSh,
      cinematicCameraEnabled,
      cam.camBearingDeg,
      cam.camTiltDeg
    );
    return { x: clamped.x, y: clamped.y };
  };

  if (cinematicCameraEnabled !== cam.wasCinematicEnabled) {
    cam.wasCinematicEnabled = cinematicCameraEnabled;
    if (!cam.userAdjustedCamera && !engine.cameraTarget) {
      cam.camX = mapWidth / 2;
      cam.camY = mapHeight / 2;
      cam.camZoom = computeSafeFitZoom(mapWidth, mapHeight, curSw, curSh, cinematicCameraEnabled);
    }
  }
  if (curSw !== cam.lastScreenW || curSh !== cam.lastScreenH) {
    cam.lastScreenW = curSw;
    cam.lastScreenH = curSh;
    if (!cam.userAdjustedCamera && !engine.cameraTarget) {
      cam.camX = mapWidth / 2;
      cam.camY = mapHeight / 2;
      cam.camZoom = computeSafeFitZoom(mapWidth, mapHeight, curSw, curSh, cinematicCameraEnabled);
    }
  }

  anchorLayer.visible = !hideUIHelpers && showAnchors;
  if (engine.cameraTarget) {
    cam.currentTargetSeq = engine.cameraTarget.seq;
  }

  const cinCandidate =
    cinematicCameraEnabled && !lockCandidate && activePointersCount === 0
      ? cinematicDirector.evaluate(engine, timeSec, { width: curSw, height: curSh }, alpha)
      : null;

  const cinActiveLiveEvent = Boolean(cinCandidate && cinCandidate.focusKind !== 'establishing');
  const hasScriptedCamera = Boolean(
    engine.cameraTarget &&
      engine.cameraTarget.seq !== cam.lastCamSeq &&
      engine.cameraTarget.seq > 0 &&
      !cinActiveLiveEvent
  );

  if (cinActiveLiveEvent && engine.cameraTarget) {
    cam.lastCamSeq = engine.cameraTarget.seq;
  }

  if (hasScriptedCamera && engine.cameraTarget) {
    cam.zoomGlideActive = false;
    cam.zoomAnchor = null;
    const targetZoom = clampZoom(engine.cameraTarget.zoom);
    const speedFactor = frameRateIndependentEase(3.6 / Math.max(0.25, engine.cameraTarget.durationSec), safeDt);
    cam.camZoom = lerp(cam.camZoom, targetZoom, speedFactor);
    cam.targetCamZoom = cam.camZoom;
    const goalNow = clampGoal(engine.cameraTarget.x, engine.cameraTarget.y, cam.camZoom);
    cam.camX = lerp(cam.camX, goalNow.x, speedFactor);
    cam.camY = lerp(cam.camY, goalNow.y, speedFactor);
    const finalGoal = clampGoal(cam.camX, cam.camY, cam.camZoom);
    cam.camX = finalGoal.x;
    cam.camY = finalGoal.y;

    const finalTargetGoal = clampGoal(engine.cameraTarget.x, engine.cameraTarget.y, targetZoom);
    if (
      Math.hypot(cam.camX - finalTargetGoal.x, cam.camY - finalTargetGoal.y) < 0.8 &&
      Math.abs(cam.camZoom - targetZoom) < 0.005
    ) {
      cam.lastCamSeq = engine.cameraTarget.seq;
    }
    if (cam.lastCinematicLabel !== '') {
      cam.lastCinematicLabel = '';
      onCinematicFocusChange?.('none', '');
    }
  } else if (cinCandidate) {
    cam.zoomGlideActive = false;
    cam.zoomAnchor = null;
    const targetZoom = clampZoom(cinCandidate.zoom);
    const posEase = frameRateIndependentEase(cinCandidate.focusKind === 'explosion' ? 4.2 : 3.0, safeDt);
    const zoomEase = frameRateIndependentEase(cinCandidate.focusKind === 'establishing' ? 1.8 : 2.5, safeDt);
    cam.camZoom = lerp(cam.camZoom, targetZoom, zoomEase);
    cam.targetCamZoom = cam.camZoom;
    const goalNow = clampGoal(cinCandidate.x, cinCandidate.y, cam.camZoom);
    cam.camX = lerp(cam.camX, goalNow.x, posEase);
    cam.camY = lerp(cam.camY, goalNow.y, posEase);
    const clampedNow = clampGoal(cam.camX, cam.camY, cam.camZoom);
    cam.camX = clampedNow.x;
    cam.camY = clampedNow.y;
    if (cinCandidate.labelAr !== cam.lastCinematicLabel) {
      cam.lastCinematicLabel = cinCandidate.labelAr;
      onCinematicFocusChange?.(cinCandidate.focusKind, cinCandidate.labelAr);
    }
  } else if (cam.lastCinematicLabel !== '') {
    cam.lastCinematicLabel = '';
    onCinematicFocusChange?.('none', '');
  }

  if (cam.zoomGlideActive) {
    const zEase = frameRateIndependentEase(18, safeDt);
    const nextZ =
      Math.abs(cam.targetCamZoom - cam.camZoom) < 0.0015
        ? cam.targetCamZoom
        : lerp(cam.camZoom, cam.targetCamZoom, zEase);
    if (cam.zoomAnchor && activePointersCount === 0) {
      const after = unprojectScreenToWorld(
        cam.zoomAnchor.sx,
        cam.zoomAnchor.sy,
        cam.camX,
        cam.camY,
        nextZ,
        curSw,
        curSh,
        cinematicCameraEnabled,
        cam.camBearingDeg,
        cam.camTiltDeg
      );
      cam.camX += cam.zoomAnchor.wx - after.x;
      cam.camY += cam.zoomAnchor.wy - after.y;
    }
    cam.camZoom = nextZ;
    if (Math.abs(cam.targetCamZoom - cam.camZoom) < 0.0015) {
      cam.camZoom = cam.targetCamZoom;
      cam.zoomGlideActive = false;
      cam.zoomAnchor = null;
    }
  }

  let shakeX = 0;
  let shakeY = 0;
  for (const ex of engine.explosions) {
    if (ex.progress < 0.35) {
      const amp = (1 - ex.progress / 0.35) * (ex.kind === 'missile' ? 5.5 : 3.5);
      shakeX += Math.sin(timeSec * 65 + ex.x) * amp;
      shakeY += Math.cos(timeSec * 58 + ex.y) * amp;
    }
  }

  const angleEase = frameRateIndependentEase(14, safeDt);
  const diffB = shortestAngleDiffDeg(cam.targetBearingDeg, cam.camBearingDeg);
  cam.camBearingDeg =
    Math.abs(diffB) < 0.05 ? cam.targetBearingDeg : normalizeAngleDeg(cam.camBearingDeg + diffB * angleEase);
  const diffT = cam.targetTiltDeg - cam.camTiltDeg;
  cam.camTiltDeg =
    Math.abs(diffT) < 0.05 ? cam.targetTiltDeg : clampTiltDeg(cam.camTiltDeg + diffT * angleEase);

  const sanitizedCam = clampCameraState(
    cam.camX,
    cam.camY,
    cam.camZoom,
    mapWidth,
    mapHeight,
    curSw,
    curSh,
    cinematicCameraEnabled,
    cam.camBearingDeg,
    cam.camTiltDeg
  );
  cam.camX = sanitizedCam.x;
  cam.camY = sanitizedCam.y;
  cam.camZoom = sanitizedCam.zoom;

  const mtx = computeWorldTransform(
    cam.camX,
    cam.camY,
    cam.camZoom,
    mapWidth,
    mapHeight,
    curSw,
    curSh,
    cinematicCameraEnabled,
    shakeX,
    shakeY,
    cam.camBearingDeg,
    cam.camTiltDeg
  );
  cameraStage.position.set(mtx.stageX, mtx.stageY);
  cameraStage.scale.set(mtx.stageScaleX, mtx.stageScaleY);
  cameraStage.rotation = 0;
  cameraStage.skew.set(0, 0);

  world.position.set(0, 0);
  world.scale.set(1, 1);
  world.pivot.set(mtx.worldPivotX, mtx.worldPivotY);
  world.rotation = mtx.worldRotation;
  world.skew.set(0, 0);

  const tiltCompY = 1 / tiltToScaleYRatio(cam.camTiltDeg);
  if (anchorLayer.visible) {
    for (const lbl of anchorLabels) {
      lbl.rotation = -mtx.worldRotation;
      lbl.scale.set(1, tiltCompY);
    }
  }
  return { worldRotation: mtx.worldRotation, tiltCompY };
}
