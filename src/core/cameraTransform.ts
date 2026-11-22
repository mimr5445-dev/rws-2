export const MAX_TILT_DEG = 52;

export interface SafeViewportFrame {
  screenWidth: number;
  screenHeight: number;
  topInset: number;
  bottomInset: number;
  safeWidth: number;
  safeHeight: number;
  centerX: number;
  centerY: number;
}

export interface ClampedCameraState {
  x: number;
  y: number;
  zoom: number;
}

export interface CameraAngleState {
  bearingDeg: number;
  tiltDeg: number;
}

export interface CameraAnglePreset {
  id: string;
  label: string;
  bearingDeg: number;
  tiltDeg: number;
}

export const CAMERA_ANGLE_PRESETS: CameraAnglePreset[] = [
  { id: 'top', label: 'علوية 0°', bearingDeg: 0, tiltDeg: 0 },
  { id: 'tactical', label: 'تكتيكية 35°', bearingDeg: 0, tiltDeg: 35 },
  { id: 'dramatic', label: 'درامية 48°', bearingDeg: -24, tiltDeg: 48 },
  { id: 'east', label: 'يمين +35°', bearingDeg: 35, tiltDeg: 32 },
  { id: 'west', label: 'يسار -35°', bearingDeg: -35, tiltDeg: 32 }
];

export interface WorldTransformMatrixParams {
  posX: number;
  posY: number;
  scaleX: number;
  scaleY: number;
  pivotX: number;
  pivotY: number;
  rotation: number;
  skewX: number;
  skewY: number;
  // Two-stage 2.5D transform parameters (outer cameraStage + inner rotated world)
  stageX: number;
  stageY: number;
  stageScaleX: number;
  stageScaleY: number;
  worldPivotX: number;
  worldPivotY: number;
  worldRotation: number;
  bearingDeg: number;
  tiltDeg: number;
}

export function normalizeAngleDeg(deg: number): number {
  if (!Number.isFinite(deg)) return 0;
  let wrapped = ((deg + 180) % 360 + 360) % 360 - 180;
  if (wrapped === -180) wrapped = 180;
  return Object.is(wrapped, -0) ? 0 : wrapped;
}

export function shortestAngleDiffDeg(targetDeg: number, currentDeg: number): number {
  return normalizeAngleDeg(targetDeg - currentDeg);
}

export function clampTiltDeg(deg: number): number {
  if (!Number.isFinite(deg)) return 0;
  return Math.max(0, Math.min(MAX_TILT_DEG, deg));
}

export function tiltToScaleYRatio(tiltDeg: number): number {
  const rad = (clampTiltDeg(tiltDeg) * Math.PI) / 180;
  return Math.max(0.55, Math.cos(rad));
}

export function getSafeViewportFrame(
  screenWidth: number,
  screenHeight: number,
  cinematicEnabled: boolean
): SafeViewportFrame {
  const sw = Number.isFinite(screenWidth) && screenWidth > 0 ? screenWidth : 1;
  const sh = Number.isFinite(screenHeight) && screenHeight > 0 ? screenHeight : 1;
  const topInset = cinematicEnabled ? Math.min(56, sh * 0.1) : 0;
  const bottomInset = cinematicEnabled ? Math.min(64, sh * 0.12) : 0;
  const safeHeight = Math.max(1, sh - topInset - bottomInset);
  return {
    screenWidth: sw,
    screenHeight: sh,
    topInset,
    bottomInset,
    safeWidth: sw,
    safeHeight,
    centerX: sw / 2,
    centerY: topInset + safeHeight / 2
  };
}

export function computeSafeFitZoom(
  mapWidth: number,
  mapHeight: number,
  screenWidth: number,
  screenHeight: number,
  cinematicEnabled: boolean
): number {
  const mw = Number.isFinite(mapWidth) && mapWidth > 0 ? mapWidth : 1;
  const mh = Number.isFinite(mapHeight) && mapHeight > 0 ? mapHeight : 1;
  const frame = getSafeViewportFrame(screenWidth, screenHeight, cinematicEnabled);
  const fillRatio = cinematicEnabled ? 0.96 : 0.94;
  return Math.min(frame.safeWidth / mw, frame.safeHeight / mh) * fillRatio;
}

