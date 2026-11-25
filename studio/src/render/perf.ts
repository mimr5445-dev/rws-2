/**
 * قياس زمن الإطار (S2.6): حلقة rAF بسيطة تُجمّع فروق الزمن.
 * لا تُستخدم في منطق العرض، ولا تُقرأ إلا في الاختبارات والقياس.
 */
export interface FrameStats {
  frames: number;
  meanMs: number;
  p95Ms: number;
  minMs: number;
  maxMs: number;
}

const samples: number[] = [];
const MAX_SAMPLES = 600;
let running = false;
let lastTimestamp: number | null = null;

export function startFrameSampling(): void {
  if (running || typeof requestAnimationFrame === 'undefined') return;
  running = true;
  samples.length = 0;
  lastTimestamp = null;
  const tick = (timestamp: number) => {
    if (!running) return;
    if (lastTimestamp !== null) {
      samples.push(timestamp - lastTimestamp);
      if (samples.length > MAX_SAMPLES) samples.shift();
    }
    lastTimestamp = timestamp;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function stopFrameSampling(): void {
  running = false;
}

export function frameStats(): FrameStats {
  if (samples.length === 0) return { frames: 0, meanMs: 0, p95Ms: 0, minMs: 0, maxMs: 0 };
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = sorted.reduce((total, value) => total + value, 0);
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  return {
    frames: sorted.length,
    meanMs: Number((sum / sorted.length).toFixed(3)),
    p95Ms: Number((sorted[index] ?? 0).toFixed(3)),
    minMs: Number((sorted[0] ?? 0).toFixed(3)),
    maxMs: Number((sorted[sorted.length - 1] ?? 0).toFixed(3)),
  };
}

export function resetFrameSampling(): void {
  samples.length = 0;
}
