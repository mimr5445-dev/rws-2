import { Graphics } from 'pixi.js';
import { StudioEngine } from '../../engine/engine';
import { EditorOverlayState, lerp } from './rendererUtils';

export interface MapOverlayCacheState {
  countryTintDirty: boolean;
  hoverHighlightCacheKey: string;
  selectHighlightCacheKey: string;
  hadNavOverlay: boolean;
  hadActiveZones: boolean;
  hadActiveCraters: boolean;
}

export interface MapOverlayLayers {
  countryTintGraphics: Graphics;
  geoHoverGraphics: Graphics;
  geoSelectGraphics: Graphics;
  navOverlay: Graphics;
  zoneGraphics: Graphics;
  craterGraphics: Graphics;
  pathGraphics: Graphics;
  arrowGraphics: Graphics;
  pulseGraphics: Graphics;
}

export interface MapOverlayRenderInput {
  engine: StudioEngine;
  alpha: number;
  camZoom: number;
  hideUIHelpers: boolean;
  selectedEntityId: string | null;
  hoveredRegionId: string | null;
  selectedRegionId: string | null;
  countryColorMap: Record<string, string>;
  editorOverlay: EditorOverlayState;
  cache: MapOverlayCacheState;
  layers: MapOverlayLayers;
}

export function drawRegionHighlight(
  g: Graphics,
  engine: StudioEngine,
  regionId: string | null,
  camZoom: number,
  hideUIHelpers: boolean,
  fillColor: number,
  fillAlpha: number,
  strokeColor: number,
  strokeWidth: number
): void {
  g.clear();
  if (!regionId || !engine.map.regions || hideUIHelpers) return;
  const reg = engine.map.regions[regionId];
  if (!reg) return;
  for (const poly of reg.polygons) {
    if (poly.length < 3) continue;
    const flat = poly.flatMap((p) => [p.x, p.y]);
    g.poly(flat, true)
      .fill({ color: fillColor, alpha: fillAlpha })
      .stroke({ width: strokeWidth / Math.max(0.4, camZoom), color: strokeColor, alpha: 0.95 });
  }
}

