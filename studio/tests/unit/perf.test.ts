import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  frameStats,
  resetFrameSampling,
  startFrameSampling,
  stopFrameSampling,
} from '@/render/perf';
import { EXPORT_HIDDEN_LAYERS, LAYER_ORDER, layerIndex } from '@/render/layers';

const pending: FrameRequestCallback[] = [];

function installRaf(): void {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    pending.push(callback);
    return pending.length;
  });
}

function drive(timestamps: readonly number[]): void {
  for (const timestamp of timestamps) {
    const callback = pending.shift();
    expect(callback).toBeTypeOf('function');
    callback?.(timestamp);
  }
}

afterEach(() => {
  stopFrameSampling();
  pending.length = 0;
  vi.unstubAllGlobals();
});

describe('قياس زمن الإطار (S2.6)', () => {
  it('بلا عينات يعيد أصفاراً', () => {
    resetFrameSampling();
    expect(frameStats()).toEqual({ frames: 0, meanMs: 0, p95Ms: 0, minMs: 0, maxMs: 0 });
  });

  it('لا يفعل شيئاً حين لا يتوفر requestAnimationFrame', () => {
    expect(() => startFrameSampling()).not.toThrow();
    expect(frameStats().frames).toBe(0);
  });

  it('يحسب المتوسط وp95 والحدين', () => {
    installRaf();
    startFrameSampling();
    drive([0, 10, 30, 60, 100]);
    const stats = frameStats();
    expect(stats.frames).toBe(4);
    expect(stats.minMs).toBe(10);
    expect(stats.maxMs).toBe(40);
    expect(stats.meanMs).toBe(25);
    expect(stats.p95Ms).toBe(40);
  });

  it('يبقى حلقة واحدة فقط عند بدء متكرر', () => {
    installRaf();
    startFrameSampling();
    startFrameSampling();
    expect(pending.length).toBe(1);
    drive([0, 16]);
    expect(frameStats().frames).toBe(1);
  });

  it('يقطع التسجيل عند الإيقاف ويُصفّر العينات يدوياً', () => {
    installRaf();
    startFrameSampling();
    drive([0, 16]);
    stopFrameSampling();
    drive([32]);
    expect(frameStats().frames).toBe(1);
    resetFrameSampling();
    expect(frameStats().frames).toBe(0);
  });
});

describe('ترتيب الطبقات', () => {
  it('المؤشرات تطابق الترتيب المُعلن', () => {
    LAYER_ORDER.forEach((name, index) => expect(layerIndex(name)).toBe(index));
    expect(EXPORT_HIDDEN_LAYERS).toEqual(['editorUi']);
    expect(layerIndex('editorUi')).toBe(LAYER_ORDER.length - 1);
  });
});
