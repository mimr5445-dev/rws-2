import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { normalizeAngleDiff } from '../../engine/engine';
import { Faction, Point } from '../../core/types';
import { sanitizeAssetUrl } from '../../packs/packSchema';

export async function loadSvgOrUrlTexture(src: string, fallbackW = 128, fallbackH = 128): Promise<Texture> {
  const safeSrc = sanitizeAssetUrl(src);
  if (!safeSrc) return Texture.EMPTY;
  const isSvg = safeSrc.startsWith('<svg');
  let url = safeSrc;
  let w = fallbackW;
  let h = fallbackH;

  if (isSvg) {
    const vbMatch = safeSrc.match(/viewBox=["']\s*[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)\s*["']/i);
    if (vbMatch) {
      w = Math.max(1, Math.round(parseFloat(vbMatch[1])));
      h = Math.max(1, Math.round(parseFloat(vbMatch[2])));
    }
    let normalizedSvg = safeSrc;
    if (!/\bwidth=/.test(normalizedSvg.slice(0, 220))) {
      normalizedSvg = normalizedSvg.replace('<svg', `<svg width="${w}" height="${h}"`);
    }
    url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(normalizedSvg)}`;
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load texture image'));
      img.src = url;
    });
  } catch {
    return Texture.EMPTY;
  }
  if (img.decode) {
    try {
      await img.decode();
    } catch {
      // Already decoded on load
    }
  }

  const outW = isSvg ? (w < 256 ? w * 2 : w) : Math.max(1, img.naturalWidth || w);
  const outH = isSvg ? (h < 256 ? h * 2 : h) : Math.max(1, img.naturalHeight || h);
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, outW, outH);
    ctx.drawImage(img, 0, 0, outW, outH);
  }
  return Texture.from(canvas);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpAngle(a: number, b: number, t: number): number {
  return a + normalizeAngleDiff(b, a) * t;
}

export const FACTION_COLOR: Record<Faction, number> = {
  blue: 0x38bdf8,
  red: 0xef4444,
  neutral: 0x94a3b8
};

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
  color: number;
}

export interface FxParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  drag: number;
  rise: number;
  life: number;
  maxLife: number;
  startRadius: number;
  endRadius: number;
  startAlpha: number;
  color: number;
  shape?: 'smoke' | 'spark' | 'debris' | 'dust' | 'droplet';
  rotation?: number;
  spin?: number;
  aspect?: number;
}

export interface WakeRipple {
  x: number;
  y: number;
  angle: number;
  width: number;
  life: number;
  maxLife: number;
}

export interface EditorOverlayState {
  enabled: boolean;
  showNavGrid: boolean;
  paintActive: boolean;
  draftZonePoints: Point[];
}

export interface EntityView {
  container: Container;
  sprite: Sprite;
  baseSpriteScale: number;
  isElongated: boolean;
  isSideView: boolean;
  shadow: Graphics;
  factionHalo: Graphics;
  ring: Graphics;
  buildArc: Graphics;
  rotor?: Graphics;
}

export interface CalloutView {
  container: Container;
  bg: Graphics;
  label: Text;
  lastText: string;
  lastColor: string;
}
