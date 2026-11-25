/** واجهة التشخيص التي يكشفها MapCanvas في وضع التطوير فقط. */
import type { Camera } from '@/core/camera';

export interface DebugApi {
  centerOn: (lon: number, lat: number, zoom?: number) => void;
  frames: () => { frames: number; meanMs: number; p95Ms: number; minMs: number; maxMs: number };
  resetFrames: () => void;
  camera: () => Camera;
  selectAtCenter: () => string | null;
  loadDemoScene: () => Promise<{ entities: number; events: number; durationTicks: number }>;
  setTick: (tick: number) => { tick: number; entities: number };
  scene: () => { tick: number; entities: number; events: number } | null;
  renderStats: () => { layers: number; countries: number; entities: number } | null;
}

declare global {
  interface Window {
    __studioDebug?: DebugApi;
  }
}
