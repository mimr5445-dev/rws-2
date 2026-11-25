import { describe, expect, it } from 'vitest';
import {
  DT,
  TICK_RATE,
  clampTick,
  frameToTick,
  secondsToTick,
  tickToSeconds,
  totalFrames,
} from '@/core/time';

describe('الزمن (S1.3)', () => {
  it('معدل المحاكاة 60 tick والخطوة 1/60', () => {
    expect(TICK_RATE).toBe(60);
    expect(DT).toBeCloseTo(1 / 60, 12);
    expect(tickToSeconds(90)).toBe(1.5);
    expect(secondsToTick(1.5)).toBe(90);
  });

  it('تحويل الإطار إلى tick على 30 و60 و120 إطاراً', () => {
    // 30 fps: كل إطار = tickان
    expect(frameToTick(0, 30)).toBe(0);
    expect(frameToTick(1, 30)).toBe(2);
    expect(frameToTick(30, 30)).toBe(60);
    expect(frameToTick(899, 30)).toBe(1798);
    // 60 fps: تطابق تام
    expect(frameToTick(0, 60)).toBe(0);
    expect(frameToTick(45, 60)).toBe(45);
    expect(frameToTick(1800, 60)).toBe(1800);
    // 120 fps: كل إطار نصف tick ويُقرّب
    expect(frameToTick(0, 120)).toBe(0);
    expect(frameToTick(1, 120)).toBe(1);
    expect(frameToTick(2, 120)).toBe(1);
    expect(frameToTick(3, 120)).toBe(2);
    expect(frameToTick(240, 120)).toBe(120);
  });

  it('يقاوم المدخلات غير الصالحة', () => {
    expect(() => frameToTick(1, 0)).toThrow();
    expect(() => frameToTick(-1, 60)).toThrow();
  });

  it('يحسب عدد الإطارات ويقصّ الـ tick داخل المدة', () => {
    expect(totalFrames(1800, 60)).toBe(1800);
    expect(totalFrames(1800, 30)).toBe(900);
    expect(clampTick(-4, 1800)).toBe(0);
    expect(clampTick(99999, 1800)).toBe(1800);
    expect(clampTick(12.9, 1800)).toBe(12);
  });
});