export function getMinAllowedZoom(
  mapWidth: number,
  mapHeight: number,
  screenWidth: number,
  screenHeight: number,
  cinematicEnabled: boolean
): number {
  const fitZoom = computeSafeFitZoom(mapWidth, mapHeight, screenWidth, screenHeight, cinematicEnabled);
  return Math.max(0.08, Math.min(0.28, fitZoom * 0.72));
}

export function clampCameraState(
  targetX: number,
  targetY: number,
  targetZoom: number,
  mapWidth: number,
  mapHeight: number,
  screenWidth: number,
  screenHeight: number,
  cinematicEnabled: boolean,
  bearingDeg = 0,
  tiltDeg = 0
): ClampedCameraState {
  const mw = Number.isFinite(mapWidth) && mapWidth > 0 ? mapWidth : 1;
  const mh = Number.isFinite(mapHeight) && mapHeight > 0 ? mapHeight : 1;
  const frame = getSafeViewportFrame(screenWidth, screenHeight, cinematicEnabled);
  const minZoom = getMinAllowedZoom(mw, mh, frame.screenWidth, frame.screenHeight, cinematicEnabled);
  const fitZoom = computeSafeFitZoom(mw, mh, frame.screenWidth, frame.screenHeight, cinematicEnabled);
  const rawZoom = Number.isFinite(targetZoom) && targetZoom > 0 ? targetZoom : fitZoom;
  const zoom = Math.max(minZoom, Math.min(6.0, rawZoom));

  const rawX = Number.isFinite(targetX) ? targetX : mw / 2;
  const rawY = Number.isFinite(targetY) ? targetY : mh / 2;

  const normBearing = normalizeAngleDeg(bearingDeg);
  const normTilt = clampTiltDeg(tiltDeg);
  const scaleYRatio = tiltToScaleYRatio(normTilt);

  // When unrotated & flat, keep exact viewport-edge clamping; when angled/tilted,
  // project the rotated viewport extents onto world axes (bounded cleanly inside map).
  if (Math.abs(normBearing) < 0.01 && normTilt < 0.01) {
    const halfW = frame.safeWidth / (2 * zoom);
    const halfH = frame.safeHeight / (2 * zoom);
    const x = halfW * 2 >= mw ? mw / 2 : Math.max(halfW, Math.min(mw - halfW, rawX));
    const y = halfH * 2 >= mh ? mh / 2 : Math.max(halfH, Math.min(mh - halfH, rawY));
    return { x, y, zoom };
  }

  const rad = (normBearing * Math.PI) / 180;
  const absCos = Math.abs(Math.cos(rad));
  const absSin = Math.abs(Math.sin(rad));
  const viewHalfX = frame.safeWidth / (2 * zoom);
  const viewHalfY = frame.safeHeight / (2 * zoom * scaleYRatio);
  const halfWorldW = viewHalfX * absCos + viewHalfY * absSin;
  const halfWorldH = viewHalfX * absSin + viewHalfY * absCos;

  // Allow focusing up to 22% margin from map borders when tilted/rotated so corners remain reachable
  const marginX = Math.min(mw * 0.45, Math.max(0, halfWorldW * 0.65));
  const marginY = Math.min(mh * 0.45, Math.max(0, halfWorldH * 0.65));
  const x = halfWorldW * 2 >= mw ? mw / 2 : Math.max(marginX, Math.min(mw - marginX, rawX));
  const y = halfWorldH * 2 >= mh ? mh / 2 : Math.max(marginY, Math.min(mh - marginY, rawY));

  return { x, y, zoom };
}

