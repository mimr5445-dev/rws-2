import { clampTiltDeg, normalizeAngleDeg } from './cameraTransform';
import { CameraMotionSettings, CameraPresetRecord } from './types';

export const DEFAULT_CAMERA_MOTION_SETTINGS: CameraMotionSettings = {
  bearingDeg: 0,
  tiltDeg: 0,
  defaultZoom: 1.0,
  posSmoothing: 3.0,
  zoomSmoothing: 2.5,
  minZoomMul: 1.0,
  maxZoomMul: 2.25,
  aftermathHoldSec: 1.45,
  leadWeight: 0.42,
  manualPauseSec: 4.0,
  shakeIntensity: 1.0
};

export function sanitizeCameraMotionSettings(
  partial?: Partial<CameraMotionSettings> | null
): CameraMotionSettings {
  const src = partial ?? {};
  const num = (v: unknown, fallback: number, min: number, max: number): number => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
    return Math.max(min, Math.min(max, v));
  };
  const minZoomMul = num(src.minZoomMul, DEFAULT_CAMERA_MOTION_SETTINGS.minZoomMul, 0.7, 2.2);
  const maxZoomMul = Math.max(minZoomMul, num(src.maxZoomMul, DEFAULT_CAMERA_MOTION_SETTINGS.maxZoomMul, 1.0, 3.8));
  return {
    bearingDeg: normalizeAngleDeg(
      typeof src.bearingDeg === 'number' && Number.isFinite(src.bearingDeg)
        ? src.bearingDeg
        : DEFAULT_CAMERA_MOTION_SETTINGS.bearingDeg
    ),
    tiltDeg: clampTiltDeg(
      typeof src.tiltDeg === 'number' && Number.isFinite(src.tiltDeg)
        ? src.tiltDeg
        : DEFAULT_CAMERA_MOTION_SETTINGS.tiltDeg
    ),
    defaultZoom: num(src.defaultZoom, DEFAULT_CAMERA_MOTION_SETTINGS.defaultZoom, 0.35, 4.5),
    posSmoothing: num(src.posSmoothing, DEFAULT_CAMERA_MOTION_SETTINGS.posSmoothing, 0.5, 14.0),
    zoomSmoothing: num(src.zoomSmoothing, DEFAULT_CAMERA_MOTION_SETTINGS.zoomSmoothing, 0.5, 12.0),
    minZoomMul,
    maxZoomMul,
    aftermathHoldSec: num(src.aftermathHoldSec, DEFAULT_CAMERA_MOTION_SETTINGS.aftermathHoldSec, 0.2, 5.0),
    leadWeight: num(src.leadWeight, DEFAULT_CAMERA_MOTION_SETTINGS.leadWeight, 0.0, 1.0),
    manualPauseSec: num(src.manualPauseSec, DEFAULT_CAMERA_MOTION_SETTINGS.manualPauseSec, 0.5, 12.0),
    shakeIntensity: num(src.shakeIntensity, DEFAULT_CAMERA_MOTION_SETTINGS.shakeIntensity, 0.0, 2.5)
  };
}

export const BUILT_IN_CAMERA_PRESETS: CameraPresetRecord[] = [
  {
    id: 'preset_standard',
    name: 'الوضع القياسي المتوازن',
    description: 'حركة ناعمة متوازنة بين نظرة الخريطة العامة وتتبع الأحداث.',
    source: 'builtin',
    settings: { ...DEFAULT_CAMERA_MOTION_SETTINGS },
    updatedAt: 1
  },
  {
    id: 'preset_cinematic_3d',
    name: 'درامي مائل 2.5D',
    description: 'منظور تكتيكي مائل 38° مع تتبع سريع للضربات والصواريخ.',
    source: 'builtin',
    settings: {
      ...DEFAULT_CAMERA_MOTION_SETTINGS,
      bearingDeg: -18,
      tiltDeg: 38,
      defaultZoom: 1.4,
      posSmoothing: 4.2,
      zoomSmoothing: 3.2,
      maxZoomMul: 2.5,
      aftermathHoldSec: 1.85,
      shakeIntensity: 1.35
    },
    updatedAt: 2
  },
  {
    id: 'preset_recon_lock',
    name: 'استطلاع وملاحقة سريعة',
    description: 'استجابة فائقة لتتبع المقاتلات والصواريخ بدون اهتزاز.',
    source: 'builtin',
    settings: {
      ...DEFAULT_CAMERA_MOTION_SETTINGS,
      tiltDeg: 22,
      defaultZoom: 1.65,
      posSmoothing: 6.4,
      zoomSmoothing: 4.5,
      minZoomMul: 1.15,
      maxZoomMul: 2.8,
      aftermathHoldSec: 0.9,
      leadWeight: 0.65,
      shakeIntensity: 0.45
    },
    updatedAt: 3
  }
];

