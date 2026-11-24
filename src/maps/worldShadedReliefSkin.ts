import { GeoPermissibleObjects, GeoProjection, geoPath } from 'd3-geo';
interface ShadedReliefOptions {
  ctx: CanvasRenderingContext2D;
  projection: GeoProjection;
  landGeom: GeoPermissibleObjects;
  borderMesh: unknown;
  width: number;
  height: number;
}

type NoiseGrid = { cols: number; rows: number; values: Float32Array };

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function makeNoiseGrid(cols: number, rows: number, seed: number): NoiseGrid {
  const random = seededRandom(seed);
  const values = new Float32Array(cols * rows);
  for (let i = 0; i < values.length; i++) values[i] = random();
  return { cols, rows, values };
}

function smoothNoise(grid: NoiseGrid, u: number, v: number): number {
  const x = Math.max(0, Math.min(grid.cols - 1.001, u * (grid.cols - 1)));
  const y = Math.max(0, Math.min(grid.rows - 1.001, v * (grid.rows - 1)));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const at = (gx: number, gy: number) => grid.values[gy * grid.cols + gx];
  const top = at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx;
  const bottom = at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx;
  return top * (1 - sy) + bottom * sy;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function drawReliefTexture(
  projection: GeoProjection,
  width: number,
  height: number
): HTMLCanvasElement {
  // Build the elevation field at half resolution, then smoothly upscale it.
  // The land mask and country boundaries still come from the real world atlas.
  const w = Math.ceil(width / 2);
  const h = Math.ceil(height / 2);
  const relief = document.createElement('canvas');
  relief.width = w;
  relief.height = h;
  const reliefCtx = relief.getContext('2d', { willReadFrequently: true })!;
  const pixels = reliefCtx.createImageData(w, h);
  const heights = new Float32Array(w * h);
  const broad = makeNoiseGrid(8, 5, 21);
  const medium = makeNoiseGrid(26, 15, 42);
  const fine = makeNoiseGrid(74, 42, 63);
  const detail = makeNoiseGrid(190, 108, 84);
  const micro = makeNoiseGrid(360, 204, 105);

  for (let y = 0; y < h; y++) {
    const v = y / (h - 1);
    for (let x = 0; x < w; x++) {
      const u = x / (w - 1);
      const i = y * w + x;
      heights[i] =
        0.12 * smoothNoise(broad, u, v) +
        0.25 * smoothNoise(medium, u, v) +
        0.32 * smoothNoise(fine, u, v) +
        0.22 * smoothNoise(detail, u, v) +
        0.09 * smoothNoise(micro, u, v);
    }
  }

  // Add broad, geographically placed mountain belts over a restrained fractal
  // surface. The countries/coastlines are real; this synthetic height field is
  // intentionally a visual treatment rather than surveyed elevation data.
  const mountainHeight = new Float32Array(w * h);
  const ranges: Array<{ coords: number[][]; spread: number }> = [
    { coords: [[-158, 64], [-145, 60], [-135, 56], [-129, 51], [-123, 46], [-118, 40], [-111, 34], [-106, 30]], spread: 16 },
    { coords: [[-79, 9], [-77, -2], [-75, -15], [-73, -28], [-71, -40], [-69, -52]], spread: 10 },
    { coords: [[-9, 43], [-3, 45], [4, 46], [9, 47], [15, 46], [20, 48], [25, 49]], spread: 8 },
    { coords: [[58, 68], [60, 60], [59, 53], [58, 47]], spread: 8 },
    { coords: [[38, 42], [43, 43], [48, 41]], spread: 8 },
    { coords: [[66, 37], [75, 34], [83, 31], [91, 28], [100, 29], [109, 33]], spread: 16 },
    { coords: [[-12, 31], [-6, 33], [1, 35], [8, 34], [12, 32]], spread: 9 },
    { coords: [[31, 14], [35, 10], [38, 5], [40, 1]], spread: 10 },
    { coords: [[129, 47], [137, 42], [141, 36], [136, 31]], spread: 8 },
    { coords: [[166, -35], [172, -42], [175, -45]], spread: 8 }
  ];
  for (const range of ranges) {
    const points = range.coords
      .map(([lon, lat]) => projection([lon, lat]))
      .filter((point): point is [number, number] => Boolean(point && Number.isFinite(point[0]) && Number.isFinite(point[1])))
      .map(([x, y]) => [x * (w / width), y * (h / height)] as const);
    for (let s = 0; s < points.length - 1; s++) {
      const [ax, ay] = points[s];
      const [bx, by] = points[s + 1];
      const vx = bx - ax;
      const vy = by - ay;
      const lengthSq = vx * vx + vy * vy;
      if (lengthSq < 0.01) continue;
      const radius = range.spread;
      const minX = Math.max(0, Math.floor(Math.min(ax, bx) - radius * 2.6));
      const maxX = Math.min(w - 1, Math.ceil(Math.max(ax, bx) + radius * 2.6));
      const minY = Math.max(0, Math.floor(Math.min(ay, by) - radius * 2.6));
      const maxY = Math.min(h - 1, Math.ceil(Math.max(ay, by) + radius * 2.6));
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const t = clamp(((x - ax) * vx + (y - ay) * vy) / lengthSq, 0, 1);
          const dx = x - (ax + t * vx);
          const dy = y - (ay + t * vy);
          const distanceSq = dx * dx + dy * dy;
          if (distanceSq > radius * radius * 6.76) continue;
          const i = y * w + x;
          const ridge = Math.exp(-distanceSq / (2 * radius * radius));
          mountainHeight[i] = Math.max(mountainHeight[i], ridge * (0.72 + heights[i] * 0.56));
        }
      }
    }
  }

  const terrain = new Float32Array(w * h);
  for (let i = 0; i < terrain.length; i++) {
    terrain[i] = 0.08 + heights[i] * 0.34 + mountainHeight[i] * 0.62;
  }

  const low = [35, 68, 76];
  const high = [177, 198, 194];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const prevX = terrain[y * w + Math.max(0, x - 1)];
      const nextX = terrain[y * w + Math.min(w - 1, x + 1)];
      const prevY = terrain[Math.max(0, y - 1) * w + x];
      const nextY = terrain[Math.min(h - 1, y + 1) * w + x];
      const elevation = clamp(terrain[i], 0, 1);
      const hillshade = clamp(0.54 + (prevX - nextX) * 3.2 + (prevY - nextY) * 2.6, 0.2, 1);
      const light = 0.63 + hillshade * 0.61;
      const grain = (heights[i] - 0.5) * 5;
      const p = i * 4;
      for (let channel = 0; channel < 3; channel++) {
        const base = low[channel] + (high[channel] - low[channel]) * elevation;
        pixels.data[p + channel] = clamp(base * light + grain, 0, 255);
      }
      pixels.data[p + 3] = 255;
    }
  }
  reliefCtx.putImageData(pixels, 0, 0);
  return relief;
}

