import assert from 'node:assert/strict';
import test from 'node:test';
import { SoundSynth } from '../renderer/soundSynth';
import { studioDb } from '../storage/studioDb';
import {
  BUILT_IN_CAMERA_PRESETS,
  DEFAULT_CAMERA_MOTION_SETTINGS,
  parseCameraPresetJson,
  sanitizeCameraMotionSettings
} from './cameraBehaviorRuntime';

test('parseCameraPresetJson accepts valid JSON presets (flat and nested settings)', () => {
  const flatRes = parseCameraPresetJson(
    JSON.stringify({
      name: 'لقطة جوية مائلة',
      description: 'زاوية تكتيكية متوسطة',
      bearingDeg: 45,
      tiltDeg: 36,
      defaultZoom: 1.5,
      posSmoothing: 4.5,
      zoomSmoothing: 3.2,
      minZoomMul: 1.1,
      maxZoomMul: 2.6,
      aftermathHoldSec: 2.0,
      leadWeight: 0.55,
      manualPauseSec: 3.5,
      shakeIntensity: 1.2
    })
  );

  assert.equal(flatRes.ok, true);
  if (flatRes.ok) {
    assert.equal(flatRes.metadata.name, 'لقطة جوية مائلة');
    assert.equal(flatRes.metadata.description, 'زاوية تكتيكية متوسطة');
    assert.equal(flatRes.settings.bearingDeg, 45);
    assert.equal(flatRes.settings.tiltDeg, 36);
    assert.equal(flatRes.settings.defaultZoom, 1.5);
    assert.equal(flatRes.settings.minZoomMul, 1.1);
    assert.equal(flatRes.settings.maxZoomMul, 2.6);
  }

  const nestedRes = parseCameraPresetJson(
    JSON.stringify({
      name: 'منظور متابعة',
      settings: {
        bearingDeg: -20,
        tiltDeg: 28,
        defaultZoom: 1.8
      }
    })
  );
  assert.equal(nestedRes.ok, true);
  if (nestedRes.ok) {
    assert.equal(nestedRes.metadata.name, 'منظور متابعة');
    assert.equal(nestedRes.settings.bearingDeg, -20);
    assert.equal(nestedRes.settings.tiltDeg, 28);
    assert.equal(nestedRes.settings.defaultZoom, 1.8);
    assert.equal(nestedRes.settings.posSmoothing, DEFAULT_CAMERA_MOTION_SETTINGS.posSmoothing);
  }
});

test('sanitizeCameraMotionSettings clamps out-of-range values and normalizes angles', () => {
  const clamped = sanitizeCameraMotionSettings({
    bearingDeg: 540,
    tiltDeg: 180,
    defaultZoom: 99,
    posSmoothing: -10,
    zoomSmoothing: 999,
    minZoomMul: 1.9,
    maxZoomMul: 1.2, // smaller than minZoomMul -> must become >= minZoomMul
    aftermathHoldSec: 100,
    leadWeight: -5,
    manualPauseSec: 0,
    shakeIntensity: 10
  });

  assert.equal(clamped.bearingDeg, 180);
  assert.ok(clamped.tiltDeg >= 0 && clamped.tiltDeg <= 60);
  assert.equal(clamped.defaultZoom, 4.5);
  assert.equal(clamped.posSmoothing, 0.5);
  assert.equal(clamped.zoomSmoothing, 12.0);
  assert.equal(clamped.minZoomMul, 1.9);
  assert.equal(clamped.maxZoomMul, 1.9);
  assert.equal(clamped.aftermathHoldSec, 5.0);
  assert.equal(clamped.leadWeight, 0.0);
  assert.equal(clamped.manualPauseSec, 0.5);
  assert.equal(clamped.shakeIntensity, 2.5);

  const fallback = sanitizeCameraMotionSettings({
    defaultZoom: Number.NaN,
    posSmoothing: Number.POSITIVE_INFINITY
  });
  assert.equal(fallback.defaultZoom, DEFAULT_CAMERA_MOTION_SETTINGS.defaultZoom);
  assert.equal(fallback.posSmoothing, DEFAULT_CAMERA_MOTION_SETTINGS.posSmoothing);
  assert.equal(BUILT_IN_CAMERA_PRESETS.length, 3);
});

test('parseCameraPresetJson rejects executable JS code, obfuscated constructor gadgets, and prototype pollution', () => {
  const payloads = [
    '({ evaluate(ctx) { return { x: 0, y: 0 }; } })',
    'function evaluate(ctx) { return ctx.baseCamera; }',
    'export default { evaluate: () => ({ zoom: 2 }) }',
    '(() => { return Object["cons"+"tructor"]("return globalThis")(); })()',
    '{"evaluate": "Object[\\"cons\\"+\\"tructor\\"](\\"alert(1)\\")()"}',
    '{"settings": {"evaluate": "() => null"}}',
    '{"__proto__": {"polluted": true}, "tiltDeg": 20}',
    '{"constructor": {"prototype": {"x": 1}}}',
    '{ invalid json'
  ];

  for (const payload of payloads) {
    const res = parseCameraPresetJson(payload);
    assert.equal(res.ok, false, `expected rejection for payload: ${payload}`);
  }
});