export interface CameraScriptEntitySnapshot {
  id: string;
  actorId: string;
  kind: string;
  domain: string;
  faction: string;
  x: number;
  y: number;
  angle: number;
  isMoving: boolean;
}

export interface CameraScriptProjectileSnapshot {
  id: string;
  mode: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
}

export interface CameraScriptExplosionSnapshot {
  id: string;
  kind: string;
  x: number;
  y: number;
  maxRadius: number;
  progress: number;
}

export interface CameraScriptContext {
  timeSec: number;
  dt: number;
  isPlaying: boolean;
  mapWidth: number;
  mapHeight: number;
  viewport: { width: number; height: number };
  baseCamera: { x: number; y: number; zoom: number; bearingDeg: number; tiltDeg: number };
  focus: { x: number; y: number; zoom: number; focusKind: string } | null;
  preset: CameraMotionSettings;
  entities: CameraScriptEntitySnapshot[];
  projectiles: CameraScriptProjectileSnapshot[];
  explosions: CameraScriptExplosionSnapshot[];
}

export interface CameraScriptFrameOutput {
  x?: number;
  y?: number;
  zoom?: number;
  bearingDeg?: number;
  tiltDeg?: number;
  shakeX?: number;
  shakeY?: number;
}

export interface CameraScriptInteractOutput {
  pauseCinematicsSec?: number;
  bearingDeltaDeg?: number;
  tiltDeltaDeg?: number;
  zoomFactor?: number;
  shakeBurst?: number;
}

export interface CompiledCameraScript {
  name?: string;
  description?: string;
  defaultSettings: Partial<CameraMotionSettings>;
  evaluate: (ctx: CameraScriptContext) => CameraScriptFrameOutput | null;
  onInteract?: (
    ctx: CameraScriptContext & { kind: 'drag' | 'wheel' | 'click' | 'pinch' }
  ) => CameraScriptInteractOutput | null;
}

export const EXAMPLE_CAMERA_SCRIPTS: Array<{ id: string; title: string; code: string }> = [
  {
    id: 'orbit_drone_follow',
    title: 'مسار طائرة استطلاع دائري حول الحدث',
    code: `({
  name: "طائرة استطلاع مدارية",
  description: "تدور الكاميرا ببطء حول مركز القتال وتقترب تلقائياً عند رصد الانفجارات.",
  bearingDeg: 0,
  tiltDeg: 38,
  posSmoothing: 4.2,
  zoomSmoothing: 3.0,
  evaluate(ctx) {
    const anchor = ctx.focus ?? ctx.baseCamera;
    const orbitBearing = Math.sin(ctx.timeSec * 0.35) * 26;
    const blastBoost = ctx.explosions.length > 0 ? 1.14 : 1.0;
    return {
      x: anchor.x,
      y: anchor.y,
      zoom: anchor.zoom * blastBoost,
      bearingDeg: ctx.preset.bearingDeg + orbitBearing,
      tiltDeg: ctx.preset.tiltDeg
    };
  },
  onInteract() {
    return { pauseCinematicsSec: 2.5 };
  }
})`
  },
  {
    id: 'missile_shock_cam',
    title: 'كاميرا رصد الصواريخ والارتداد',
    code: `({
  name: "كاميرا الصواريخ والصدمة",
  description: "تتقدم أمام مسار الصواريخ وتضيف ارتداداً محسوباً لحظة الانفجار.",
  bearingDeg: -14,
  tiltDeg: 44,
  posSmoothing: 5.5,
  zoomSmoothing: 3.6,
  evaluate(ctx) {
    if (ctx.explosions.length > 0) {
      const ex = ctx.explosions[0];
      const decay = Math.max(0, 1 - ex.progress);
      const shake = Math.sin(ctx.timeSec * 48) * 6 * decay;
      return {
        x: ex.x,
        y: ex.y,
        zoom: Math.max(ctx.baseCamera.zoom, 1.55),
        bearingDeg: ctx.preset.bearingDeg,
        tiltDeg: ctx.preset.tiltDeg,
        shakeX: shake,
        shakeY: Math.cos(ctx.timeSec * 42) * 5 * decay
      };
    }
    if (ctx.projectiles.length > 0) {
      const p = ctx.projectiles[0];
      return {
        x: lerp(p.x, p.targetX, 0.25),
        y: lerp(p.y, p.targetY, 0.25),
        zoom: Math.max(ctx.baseCamera.zoom, 1.45),
        bearingDeg: ctx.preset.bearingDeg,
        tiltDeg: ctx.preset.tiltDeg
      };
    }
    return null;
  }
})`
  }
];

