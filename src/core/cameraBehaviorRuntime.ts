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

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const CODE_LIKE_KEYS = new Set(['evaluate', 'update', 'onInteract', 'code', 'script']);

function findDangerousKey(val: unknown, seen = new WeakSet<object>()): string | null {
  if (typeof val !== 'object' || val === null) return null;
  if (seen.has(val)) return null;
  seen.add(val);

  if (Array.isArray(val)) {
    for (const item of val) {
      const hit = findDangerousKey(item, seen);
      if (hit) return hit;
    }
    return null;
  }

  for (const key of Object.getOwnPropertyNames(val)) {
    if (DANGEROUS_KEYS.has(key)) return key;
    const hit = findDangerousKey((val as Record<string, unknown>)[key], seen);
    if (hit) return hit;
  }
  return null;
}

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

export type CameraPresetParseResult =
  | {
      ok: true;
      settings: CameraMotionSettings;
      metadata: {
        name?: string;
        description?: string;
      };
    }
  | {
      ok: false;
      error: string;
    };

/**
 * Parses and validates camera motion preset settings from JSON only.
 * Rejects executable code payloads, prototype-pollution keys, and non-JSON input.
 */
export function parseCameraPresetJson(rawJson: string): CameraPresetParseResult {
  const trimmed = typeof rawJson === 'string' ? rawJson.trim() : '';
  if (!trimmed) {
    return { ok: false, error: 'الرجاء إدخال إعدادات الكاميرا بصيغة JSON صالحة.' };
  }
  if (trimmed.length > 24_000) {
    return { ok: false, error: 'حجم ملف الإعدادات يتجاوز الحد المسموح (24 كيلوبايت).' };
  }
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return { ok: false, error: 'يُسمح بإعدادات JSON فقط (كائن يبدأ بـ { وينتهي بـ }).' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: 'تنسيق JSON غير صالح لإعدادات الكاميرا.' };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'يجب أن يكون جذر إعدادات الكاميرا كائن JSON.' };
  }

  const dangerousKey = findDangerousKey(parsed);
  if (dangerousKey) {
    return { ok: false, error: `المفتاح "${dangerousKey}" مرفوض لأسباب أمنية.` };
  }

  const obj = parsed as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (CODE_LIKE_KEYS.has(key)) {
      return { ok: false, error: `تنفيذ الشيفرات عبر "${key}" غير مدعوم؛ يُسمح بإعدادات JSON فقط.` };
    }
  }

  const settingsCandidate =
    obj.settings !== undefined ? obj.settings : obj;

  if (!settingsCandidate || typeof settingsCandidate !== 'object' || Array.isArray(settingsCandidate)) {
    return { ok: false, error: 'حقل settings يجب أن يكون كائن إعدادات JSON.' };
  }

  const settingsObj = settingsCandidate as Record<string, unknown>;
  for (const key of Object.keys(settingsObj)) {
    if (CODE_LIKE_KEYS.has(key)) {
      return { ok: false, error: `تنفيذ الشيفرات عبر "${key}" غير مدعوم؛ يُسمح بإعدادات JSON فقط.` };
    }
  }

  const settings = sanitizeCameraMotionSettings(settingsObj as Partial<CameraMotionSettings>);
  return {
    ok: true,
    settings,
    metadata: {
      name: typeof obj.name === 'string' && obj.name.trim() ? obj.name.trim() : undefined,
      description:
        typeof obj.description === 'string' && obj.description.trim() ? obj.description.trim() : undefined
    }
  };
}