test('SoundSynth accepts soundConfig and custom stored audio clips cleanly in Node/headless environment', () => {
  const synth = new SoundSynth();
  synth.setSoundConfig({
    masterVolume: 0.75,
    eventBindings: {
      explosion: {
        enabled: true,
        source: 'clip',
        clipId: 'clip_boom',
        volume: 0.9,
        pitch: 1.05
      }
    },
    actorBindings: {}
  });
  synth.setClips([
    {
      id: 'clip_boom',
      name: 'boom.ogg',
      mimeType: 'audio/ogg',
      dataUrl: 'data:audio/ogg;base64,T2dnUw==',
      durationSec: 0.25,
      createdAt: 100
    }
  ]);

  assert.equal(synth.getSoundConfig().masterVolume, 0.75);
  assert.equal(synth.getSoundConfig().eventBindings.explosion?.clipId, 'clip_boom');
  assert.doesNotThrow(() => synth.play('explosion', { actorId: 'heavy_tank', eventKind: 'strike' }));
  assert.doesNotThrow(() => synth.previewClip('clip_boom', 0.8, 1.0));
});

test('studioDb v4 initializes audio_clips, camera_presets, and camera_scripts stores and persists records', async () => {
  const stores = new Map<string, Map<string, unknown>>();
  let openedVersion = 0;
  let openedName = '';

  const makeReq = <T>(run: () => T) => {
    const req: {
      result: T | undefined;
      error: unknown;
      onsuccess: (() => void) | null;
      onerror: (() => void) | null;
      onupgradeneeded: (() => void) | null;
    } = {
      result: undefined,
      error: null,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null
    };
    queueMicrotask(() => {
      try {
        req.result = run();
        req.onsuccess?.();
      } catch (err) {
        req.error = err;
        req.onerror?.();
      }
    });
    return req;
  };

  const mockDb = {
    objectStoreNames: {
      contains: (name: string) => stores.has(name)
    },
    createObjectStore: (name: string) => {
      const m = new Map<string, unknown>();
      stores.set(name, m);
      return m;
    },
    transaction: (storeName: string) => {
      const store = stores.get(storeName);
      if (!store) throw new Error(`Missing object store: ${storeName}`);
      const tx: {
        oncomplete: (() => void) | null;
        onerror: (() => void) | null;
        error: unknown;
        objectStore: (name: string) => unknown;
      } = {
        oncomplete: null,
        onerror: null,
        error: null,
        objectStore: () => ({
          getAll: () => makeReq(() => Array.from(store.values())),
          get: (k: string) => makeReq(() => store.get(k)),
          put: (val: Record<string, unknown>) => {
            const key = typeof val.id === 'string' ? val.id : String(val.key);
            store.set(key, val);
            queueMicrotask(() => tx.oncomplete?.());
          },
          delete: (k: string) => {
            store.delete(k);
            queueMicrotask(() => tx.oncomplete?.());
          }
        })
      };
      return tx;
    },
    close: () => {},
    onversionchange: null as (() => void) | null,
    onclose: null as (() => void) | null
  };

  const prevIndexedDb = (globalThis as { indexedDB?: unknown }).indexedDB;
  (globalThis as { indexedDB?: unknown }).indexedDB = {
    open: (name: string, version: number) => {
      openedName = name;
      openedVersion = version;
      const req: {
        result: typeof mockDb;
        error: unknown;
        onsuccess: (() => void) | null;
        onerror: (() => void) | null;
        onupgradeneeded: (() => void) | null;
      } = {
        result: mockDb,
        error: null,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null
      };
      queueMicrotask(() => {
        req.onupgradeneeded?.();
        req.onsuccess?.();
      });
      return req;
    }
  };

  try {
    await studioDb.saveAudioClip({
      id: 'clip_1',
      name: 'tank.ogg',
      mimeType: 'audio/ogg',
      dataUrl: 'data:audio/ogg;base64,T2dnUw==',
      durationSec: 0.25,
      createdAt: 10
    });
    await studioDb.saveCameraPreset({
      id: 'preset_custom_1',
      name: 'زاوية تجربة',
      description: 'وصف',
      source: 'user',
      settings: { ...DEFAULT_CAMERA_MOTION_SETTINGS, tiltDeg: 30 },
      updatedAt: 20
    });
    await studioDb.saveCameraScript({
      id: 'script_1',
      name: 'إعداد JSON',
      description: 'بيانات فقط',
      code: '{"tiltDeg": 30}',
      defaultSettings: { ...DEFAULT_CAMERA_MOTION_SETTINGS, tiltDeg: 30 },
      createdAt: 25,
      updatedAt: 30
    });

    assert.equal(openedName, 'rw_studio_db');
    assert.equal(openedVersion, 4);
    assert.equal(stores.has('audio_clips'), true);
    assert.equal(stores.has('camera_presets'), true);
    assert.equal(stores.has('camera_scripts'), true);

    const clips = await studioDb.loadAllAudioClips();
    const presets = await studioDb.loadAllCameraPresets();
    const scripts = await studioDb.loadAllCameraScripts();

    assert.equal(clips.length, 1);
    assert.equal(clips[0].id, 'clip_1');
    assert.equal(presets.length, 1);
    assert.equal(presets[0].settings.tiltDeg, 30);
    assert.equal(scripts.length, 1);
    assert.equal(scripts[0].id, 'script_1');
  } finally {
    mockDb.onclose?.();
    if (prevIndexedDb === undefined) {
      delete (globalThis as { indexedDB?: unknown }).indexedDB;
    } else {
      (globalThis as { indexedDB?: unknown }).indexedDB = prevIndexedDb;
    }
  }
});