const FORBIDDEN_IDENTIFIERS_RE =
  /\b(window|document|globalThis|self|top|parent|frames|fetch|XMLHttpRequest|WebSocket|EventSource|navigator|location|history|localStorage|sessionStorage|indexedDB|caches|cookie|eval|Function|importScripts|require|process|global|Buffer|Proxy|Reflect|constructor|__proto__|prototype|setTimeout|setInterval|setImmediate)\b/;

const IMPORT_STATEMENT_RE = /(^|\s)(import\s+|import\s*\(|export\s+(?!default\b))/;

function clampOutputNumber(v: unknown, min: number, max: number): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
  return Math.max(min, Math.min(max, v));
}

function makeDummyContext(): CameraScriptContext {
  return {
    timeSec: 0.5,
    dt: 1 / 60,
    isPlaying: true,
    mapWidth: 1600,
    mapHeight: 900,
    viewport: { width: 1280, height: 720 },
    baseCamera: { x: 800, y: 450, zoom: 1, bearingDeg: 0, tiltDeg: 0 },
    focus: { x: 800, y: 450, zoom: 1.2, focusKind: 'movement' },
    preset: { ...DEFAULT_CAMERA_MOTION_SETTINGS },
    entities: [],
    projectiles: [],
    explosions: []
  };
}