function drawOceanContours(ctx: CanvasRenderingContext2D, projection: GeoProjection, width: number, height: number): void {
  ctx.save();
  const basins: Array<{ at: [number, number]; radius: number }> = [
    { at: [-145, 5], radius: width * 0.19 },
    { at: [-35, -28], radius: width * 0.15 },
    { at: [70, -35], radius: width * 0.16 },
    { at: [155, 2], radius: width * 0.17 }
  ];
  for (const basin of basins) {
    const center = projection(basin.at);
    if (!center) continue;
    for (let ring = 1; ring <= 3; ring++) {
      ctx.beginPath();
      ctx.ellipse(center[0], center[1], basin.radius * ring * 0.55, basin.radius * ring * 0.26, -0.18, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(113, 148, 151, ${0.018 + (4 - ring) * 0.006})`;
      ctx.lineWidth = ring === 1 ? 1.5 : 1;
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawMapTitle(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const top = height * 0.77;
  ctx.save();
  ctx.fillStyle = 'rgba(36, 64, 69, 0.78)';
  ctx.textBaseline = 'top';
  ctx.font = '600 17px Georgia, "Times New Roman", serif';
  ctx.fillText('SHADED RELIEF MAP', 66, top);
  ctx.font = '500 34px Georgia, "Times New Roman", serif';
  ctx.fillText('OF THE WORLD', 64, top + 24);
  ctx.fillStyle = 'rgba(36, 64, 69, 0.48)';
  ctx.fillRect(66, top + 69, Math.min(128, width * 0.1), 1);
  ctx.font = '11px Georgia, "Times New Roman", serif';
  ctx.fillText('LAND • SEA • RELIEF', 66, top + 78);
  ctx.restore();
}

export function drawWorldShadedReliefSkin({
  ctx,
  projection,
  landGeom,
  borderMesh,
  width,
  height
}: ShadedReliefOptions): void {
  const path = geoPath(projection, ctx);
  const relief = drawReliefTexture(projection, width, height);

  const paper = ctx.createLinearGradient(0, 0, width, height);
  paper.addColorStop(0, '#f5f4ee');
  paper.addColorStop(0.5, '#eeeee8');
  paper.addColorStop(1, '#e7e9e3');
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, width, height);
  drawOceanContours(ctx, projection, width, height);

  // Cast a soft cartographic shadow, then apply the generated hillshade strictly
  // inside the real, high-resolution land geometry from world-atlas.
  ctx.save();
  ctx.beginPath();
  path(landGeom);
  ctx.fillStyle = '#385e66';
  ctx.shadowColor = 'rgba(22, 49, 55, 0.48)';
  ctx.shadowBlur = 19;
  ctx.shadowOffsetY = 7;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  path(landGeom);
  ctx.clip();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(relief, 0, 0, width, height);
  // Soft upper-left light makes the relief read as raised printed terrain.
  const light = ctx.createLinearGradient(0, 0, width * 0.84, height * 0.94);
  light.addColorStop(0, 'rgba(230, 243, 236, 0.20)');
  light.addColorStop(0.48, 'rgba(208, 229, 225, 0.02)');
  light.addColorStop(1, 'rgba(12, 38, 47, 0.18)');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // Fine political boundaries remain real and selectable, but are subdued like
  // borders etched into a physical relief map.
  ctx.save();
  ctx.beginPath();
  path(borderMesh as any);
  ctx.strokeStyle = 'rgba(235, 241, 235, 0.52)';
  ctx.lineWidth = 1.7;
  ctx.stroke();
  ctx.beginPath();
  path(borderMesh as any);
  ctx.strokeStyle = 'rgba(40, 75, 83, 0.24)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.beginPath();
  path(landGeom);
  ctx.strokeStyle = 'rgba(33, 65, 72, 0.62)';
  ctx.lineWidth = 2.3;
  ctx.stroke();
  ctx.beginPath();
  path(landGeom);
  ctx.strokeStyle = 'rgba(234, 242, 235, 0.7)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();

  drawMapTitle(ctx, width, height);
}
