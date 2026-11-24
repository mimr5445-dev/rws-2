import { GeoProjection, geoPath } from 'd3-geo';

/**
 * جلد «التضاريس» لخريطة العالم الكاملة:
 * يابسة بتظليل إغاثي رمادي (hillshade) على بحر أسود خالص، بلا حدود سياسية،
 * بلا زبد/غيوم/نجوم/خطوط، وبلا أي أسماء دول — مطابق لأسلوب صورة الإرفاق.
 * التضاريس مولّدة حتمياً من ضجيج متعدد الأوكتافات، دون أصول خارجية.
 */

type Rng = () => number;

function mulberry32(seed: number): Rng {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function valueNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

function fbm(x: number, y: number, seed: number): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let o = 0; o < 6; o++) {
    sum += amp * valueNoise(x * freq, y * freq, seed + o * 1013);
    freq *= 2;
    amp *= 0.5;
  }
  return sum;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function buildReliefCanvas(width: number, height: number): HTMLCanvasElement {
  const rw = Math.ceil(width / 2);
  const rh = Math.ceil(height / 2);
  const canvas = document.createElement('canvas') as HTMLCanvasElement;
  canvas.width = rw;
  canvas.height = rh;
  const ctx = canvas.getContext('2d')!;

  const heights = new Float32Array(rw * rh);
  const seed = 0x5eed1701;
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const nx = x / 17;
      const ny = y / 17;
      const base = fbm(nx, ny, seed);
      const ridge = 1 - Math.abs(2 * fbm(nx * 0.68 + 11, ny * 0.68 + 7, seed + 7919) - 1);
      heights[y * rw + x] = base * 0.70 + ridge * 0.30;
    }
  }

  const img = ctx.createImageData(rw, rh);
  const lightX = -0.62;
  const lightY = -0.78;
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const i = y * rw + x;
      const hL = heights[y * rw + Math.max(0, x - 1)];
      const hR = heights[y * rw + Math.min(rw - 1, x + 1)];
      const hU = heights[Math.max(0, y - 1) * rw + x];
      const hD = heights[Math.min(rh - 1, y + 1) * rw + x];
      const gx = (hR - hL) * 0.5;
      const gy = (hD - hU) * 0.5;
      const shade = gx * lightX + gy * lightY;
      let v = 0.56 + shade * 6.5 + (heights[i] - 0.5) * 0.18;
      v += (hash2(x, y, 31337) - 0.5) * 0.03;
      v = clamp(v, 0.30, 0.88);
      const c = Math.round(v * 255);
      const p = i * 4;
      img.data[p] = c;
      img.data[p + 1] = c;
      img.data[p + 2] = Math.min(255, c + 2);
      img.data[p + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

export interface WorldReliefSkinInput {
  ctx: CanvasRenderingContext2D;
  projection: GeoProjection;
  landGeom: any;
  width: number;
  height: number;
}

export function drawWorldReliefSkin(input: WorldReliefSkinInput): void {
  const { ctx, projection, landGeom, width, height } = input;
  const rand = mulberry32(0x19421208);
  const pathString = geoPath(projection);

  // بحر أسود خالص
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  const landD = pathString(landGeom as any);
  if (!landD) return;
  const landPath = new Path2D(landD);

  // قصّ التضاريس على اليابسة فقط
  const reliefCanvas = buildReliefCanvas(width, height);
  ctx.save();
  ctx.beginPath();
  ctx.clip(landPath);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(reliefCanvas, 0, 0, width, height);
  ctx.restore();

  // حافة داكنة خفيفة تفصل اليابسة عن البحر دون خط أبيض
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.62)';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke(landPath);
  ctx.restore();

  // بحيرات/داخل مائي داكن على اليابسة
  const lakes: Array<{ ll: [number, number]; rx: number; ry: number }> = [
    { ll: [33, -1], rx: 13, ry: 9 },       // فيكتوريا
    { ll: [14.5, 13.2], rx: 10, ry: 7 },  // تشاد
    { ll: [29.5, -6], rx: 5, ry: 17 },    // تنجانيقا
    { ll: [34, -12], rx: 4, ry: 13 },     // ملاوي
    { ll: [51, 41], rx: 20, ry: 34 },     // قزوين
    { ll: [59, 45], rx: 11, ry: 7 },      // آرال
    { ll: [108, 53], rx: 15, ry: 5 },     // بايكال
    { ll: [-85, 45], rx: 26, ry: 13 }     // البحيرات العظمى
  ];
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
  for (const lake of lakes) {
    const p = projection(lake.ll);
    if (!p) continue;
    ctx.save();
    ctx.translate(p[0], p[1]);
    ctx.scale(lake.rx, lake.ry);
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // حبيبات دقيقة جداً على كامل اللوحة
  ctx.save();
  for (let i = 0; i < 2200; i++) {
    const x = rand() * width;
    const y = rand() * height;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.006 + rand() * 0.018})`;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.restore();
}
