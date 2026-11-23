import { geoArea, GeoProjection } from 'd3-geo';
import { GeoPermissibleObjects, geoPath } from 'd3-geo';
import { NavCell, Point } from '../core/types';

export function slugifyGeoId(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') || 'region'
  );
}

export function extractProjectedPolygons(
  geometry: GeoJSON.Geometry,
  projection: GeoProjection,
  mapWidth: number
): Point[][] {
  const result: Point[][] = [];
  const projectRing = (ring: number[][]) => {
    let segment: Point[] = [];
    let prev: Point | null = null;
    for (const coord of ring) {
      const p = projection([coord[0], coord[1]]);
      if (!p || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) continue;
      const pt = { x: p[0], y: p[1] };
      if (prev && Math.abs(pt.x - prev.x) > mapWidth * 0.45) {
        if (segment.length >= 3) result.push(segment);
        segment = [];
      }
      segment.push(pt);
      prev = pt;
    }
    if (segment.length >= 3) result.push(segment);
  };

  if (geometry.type === 'Polygon') {
    if (geometry.coordinates[0]) projectRing(geometry.coordinates[0]);
  } else if (geometry.type === 'MultiPolygon') {
    for (const poly of geometry.coordinates) {
      if (poly[0]) projectRing(poly[0]);
    }
  }
  return result;
}

export function createHitTester(
  features: GeoJSON.Feature[],
  regionIds: string[],
  projection: GeoProjection,
  mapWidth: number,
  mapHeight: number
): (pt: Point) => string | null {
  const scale = 0.5;
  const hw = Math.floor(mapWidth * scale);
  const hh = Math.floor(mapHeight * scale);
  const hitCanvas = document.createElement('canvas');
  hitCanvas.width = hw;
  hitCanvas.height = hh;
  const ctx = hitCanvas.getContext('2d', { willReadFrequently: true })!;
  ctx.scale(scale, scale);

  const pathGen = geoPath(projection, ctx);
  features.forEach((f, idx) => {
    const colorNum = idx + 1;
    const r = (colorNum >> 16) & 255;
    const g = (colorNum >> 8) & 255;
    const b = colorNum & 255;
    ctx.beginPath();
    pathGen(f);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fill();
  });

  return (pt: Point) => {
    const x = Math.floor(pt.x * scale);
    const y = Math.floor(pt.y * scale);
    if (x < 0 || y < 0 || x >= hw || y >= hh) return null;
    const d = ctx.getImageData(x, y, 1, 1).data;
    if (d[3] < 128) return null;
    const idx = (d[0] << 16) | (d[1] << 8) | d[2];
    return idx > 0 ? regionIds[idx - 1] ?? null : null;
  };
}

export function rasterizeLandNavGrid(
  landGeo: GeoPermissibleObjects,
  projection: GeoProjection,
  width: number,
  height: number,
  cellSize: number
): { cols: number; rows: number; navGrid: NavCell[] } {
  const cols = Math.floor(width / cellSize);
  const rows = Math.floor(height / cellSize);
  const navCanvas = document.createElement('canvas');
  navCanvas.width = cols;
  navCanvas.height = rows;
  const ctx = navCanvas.getContext('2d')!;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, cols, rows);

  ctx.save();
  ctx.scale(cols / width, rows / height);
  const pathGen = geoPath(projection, ctx);
  ctx.beginPath();
  pathGen(landGeo);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();

  const pixels = ctx.getImageData(0, 0, cols, rows).data;
  const navGrid: NavCell[] = new Array(cols * rows).fill(1); // 1 = بحر
  for (let i = 0; i < cols * rows; i++) {
    if (pixels[i * 4] > 48) navGrid[i] = 0; // 0 = يابسة
  }
  return { cols, rows, navGrid };
}

export function carveNavCorridor(
  navGrid: NavCell[],
  cols: number,
  rows: number,
  projection: GeoProjection,
  cellSize: number,
  waypoints: Array<[number, number]>,
  radiusCells: number,
  cellValue: NavCell
): void {
  const stamp = (gx: number, gy: number) => {
    for (let dy = -radiusCells; dy <= radiusCells; dy++) {
      for (let dx = -radiusCells; dx <= radiusCells; dx++) {
        const nx = gx + dx;
        const ny = gy + dy;
        if (nx >= 0 && ny >= 0 && nx < cols && ny < rows) {
          navGrid[ny * cols + nx] = cellValue;
        }
      }
    }
  };

  let prevGx: number | null = null;
  let prevGy: number | null = null;
  const stampConnected = (gx: number, gy: number) => {
    if (prevGx !== null && prevGy !== null && gx !== prevGx && gy !== prevGy) {
      stamp(gx, prevGy);
    }
    stamp(gx, gy);
    prevGx = gx;
    prevGy = gy;
  };

  for (let i = 0; i < waypoints.length; i++) {
    const p1 = projection(waypoints[i]);
    if (!p1) continue;
    const x1 = p1[0] / cellSize;
    const y1 = p1[1] / cellSize;
    stampConnected(Math.floor(x1), Math.floor(y1));
    if (i + 1 < waypoints.length) {
      const p2 = projection(waypoints[i + 1]);
      if (!p2) continue;
      const x2 = p2[0] / cellSize;
      const y2 = p2[1] / cellSize;
      const steps = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 2));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        stampConnected(Math.floor(x1 + (x2 - x1) * t), Math.floor(y1 + (y2 - y1) * t));
      }
    }
  }
}

function rewindPolygonRings(rings: number[][][]): number[][][] {
  return rings.map((ring, idx) => {
    const area = geoArea({ type: 'Polygon', coordinates: [ring] });
    const isOuter = idx === 0;
    const needsReverse = isOuter ? area > 2 * Math.PI : area < 2 * Math.PI;
    return needsReverse ? [...ring].reverse() : ring;
  });
}

export function rewindGeoJsonForD3(fc: GeoJSON.FeatureCollection): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: fc.features.map((f) => {
      if (!f.geometry) return f;
      if (f.geometry.type === 'Polygon') {
        return {
          ...f,
          geometry: { ...f.geometry, coordinates: rewindPolygonRings(f.geometry.coordinates) }
        };
      }
      if (f.geometry.type === 'MultiPolygon') {
        return {
          ...f,
          geometry: {
            ...f.geometry,
            coordinates: f.geometry.coordinates.map((poly) => rewindPolygonRings(poly))
          }
        };
      }
      return f;
    })
  };
}