export function validateAndCompileCameraScript(rawCode: string):
  | {
      ok: true;
      compiled: CompiledCameraScript;
      metadata: { name?: string; description?: string; defaultSettings: Partial<CameraMotionSettings> };
    }
  | { ok: false; error: string } {
  const trimmed = typeof rawCode === 'string' ? rawCode.trim() : '';
  if (!trimmed) {
    return { ok: false, error: 'الرجاء إدخال كود الكاميرا أو إعدادات JSON.' };
  }
  if (trimmed.length > 24_000) {
    return { ok: false, error: 'حجم الكود يتجاوز الحد المسموح (24 كيلوبايت).' };
  }
  if (FORBIDDEN_IDENTIFIERS_RE.test(trimmed) || IMPORT_STATEMENT_RE.test(trimmed)) {
    return {
      ok: false,
      error: 'الكود يحتوي على دوال أو كائنات نظام غير مسموح بها داخل بيئة الكاميرا المعزولة.'
    };
  }

  // 1) Support direct JSON preset import cleanly
  if (trimmed.startsWith('{') && !/\bevaluate\b/.test(trimmed) && !/\bfunction\b/.test(trimmed) && !/=>/.test(trimmed)) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const settingsSrc =
          parsed.settings && typeof parsed.settings === 'object'
            ? (parsed.settings as Partial<CameraMotionSettings>)
            : (parsed as Partial<CameraMotionSettings>);
        const cleanSettings = sanitizeCameraMotionSettings(settingsSrc);
        return {
          ok: true,
          metadata: {
            name: typeof parsed.name === 'string' ? parsed.name.trim() : undefined,
            description: typeof parsed.description === 'string' ? parsed.description.trim() : undefined,
            defaultSettings: cleanSettings
          },
          compiled: {
            name: typeof parsed.name === 'string' ? parsed.name.trim() : undefined,
            description: typeof parsed.description === 'string' ? parsed.description.trim() : undefined,
            defaultSettings: cleanSettings,
            evaluate: () => null
          }
        };
      }
    } catch {
      // Fall through to JS normalization
    }
  }

  // 2) Normalize JS snippets (`export default ...`, `({ ... })`, or `function evaluate(ctx) { ... }`)
  let normalized = trimmed.replace(/^\s*export\s+default\s+/i, '');
  if (normalized.endsWith(';')) {
    normalized = normalized.slice(0, -1).trim();
  }

  let bodyCode: string;
  if (/^function\s+evaluate\s*\(/.test(normalized)) {
    bodyCode = `"use strict";\n${normalized}\nreturn { evaluate };`;
  } else if (normalized.startsWith('{') || normalized.startsWith('(')) {
    bodyCode = `"use strict";\nreturn (${normalized});`;
  } else {
    bodyCode = `"use strict";\n${normalized}`;
  }

  const clampHelper = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  const lerpHelper = (a: number, b: number, t: number) => a + (b - a) * t;
  const degToRadHelper = (deg: number) => (deg * Math.PI) / 180;
  const radToDegHelper = (rad: number) => (rad * 180) / Math.PI;

  let rawResult: unknown;
  try {
    // Shadow potentially sensitive globals as undefined inside strict sandbox scope
    const factory = new Function(
      'Math',
      'Number',
      'Object',
      'Array',
      'JSON',
      'clamp',
      'lerp',
      'degToRad',
      'radToDeg',
      'window',
      'document',
      'globalThis',
      'self',
      'fetch',
      'localStorage',
      'sessionStorage',
      'indexedDB',
      'Function',
      'eval',
      'setTimeout',
      'setInterval',
      bodyCode
    );
    rawResult = factory(
      Math,
      Number,
      Object,
      Array,
      JSON,
      clampHelper,
      lerpHelper,
      degToRadHelper,
      radToDegHelper,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    );
  } catch (err) {
    return { ok: false, error: `خطأ صياغة في كود الكاميرا: ${(err as Error).message}` };
  }

  let evalFn: ((ctx: CameraScriptContext) => unknown) | null = null;
  let interactFn: ((ctx: CameraScriptContext & { kind: string }) => unknown) | undefined;
  let metaName: string | undefined;
  let metaDesc: string | undefined;
  const defaultSettings: Partial<CameraMotionSettings> = {};

  if (typeof rawResult === 'function') {
    evalFn = rawResult as (ctx: CameraScriptContext) => unknown;
  } else if (rawResult && typeof rawResult === 'object' && !Array.isArray(rawResult)) {
    const obj = rawResult as Record<string, unknown>;
    if (typeof obj.name === 'string') metaName = obj.name.trim();
    if (typeof obj.description === 'string') metaDesc = obj.description.trim();
    if (typeof obj.bearingDeg === 'number') defaultSettings.bearingDeg = obj.bearingDeg;
    if (typeof obj.tiltDeg === 'number') defaultSettings.tiltDeg = obj.tiltDeg;
    if (typeof obj.defaultZoom === 'number') defaultSettings.defaultZoom = obj.defaultZoom;
    if (typeof obj.posSmoothing === 'number') defaultSettings.posSmoothing = obj.posSmoothing;
    if (typeof obj.zoomSmoothing === 'number') defaultSettings.zoomSmoothing = obj.zoomSmoothing;
    if (typeof obj.minZoomMul === 'number') defaultSettings.minZoomMul = obj.minZoomMul;
    if (typeof obj.maxZoomMul === 'number') defaultSettings.maxZoomMul = obj.maxZoomMul;
    if (typeof obj.aftermathHoldSec === 'number') defaultSettings.aftermathHoldSec = obj.aftermathHoldSec;
    if (typeof obj.leadWeight === 'number') defaultSettings.leadWeight = obj.leadWeight;
    if (typeof obj.manualPauseSec === 'number') defaultSettings.manualPauseSec = obj.manualPauseSec;
    if (typeof obj.shakeIntensity === 'number') defaultSettings.shakeIntensity = obj.shakeIntensity;

    if (typeof obj.evaluate === 'function') {
      evalFn = (ctx) => (obj.evaluate as (c: CameraScriptContext) => unknown).call(obj, ctx);
    } else if (typeof obj.update === 'function') {
      evalFn = (ctx) => (obj.update as (c: CameraScriptContext) => unknown).call(obj, ctx);
    }
    if (typeof obj.onInteract === 'function') {
      interactFn = (ctx) => (obj.onInteract as (c: CameraScriptContext) => unknown).call(obj, ctx);
    }
  }

  if (!evalFn) {
    return {
      ok: false,
      error: 'يجب أن يعيد الكود دالة أو كائناً يحتوي على الدالة evaluate(ctx) أو إعدادات JSON صالحة.'
    };
  }

  const sanitizeFrame = (out: unknown): CameraScriptFrameOutput | null => {
    if (!out || typeof out !== 'object') return null;
    const o = out as Record<string, unknown>;
    const res: CameraScriptFrameOutput = {};
    const x = clampOutputNumber(o.x, -100_000, 100_000);
    const y = clampOutputNumber(o.y, -100_000, 100_000);
    const zoom = clampOutputNumber(o.zoom, 0.08, 6.0);
    const bearingDeg =
      typeof o.bearingDeg === 'number' && Number.isFinite(o.bearingDeg)
        ? normalizeAngleDeg(o.bearingDeg)
        : undefined;
    const tiltDeg =
      typeof o.tiltDeg === 'number' && Number.isFinite(o.tiltDeg) ? clampTiltDeg(o.tiltDeg) : undefined;
    const shakeX = clampOutputNumber(o.shakeX, -18, 18);
    const shakeY = clampOutputNumber(o.shakeY, -18, 18);
    if (x !== undefined) res.x = x;
    if (y !== undefined) res.y = y;
    if (zoom !== undefined) res.zoom = zoom;
    if (bearingDeg !== undefined) res.bearingDeg = bearingDeg;
    if (tiltDeg !== undefined) res.tiltDeg = tiltDeg;
    if (shakeX !== undefined) res.shakeX = shakeX;
    if (shakeY !== undefined) res.shakeY = shakeY;
    return res;
  };

  // Dry-run test on dummy context to catch runtime errors immediately on import
  try {
    const probe = evalFn(makeDummyContext());
    sanitizeFrame(probe);
  } catch (err) {
    return { ok: false, error: `فشل الاختبار التجريبي للدالة evaluate(ctx): ${(err as Error).message}` };
  }

  const compiled: CompiledCameraScript = {
    name: metaName,
    description: metaDesc,
    defaultSettings,
    evaluate: (ctx) => sanitizeFrame(evalFn!(ctx)),
    onInteract: interactFn
      ? (ctx) => {
          const out = interactFn!(ctx);
          if (!out || typeof out !== 'object') return null;
          const o = out as Record<string, unknown>;
          const res: CameraScriptInteractOutput = {};
          const pause = clampOutputNumber(o.pauseCinematicsSec, 0, 15);
          const dB = clampOutputNumber(o.bearingDeltaDeg, -45, 45);
          const dT = clampOutputNumber(o.tiltDeltaDeg, -25, 25);
          const zf = clampOutputNumber(o.zoomFactor, 0.5, 2.0);
          const sb = clampOutputNumber(o.shakeBurst, 0, 14);
          if (pause !== undefined) res.pauseCinematicsSec = pause;
          if (dB !== undefined) res.bearingDeltaDeg = dB;
          if (dT !== undefined) res.tiltDeltaDeg = dT;
          if (zf !== undefined) res.zoomFactor = zf;
          if (sb !== undefined) res.shakeBurst = sb;
          return res;
        }
      : undefined
  };

  return {
    ok: true,
    compiled,
    metadata: {
      name: metaName,
      description: metaDesc,
      defaultSettings
    }
  };
}