export function renderMapOverlays(input: MapOverlayRenderInput): void {
  const {
    engine,
    alpha,
    camZoom,
    hideUIHelpers,
    selectedEntityId,
    hoveredRegionId,
    selectedRegionId,
    countryColorMap,
    editorOverlay,
    cache,
    layers
  } = input;

  if (cache.countryTintDirty) {
    cache.countryTintDirty = false;
    layers.countryTintGraphics.clear();
    if (engine.map.geoLevel === 'world' && engine.map.regions) {
      for (const [regId, hex] of Object.entries(countryColorMap)) {
        const reg = engine.map.regions[regId];
        if (!reg) continue;
        const numericCol = parseInt(hex.replace('#', ''), 16);
        if (!Number.isFinite(numericCol)) continue;
        for (const poly of reg.polygons) {
          if (poly.length < 3) continue;
          const flat = poly.flatMap((p) => [p.x, p.y]);
          layers.countryTintGraphics
            .poly(flat, true)
            .fill({ color: numericCol, alpha: 0.34 })
            .stroke({ width: 0.9, color: numericCol, alpha: 0.72 });
        }
      }
    }
  }

  // تمييز الدولة أو المحافظة عند التمرير والتحديد (مع التخزين المؤقت لتفادي إعادة التثليث عند 120 FPS)
  const zoomBucket = Math.round(camZoom * 20);
  const hoverKey = `${engine.map.id}|${hoveredRegionId ?? ''}|${hideUIHelpers ? 1 : 0}|${zoomBucket}`;
  if (hoverKey !== cache.hoverHighlightCacheKey) {
    cache.hoverHighlightCacheKey = hoverKey;
    drawRegionHighlight(layers.geoHoverGraphics, engine, hoveredRegionId, camZoom, hideUIHelpers, 0x38bdf8, 0.22, 0x38bdf8, 1.9);
  }

  const selHex = selectedRegionId ? countryColorMap[selectedRegionId] : undefined;
  const selTint = selHex ? parseInt(selHex.replace('#', ''), 16) : 0xf59e0b;
  const selectKey = `${engine.map.id}|${selectedRegionId ?? ''}|${selHex ?? ''}|${hideUIHelpers ? 1 : 0}|${zoomBucket}`;
  if (selectKey !== cache.selectHighlightCacheKey) {
    cache.selectHighlightCacheKey = selectKey;
    drawRegionHighlight(
      layers.geoSelectGraphics,
      engine,
      selectedRegionId,
      camZoom,
      hideUIHelpers,
      Number.isFinite(selTint) ? selTint : 0xf59e0b,
      0.3,
      0xfbbf24,
      2.8
    );
  }

  // طبقة شبكة الملاحة ومسودة المناطق في وضع صانع الخرائط
  const showNavNow =
    editorOverlay.enabled &&
    (editorOverlay.showNavGrid || editorOverlay.draftZonePoints.length > 0);
  if (showNavNow || cache.hadNavOverlay) {
    layers.navOverlay.clear();
    cache.hadNavOverlay = showNavNow;
    if (editorOverlay.enabled && editorOverlay.showNavGrid) {
      const m = engine.map;
      for (let y = 0; y < m.rows; y++) {
        for (let x = 0; x < m.cols; x++) {
          const cell = m.navGrid[y * m.cols + x];
          if (cell === 1) {
            layers.navOverlay
              .rect(x * m.cellSize, y * m.cellSize, m.cellSize, m.cellSize)
              .fill({ color: 0x38bdf8, alpha: 0.25 });
          } else if (cell === 2) {
            layers.navOverlay
              .rect(x * m.cellSize, y * m.cellSize, m.cellSize, m.cellSize)
              .fill({ color: 0xef4444, alpha: 0.35 });
          } else if (cell === 3) {
            layers.navOverlay
              .rect(x * m.cellSize, y * m.cellSize, m.cellSize, m.cellSize)
              .fill({ color: 0x10b981, alpha: 0.35 });
          }
        }
      }
    }
    if (editorOverlay.enabled && editorOverlay.draftZonePoints.length > 0) {
      const pts = editorOverlay.draftZonePoints;
      pts.forEach((p) => layers.navOverlay.circle(p.x, p.y, 5).fill({ color: 0xf472b6 }));
      if (pts.length > 1) {
        layers.navOverlay.poly(pts.flatMap((p) => [p.x, p.y]), false).stroke({ width: 2, color: 0xf472b6 });
      }
    }
  }

  // المناطق (مع تنعيم الشفافية البيني)
  let anyZone = false;
  for (const zState of engine.zones.values()) {
    if (zState.opacity > 0.01 || zState.targetOpacity > 0.01) {
      anyZone = true;
      break;
    }
  }
  if (anyZone || cache.hadActiveZones) {
    layers.zoneGraphics.clear();
    cache.hadActiveZones = anyZone;
    if (anyZone) {
      for (const zState of engine.zones.values()) {
        const zOpacity = lerp(zState.prevOpacity, zState.opacity, alpha);
        if (zOpacity <= 0.01) continue;
        const def = engine.map.zones[zState.id];
        if (!def) continue;
        const pts = def.polygon.flatMap((p) => [p.x, p.y]);
        layers.zoneGraphics
          .poly(pts, true)
          .fill({ color: zState.color, alpha: zOpacity })
          .stroke({ width: 2, color: zState.color, alpha: 0.85 });
      }
    }
  }

  // فوهات وآثار القصف الأرضية المؤقتة
  if (engine.craters.length > 0 || cache.hadActiveCraters) {
    layers.craterGraphics.clear();
    cache.hadActiveCraters = engine.craters.length > 0;
    for (const c of engine.craters) {
      const cLife = Math.max(0, lerp(c.prevLife, c.life, alpha));
      const fade = Math.max(0, Math.min(1, (cLife / Math.max(0.1, c.maxLife)) * 1.8));
      if (fade <= 0.01) continue;
      layers.craterGraphics.circle(c.x, c.y, c.radius * 1.32).fill({ color: 0x090d16, alpha: 0.38 * fade });
      layers.craterGraphics
        .circle(c.x, c.y, c.radius * 0.7)
        .fill({ color: 0x1e293b, alpha: 0.72 * fade })
        .stroke({ width: 1.8, color: 0x475569, alpha: 0.65 * fade });
      layers.craterGraphics.circle(c.x, c.y, c.radius * 0.32).fill({ color: 0x020617, alpha: 0.82 * fade });
    }
  }

  // رسم مسار A* للوحدة المحددة
  layers.pathGraphics.clear();
  if (!hideUIHelpers && selectedEntityId) {
    const sel = engine.entities.get(selectedEntityId);
    if (sel && sel.path.length > 0) {
      let px = lerp(sel.prevX, sel.x, alpha);
      let py = lerp(sel.prevY, sel.y, alpha);
      for (const wp of sel.path) {
        layers.pathGraphics.moveTo(px, py).lineTo(wp.x, wp.y).stroke({ width: 2, color: 0x22c55e, alpha: 0.65 });
        px = wp.x;
        py = wp.y;
      }
      const dest = sel.path[sel.path.length - 1];
      layers.pathGraphics.circle(dest.x, dest.y, 5).stroke({ width: 2, color: 0x22c55e, alpha: 0.85 });
    }
  }

  // الأسهم (بتنعيم بيني 120 FPS)
  layers.arrowGraphics.clear();
  for (const arr of engine.arrows.values()) {
    const arrProg = Math.max(0, Math.min(1, lerp(arr.prevProgress, arr.progress, alpha)));
    const mx = (arr.from.x + arr.to.x) / 2;
    const my = (arr.from.y + arr.to.y) / 2 - 55;
    const steps = 24;
    const exactStep = steps * arrProg;
    const wholeStep = Math.floor(exactStep);
    const fracStep = exactStep - wholeStep;
    let prev = arr.from;
    const evalQuad = (t: number) => ({
      x: (1 - t) * (1 - t) * arr.from.x + 2 * (1 - t) * t * mx + t * t * arr.to.x,
      y: (1 - t) * (1 - t) * arr.from.y + 2 * (1 - t) * t * my + t * t * arr.to.y
    });
    for (let i = 1; i <= wholeStep; i++) {
      const pt = evalQuad(i / steps);
      if (!arr.dashed || i % 2 === 1) {
        layers.arrowGraphics.moveTo(prev.x, prev.y).lineTo(pt.x, pt.y).stroke({ width: 4, color: arr.color, alpha: 0.9 });
      }
      prev = pt;
    }
    if (fracStep > 0.01 && wholeStep < steps) {
      const tip = evalQuad(arrProg);
      if (!arr.dashed || (wholeStep + 1) % 2 === 1) {
        layers.arrowGraphics.moveTo(prev.x, prev.y).lineTo(tip.x, tip.y).stroke({ width: 4, color: arr.color, alpha: 0.9 });
      }
      prev = tip;
    }
    if (arrProg > 0.12) {
      const ang = Math.atan2(prev.y - my, prev.x - mx);
      layers.arrowGraphics
        .poly([
          prev.x + Math.cos(ang) * 10,
          prev.y + Math.sin(ang) * 10,
          prev.x + Math.cos(ang + 2.5) * 10,
          prev.y + Math.sin(ang + 2.5) * 10,
          prev.x + Math.cos(ang - 2.5) * 10,
          prev.y + Math.sin(ang - 2.5) * 10
        ])
        .fill({ color: arr.color });
    }
  }

  // موجات التنبيه والمسح الراداري (Pulses بتنعيم 120 FPS)
  layers.pulseGraphics.clear();
  for (const p of engine.pulses) {
    const pulseProg = Math.max(0, Math.min(1, lerp(p.prevProgress, p.progress, alpha)));
    const r = 10 + p.maxRadius * pulseProg;
    const a = Math.max(0, 1 - pulseProg);
    layers.pulseGraphics
      .circle(p.x, p.y, r)
      .stroke({ width: 3.2, color: p.color, alpha: a * 0.9 })
      .circle(p.x, p.y, r * 0.65)
      .stroke({ width: 1.5, color: 0xe0f2fe, alpha: a * 0.55 })
      .circle(p.x, p.y, Math.max(4, 14 * (1 - pulseProg)))
      .fill({ color: p.color, alpha: a * 0.28 });
  }
}