export function computeWorldTransform(
  camX: number,
  camY: number,
  camZoom: number,
  mapWidth: number,
  mapHeight: number,
  screenWidth: number,
  screenHeight: number,
  cinematicEnabled: boolean,
  shakeX = 0,
  shakeY = 0,
  bearingDeg = 0,
  tiltDeg = 0
): WorldTransformMatrixParams {
  const mw = Number.isFinite(mapWidth) && mapWidth > 0 ? mapWidth : 1;
  const mh = Number.isFinite(mapHeight) && mapHeight > 0 ? mapHeight : 1;
  const normBearing = normalizeAngleDeg(bearingDeg);
  const normTilt = clampTiltDeg(tiltDeg);
  const scaleYRatio = tiltToScaleYRatio(normTilt);
  const frame = getSafeViewportFrame(screenWidth, screenHeight, cinematicEnabled);
  const clamped = clampCameraState(
    camX,
    camY,
    camZoom,
    mw,
    mh,
    frame.screenWidth,
    frame.screenHeight,
    cinematicEnabled,
    normBearing,
    normTilt
  );

  const halfW = frame.safeWidth / (2 * clamped.zoom);
  const halfH = frame.safeHeight / (2 * clamped.zoom * scaleYRatio);
  const safeShakeX = Number.isFinite(shakeX) && halfW * 2 < mw ? Math.max(-8, Math.min(8, shakeX)) : 0;
  const safeShakeY = Number.isFinite(shakeY) && halfH * 2 < mh ? Math.max(-8, Math.min(8, shakeY)) : 0;
  const worldRotation = (normBearing * Math.PI) / 180;

  return {
    posX: frame.centerX + safeShakeX,
    posY: frame.centerY + safeShakeY,
    scaleX: clamped.zoom,
    scaleY: clamped.zoom * scaleYRatio,
    pivotX: clamped.x,
    pivotY: clamped.y,
    rotation: 0,
    skewX: 0,
    skewY: 0,
    stageX: frame.centerX + safeShakeX,
    stageY: frame.centerY + safeShakeY,
    stageScaleX: clamped.zoom,
    stageScaleY: clamped.zoom * scaleYRatio,
    worldPivotX: clamped.x,
    worldPivotY: clamped.y,
    worldRotation,
    bearingDeg: normBearing,
    tiltDeg: normTilt
  };
}

export function projectWorldToScreen(
  worldX: number,
  worldY: number,
  camX: number,
  camY: number,
  camZoom: number,
  screenWidth: number,
  screenHeight: number,
  cinematicEnabled: boolean,
  bearingDeg = 0,
  tiltDeg = 0
): { x: number; y: number } {
  const frame = getSafeViewportFrame(screenWidth, screenHeight, cinematicEnabled);
  const safeZoom = Number.isFinite(camZoom) && camZoom > 0 ? camZoom : 1;
  const rad = (normalizeAngleDeg(bearingDeg) * Math.PI) / 180;
  const scaleYRatio = tiltToScaleYRatio(tiltDeg);
  const dx = worldX - camX;
  const dy = worldY - camY;
  const cosR = Math.cos(rad);
  const sinR = Math.sin(rad);
  const rx = dx * cosR - dy * sinR;
  const ry = dx * sinR + dy * cosR;
  return {
    x: rx * safeZoom + frame.centerX,
    y: ry * safeZoom * scaleYRatio + frame.centerY
  };
}

export function unprojectScreenToWorld(
  screenX: number,
  screenY: number,
  camX: number,
  camY: number,
  camZoom: number,
  screenWidth: number,
  screenHeight: number,
  cinematicEnabled: boolean,
  bearingDeg = 0,
  tiltDeg = 0
): { x: number; y: number } {
  const frame = getSafeViewportFrame(screenWidth, screenHeight, cinematicEnabled);
  const safeZoom = Number.isFinite(camZoom) && camZoom > 0 ? camZoom : 1;
  const rad = (normalizeAngleDeg(bearingDeg) * Math.PI) / 180;
  const scaleYRatio = tiltToScaleYRatio(tiltDeg);
  const rx = (screenX - frame.centerX) / safeZoom;
  const ry = (screenY - frame.centerY) / (safeZoom * scaleYRatio);
  const cosR = Math.cos(rad);
  const sinR = Math.sin(rad);
  return {
    x: camX + rx * cosR + ry * sinR,
    y: camY - rx * sinR + ry * cosR
  };
}

export function unprojectScreenDeltaToWorld(
  dxScreen: number,
  dyScreen: number,
  camZoom: number,
  bearingDeg = 0,
  tiltDeg = 0
): { dx: number; dy: number } {
  const safeZoom = Number.isFinite(camZoom) && camZoom > 0 ? camZoom : 1;
  const rad = (normalizeAngleDeg(bearingDeg) * Math.PI) / 180;
  const scaleYRatio = tiltToScaleYRatio(tiltDeg);
  const rx = dxScreen / safeZoom;
  const ry = dyScreen / (safeZoom * scaleYRatio);
  const cosR = Math.cos(rad);
  const sinR = Math.sin(rad);
  return {
    dx: rx * cosR + ry * sinR,
    dy: -rx * sinR + ry * cosR
  };
}

export interface TwoFingerGestureSession {
  startDist: number;
  prevDist: number;
  startAngleRad: number;
  prevAngleRad: number;
  startMidX: number;
  startMidY: number;
  prevMidX: number;
  prevMidY: number;
  twistUnlocked: boolean;
  horizUnlocked: boolean;
  vertUnlocked: boolean;
  emaPinch: number;
  emaHoriz: number;
  emaVert: number;
}

export interface TwoFingerGestureOutput {
  zoomFactor: number;
  bearingDeltaDeg: number;
  tiltDeltaDeg: number;
  panWorldDx: number;
  panWorldDy: number;
}

function unwrapAngleDeltaRad(curr: number, prev: number): number {
  let d = curr - prev;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function beginTwoFingerGesture(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): TwoFingerGestureSession {
  const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const angleRad = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;
  return {
    startDist: dist,
    prevDist: dist,
    startAngleRad: angleRad,
    prevAngleRad: angleRad,
    startMidX: midX,
    startMidY: midY,
    prevMidX: midX,
    prevMidY: midY,
    twistUnlocked: false,
    horizUnlocked: false,
    vertUnlocked: false,
    emaPinch: 0,
    emaHoriz: 0,
    emaVert: 0
  };
}

/**
 * Professional, non-chaotic 2-finger gesture resolver:
 * - Pinch spread zooms cleanly with zero unintended tilt/yaw wobble.
 * - Two-finger twist OR horizontal parallel slide adjusts camera yaw/bearing smoothly.
 * - Two-finger vertical slide up/down adjusts oblique tilt (0°..52°).
 * - Axis hysteresis + EMA smoothing allows "pinch first, then tilt/rotate" cleanly without jitter.
 */
export function stepTwoFingerGesture(
  session: TwoFingerGestureSession,
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  camZoom: number,
  bearingDeg: number,
  tiltDeg: number
): TwoFingerGestureOutput {
  const currDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const currAngleRad = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  const currMidX = (p1.x + p2.x) / 2;
  const currMidY = (p1.y + p2.y) / 2;

  if (session.prevDist <= 8 || currDist <= 8) {
    session.prevDist = currDist;
    session.prevAngleRad = currAngleRad;
    session.prevMidX = currMidX;
    session.prevMidY = currMidY;
    return { zoomFactor: 1, bearingDeltaDeg: 0, tiltDeltaDeg: 0, panWorldDx: 0, panWorldDy: 0 };
  }

  const dDist = currDist - session.prevDist;
  const dTwistDeg = (unwrapAngleDeltaRad(currAngleRad, session.prevAngleRad) * 180) / Math.PI;
  const dMidX = currMidX - session.prevMidX;
  const dMidY = currMidY - session.prevMidY;

  const cumTwistDeg = Math.abs((unwrapAngleDeltaRad(currAngleRad, session.startAngleRad) * 180) / Math.PI);
  const cumMidX = Math.abs(currMidX - session.startMidX);
  const cumMidY = Math.abs(currMidY - session.startMidY);

  // Signed EMAs cancel out alternating +/- dDist artifacts when browsers emit
  // per-finger pointermove events sequentially during a parallel two-finger slide.
  const emaAlpha = 0.35;
  session.emaPinch = session.emaPinch * (1 - emaAlpha) + dDist * emaAlpha;
  session.emaHoriz = session.emaHoriz * (1 - emaAlpha) + dMidX * emaAlpha;
  session.emaVert = session.emaVert * (1 - emaAlpha) + dMidY * emaAlpha;

  const absEmaPinch = Math.abs(session.emaPinch);
  const absEmaHoriz = Math.abs(session.emaHoriz);
  const absEmaVert = Math.abs(session.emaVert);

  if (!session.twistUnlocked && cumTwistDeg > 5.5) {
    session.twistUnlocked = true;
  }
  if (!session.horizUnlocked && cumMidX > 10 && absEmaHoriz >= absEmaVert * 1.15) {
    session.horizUnlocked = true;
  }
  if (!session.vertUnlocked && cumMidY > 10 && absEmaVert >= absEmaHoriz * 1.15) {
    session.vertUnlocked = true;
  }

  // Pinch zoom: responsive during true spread/pinch, quiet against parallel slide stagger once angle axis locks
  const rawZoomFactor = currDist / session.prevDist;
  const allowZoom =
    Math.abs(dDist) > 0.25 && (absEmaPinch > 1.2 || (!session.horizUnlocked && !session.vertUnlocked));
  const zoomFactor = allowZoom ? Math.max(0.82, Math.min(1.22, rawZoomFactor)) : 1;

  // Suppress angle jitter only during genuine net radial pinching
  const isStrongPinching = absEmaPinch > Math.max(absEmaHoriz, absEmaVert) * 1.35 && Math.abs(dDist) > 1.8;

  let bearingDeltaDeg = 0;
  let tiltDeltaDeg = 0;

  if (!isStrongPinching) {
    const twistArcPx = Math.abs((dTwistDeg * Math.PI) / 180) * currDist * 0.5;
    if (
      session.twistUnlocked &&
      !session.horizUnlocked &&
      twistArcPx >= Math.abs(dMidX) * 0.7 &&
      Math.abs(dTwistDeg) > 0.15
    ) {
      bearingDeltaDeg = Math.max(-10, Math.min(10, dTwistDeg * 0.92));
    } else if (
      session.horizUnlocked &&
      Math.abs(dMidX) > Math.abs(dMidY) * 1.2 &&
      Math.abs(dMidX) > 0.4
    ) {
      bearingDeltaDeg = Math.max(-10, Math.min(10, dMidX * 0.24));
    } else if (
      session.vertUnlocked &&
      Math.abs(dMidY) > Math.abs(dMidX) * 1.2 &&
      Math.abs(dMidY) > 0.4
    ) {
      // Two fingers swiping UP (dMidY < 0) increases 2.5D tilt angle; swiping DOWN flattens to 0°
      tiltDeltaDeg = Math.max(-6, Math.min(6, -dMidY * 0.22));
    }
  }

  // Only pan slightly when pinching (to keep midpoint anchored) rather than sliding during tilt/yaw
  const allowMidPan = isStrongPinching || (!session.horizUnlocked && !session.vertUnlocked);
  const panDelta = allowMidPan
    ? unprojectScreenDeltaToWorld(dMidX, dMidY, camZoom, bearingDeg, tiltDeg)
    : { dx: 0, dy: 0 };

  session.prevDist = currDist;
  session.prevAngleRad = currAngleRad;
  session.prevMidX = currMidX;
  session.prevMidY = currMidY;

  return {
    zoomFactor,
    bearingDeltaDeg,
    tiltDeltaDeg,
    panWorldDx: panDelta.dx,
    panWorldDy: panDelta.dy
  };
}

export function computeFrameDt(nowMs: number, lastMs: number): number {
  if (!Number.isFinite(nowMs) || !Number.isFinite(lastMs)) return 1 / 60;
  const raw = (nowMs - lastMs) / 1000;
  return Math.min(0.05, Math.max(0.0002, raw));
}

export function stepFixedAccumulator(
  accumulatorSec: number,
  frameDtSec: number,
  dtSec: number,
  speed = 1,
  maxSubSteps = 6
): { steps: number; nextAccumulator: number; alpha: number } {
  const safeDt = Number.isFinite(dtSec) && dtSec > 0 ? dtSec : 1 / 60;
  const safeFrameDt = Number.isFinite(frameDtSec) && frameDtSec > 0 ? Math.min(0.05, frameDtSec) : 0;
  const safeSpeed = Number.isFinite(speed) && speed >= 0 ? speed : 1;
  let acc = (Number.isFinite(accumulatorSec) && accumulatorSec >= 0 ? accumulatorSec : 0) + safeFrameDt * safeSpeed;
  let steps = 0;
  while (acc + 1e-9 >= safeDt && steps < maxSubSteps) {
    acc = Math.max(0, acc - safeDt);
    steps++;
  }
  if (steps >= maxSubSteps && acc >= safeDt) {
    acc = acc % safeDt;
  }
  return {
    steps,
    nextAccumulator: acc,
    alpha: Math.max(0, Math.min(1, acc / safeDt))
  };
}

export function frameRateIndependentEase(ratePerSec: number, frameDtSec: number): number {
  if (!Number.isFinite(ratePerSec) || ratePerSec <= 0) return 0;
  if (!Number.isFinite(frameDtSec) || frameDtSec <= 0) return 0;
  return 1 - Math.exp(-ratePerSec * Math.min(0.1, frameDtSec));
}

