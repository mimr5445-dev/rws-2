import {
  geoCentroid,
  geoGraticule10,
  geoMercator,
  geoNaturalEarth1,
  geoPath,
  GeoPermissibleObjects,
  GeoProjection
} from 'd3-geo';
import * as countriesNs from 'i18n-iso-countries';
import arLocale from 'i18n-iso-countries/langs/ar.json';
import enLocale from 'i18n-iso-countries/langs/en.json';
import { feature } from 'topojson-client';
import worldAtlas from 'world-atlas/countries-110m.json';
import { GeoRegionItem, MapPack, MapZoneDef, NavCell, Point } from '../core/types';
import { applyWorldNavCorridors } from './worldGeoCorridors';
import {
  createHitTester,
  extractProjectedPolygons,
  rasterizeLandNavGrid,
  rewindGeoJsonForD3,
  slugifyGeoId
} from './worldGeoGeometry';
import { drawWorldBriefingSkin } from './worldBriefingSkin';
import { drawWorldReliefSkin } from './worldReliefSkin';

export { applyWorldNavCorridors, rewindGeoJsonForD3 };

const countries = ((countriesNs as unknown as { default?: typeof countriesNs }).default ??
  countriesNs) as typeof countriesNs;

countries.registerLocale(arLocale as countriesNs.LocaleData);
countries.registerLocale(enLocale as countriesNs.LocaleData);

const adm1Cache = new Map<string, GeoJSON.FeatureCollection>();

/** إسقاط خريطة العالم الكاملة كما هي في التطبيق (مركزه غرينيتش). */
export function createWorldProjection(width = 1920, height = 1080): GeoProjection {
  const topo = worldAtlas as any;
  const countriesFc = feature(topo, topo.objects.countries) as unknown as GeoJSON.FeatureCollection;
  return geoNaturalEarth1().fitExtent(
    [
      [36, 36],
      [width - 36, height - 36]
    ],
    countriesFc
  );
}

export type WorldSkin = 'briefing' | 'relief';

export interface WorldMapPackOptions {
  skin?: WorldSkin;
  id?: string;
  title?: string;
}

interface WorldGeometry {
  width: number;
  height: number;
  cellSize: number;
  projection: GeoProjection;
  countriesFc: GeoJSON.FeatureCollection;
  landGeom: GeoPermissibleObjects;
  featureIso3: Array<string | undefined>;
  regions: Record<string, GeoRegionItem>;
  zones: Record<string, MapZoneDef>;
  anchors: Record<string, Point & { label?: string }>;
  regionIds: string[];
  cols: number;
  rows: number;
  navGrid: NavCell[];
  hitTest: (pt: Point) => string | null;
}

let cachedWorldGeometry: WorldGeometry | null = null;
const worldPackCache = new Map<string, MapPack>();

function getWorldGeometry(): WorldGeometry {
  if (cachedWorldGeometry) return cachedWorldGeometry;

  const width = 1920;
  const height = 1080;
  const cellSize = 8;

  const topo = worldAtlas as any;
  const countriesFc = feature(topo, topo.objects.countries) as unknown as GeoJSON.FeatureCollection;
  const landGeom = feature(topo, topo.objects.land) as unknown as GeoPermissibleObjects;
  const projection = createWorldProjection(width, height);
  const pathGen = geoPath(projection);

  const regions: Record<string, GeoRegionItem> = {};
  const zones: Record<string, MapZoneDef> = {};
  const anchors: Record<string, Point & { label?: string }> = {};
  const regionIds: string[] = [];
  const featureIso3: Array<string | undefined> = [];

  countriesFc.features.forEach((f, i) => {
    const rawId = f.id !== undefined ? String(f.id).padStart(3, '0') : '';
    const enName = (f.properties?.name as string) || `Country_${i}`;
    const a2 = rawId ? countries.numericToAlpha2(rawId) : undefined;
    const iso3 = a2 ? countries.alpha2ToAlpha3(a2) : countries.getAlpha3Code(enName, 'en');
    const arName = iso3 ? countries.getName(iso3, 'ar') : undefined;
    const regId = iso3 || slugifyGeoId(enName);
    regionIds.push(regId);
    featureIso3[i] = iso3;

    const cent = pathGen.centroid(f);
    const b = pathGen.bounds(f);
    const polygons = f.geometry ? extractProjectedPolygons(f.geometry, projection, width) : [];

    if (Number.isFinite(cent[0]) && Number.isFinite(cent[1])) {
      regions[regId] = {
        id: regId,
        iso3,
        name: enName,
        nameAr: arName,
        center: { x: cent[0], y: cent[1] },
        bounds: { minX: b[0][0], minY: b[0][1], maxX: b[1][0], maxY: b[1][1] },
        polygons
      };
      anchors[regId] = { x: Math.round(cent[0]), y: Math.round(cent[1]), label: arName ?? enName };
      if (polygons[0]) {
        zones[regId] = { id: regId, label: arName ?? enName, polygon: polygons[0] };
      }
    }
  });

  // مراسي بحرية واستراتيجية عالمية (تبقى للتحرير والسيناريوهات، ولا تُرسم أسماؤها افتراضياً)
  const strategicPoints: Array<[string, string, [number, number]]> = [
    ['suez_canal', 'قناة السويس', [32.3, 30.5]],
    ['bab_el_mandeb', 'باب المندب', [43.3, 12.6]],
    ['strait_of_hormuz', 'مضيق هرمز', [56.3, 26.6]],
    ['gibraltar', 'جبل طارق', [-5.6, 35.9]],
    ['arabian_sea', 'بحر العرب', [63.0, 15.0]],
    ['mediterranean', 'البحر المتوسط', [18.0, 35.0]],
    ['red_sea', 'البحر الأحمر', [38.5, 20.5]],
    ['riyadh', 'الرياض', [46.7, 24.7]],
    ['cairo', 'القاهرة', [31.2, 30.0]]
  ];
  for (const [anchorId, label, ll] of strategicPoints) {
    const p = projection(ll);
    if (p) anchors[anchorId] = { x: Math.round(p[0]), y: Math.round(p[1]), label };
  }

  // شبكة الملاحة الحقيقية لكل اليابسة (يابسة=0، بحر=1، قناة/جسر مشترك=3)
  const { cols, rows, navGrid } = rasterizeLandNavGrid(landGeom, projection, width, height, cellSize);
  applyWorldNavCorridors(navGrid, cols, rows, projection, cellSize);

  const hitTest = createHitTester(countriesFc.features, regionIds, projection, width, height);

  cachedWorldGeometry = {
    width,
    height,
    cellSize,
    projection,
    countriesFc,
    landGeom,
    featureIso3,
    regions,
    zones,
    anchors,
    regionIds,
    cols,
    rows,
    navGrid,
    hitTest
  };
  return cachedWorldGeometry;
}

/** خريطة عالم كاملة تفاعلية بأحد جلدين: «لوح الإحاطة» أو «التضاريس»، دون أسماء دول. */
export function buildWorldMapPack(options: WorldMapPackOptions = {}): MapPack {
  const skin = options.skin ?? 'briefing';
  const id = options.id ?? (skin === 'briefing' ? 'world_live' : 'world_relief');
  const title =
    options.title ??
    (skin === 'briefing' ? 'خريطة العالم التفاعلية' : 'خريطة العالم — التضاريس');
  const cacheKey = `${id}|${skin}`;
  const cached = worldPackCache.get(cacheKey);
  if (cached) return cached;

  const geo = getWorldGeometry();
  const canvas = document.createElement('canvas');
  canvas.width = geo.width;
  canvas.height = geo.height;
  const ctx = canvas.getContext('2d')!;

  if (skin === 'briefing') {
    drawWorldBriefingSkin({
      ctx,
      projection: geo.projection,
      countriesFc: geo.countriesFc,
      landGeom: geo.landGeom,
      featureIso3: geo.featureIso3,
      width: geo.width,
      height: geo.height
    });
  } else {
    drawWorldReliefSkin({
      ctx,
      projection: geo.projection,
      landGeom: geo.landGeom,
      width: geo.width,
      height: geo.height
    });
  }

  const pack: MapPack = {
    id,
    title,
    kind: 'geopolitical',
    width: geo.width,
    height: geo.height,
    cellSize: geo.cellSize,
    cols: geo.cols,
    rows: geo.rows,
    navGrid: geo.navGrid,
    svgOrUrl: canvas.toDataURL('image/png'),
    unitScaleMultiplier: 0.32,
    anchors: geo.anchors,
    zones: geo.zones,
    geoLevel: 'world',
    regions: geo.regions,
    hitTest: geo.hitTest
  };
  worldPackCache.set(cacheKey, pack);
  return pack;
}

async function fetchAdm1GeoJson(iso3: string): Promise<GeoJSON.FeatureCollection> {
  if (adm1Cache.has(iso3)) return adm1Cache.get(iso3)!;

  // المحاولة 1: خادم media.githubusercontent.com مباشرة (يدعم Git LFS و CORS ويعيد GeoJSON فعلي)
  const directUrl = `https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/main/releaseData/gbOpen/${iso3}/ADM1/geoBoundaries-${iso3}-ADM1_simplified.geojson`;
  try {
    const res = await fetch(directUrl);
    if (res.ok) {
      const json = (await res.json()) as GeoJSON.FeatureCollection;
      if (json?.features?.length) {
        adm1Cache.set(iso3, json);
        return json;
      }
    }
  } catch {
    // متابعة للبديل
  }

  // المحاولة 2: API الرسمي لـ geoBoundaries مع تحويل github raw إلى media.githubusercontent لدعم CORS
  try {
    const metaRes = await fetch(`https://www.geoboundaries.org/api/current/gbOpen/${iso3}/ADM1/`);
    if (metaRes.ok) {
      const meta = await metaRes.json();
      const rawGjUrl: string | undefined = meta?.simplifiedGeometryGeoJSON || meta?.gjDownloadURL;
      const gjUrl = rawGjUrl?.replace(
        /^https:\/\/github\.com\/([^/]+\/[^/]+)\/raw\//,
        'https://media.githubusercontent.com/media/$1/'
      );
      if (gjUrl) {
        const gjRes = await fetch(gjUrl);
        if (gjRes.ok) {
          const json = (await gjRes.json()) as GeoJSON.FeatureCollection;
          if (json?.features?.length) {
            adm1Cache.set(iso3, json);
            return json;
          }
        }
      }
    }
  } catch {
    // متابعة للبديل المحلي
  }

  // البديل المضمون (للدول الصغيرة جدًا أو دون اتصال): استخدام حدود الدولة نفسها من world-atlas
  const topo = worldAtlas as any;
  const countriesFc = feature(topo, topo.objects.countries) as unknown as GeoJSON.FeatureCollection;
  const match = countriesFc.features.find((f) => {
    const rawId = f.id !== undefined ? String(f.id).padStart(3, '0') : '';
    const a2 = rawId ? countries.numericToAlpha2(rawId) : undefined;
    return (a2 ? countries.alpha2ToAlpha3(a2) : '') === iso3;
  });
  return {
    type: 'FeatureCollection',
    features: match ? [match] : []
  };
}

export async function buildCountryProvincesMapPack(iso3: string, displayTitle: string): Promise<MapPack> {
  const width = 1200;
  const height = 800;
  const cellSize = 8;

  const rawFc = await fetchAdm1GeoJson(iso3);
  if (!rawFc.features.length) {
    throw new Error(`تعذر العثور على حدود المحافظات للدولة ${iso3}`);
  }
  const fc = rewindGeoJsonForD3(rawFc);

  const [cLon] = geoCentroid(fc);
  const projection = geoMercator()
    .rotate([-cLon, 0])
    .fitExtent(
      [
        [65, 65],
        [width - 65, height - 65]
      ],
      fc
    );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(width / 2, height / 2, 60, width / 2, height / 2, width * 0.7);
  grad.addColorStop(0, '#0d223a');
  grad.addColorStop(1, '#061221');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  const pathGen = geoPath(projection, ctx);

  ctx.beginPath();
  pathGen(geoGraticule10());
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const regions: Record<string, GeoRegionItem> = {};
  const zones: Record<string, MapZoneDef> = {};
  const anchors: Record<string, Point & { label?: string }> = {};
  const regionIds: string[] = [];
  const usedIds = new Set<string>();

  const palette = ['#1b2b3e', '#203247', '#182637', '#24384f'];

  fc.features.forEach((f, idx) => {
    const rawName = (f.properties?.shapeName as string) || (f.properties?.name as string) || `Province ${idx + 1}`;
    let id = slugifyGeoId(rawName);
    while (usedIds.has(id)) id = `${id}_${idx}`;
    usedIds.add(id);
    regionIds.push(id);

    ctx.beginPath();
    pathGen(f);
    ctx.fillStyle = palette[idx % palette.length];
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    const cent = pathGen.centroid(f);
    const b = pathGen.bounds(f);
    const polygons = f.geometry ? extractProjectedPolygons(f.geometry, projection, width) : [];

    if (Number.isFinite(cent[0]) && Number.isFinite(cent[1])) {
      regions[id] = {
        id,
        name: rawName,
        center: { x: cent[0], y: cent[1] },
        bounds: { minX: b[0][0], minY: b[0][1], maxX: b[1][0], maxY: b[1][1] },
        polygons
      };
      anchors[id] = { x: Math.round(cent[0]), y: Math.round(cent[1]), label: rawName };
      if (polygons[0]) {
        zones[id] = { id, label: rawName, polygon: polygons[0] };
      }

      // كتابة اسم المحافظة أسفل نقطة المرسى لتجنب التداخل مع معرّف المرسى العلوي
      ctx.font = '600 11px "IBM Plex Sans Arabic", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
      ctx.fillText(rawName, cent[0], cent[1] + 19);
    }
  });

  const { cols, rows, navGrid } = rasterizeLandNavGrid(fc, projection, width, height, cellSize);
  const hitTest = createHitTester(fc.features, regionIds, projection, width, height);

  return {
    id: `country_${iso3.toLowerCase()}`,
    title: `${displayTitle} — المحافظات`,
    kind: 'geopolitical',
    width,
    height,
    cellSize,
    cols,
    rows,
    navGrid,
    svgOrUrl: canvas.toDataURL('image/png'),
    unitScaleMultiplier: 0.55,
    anchors,
    zones,
    geoLevel: 'country',
    countryIso3: iso3,
    regions,
    hitTest
  };
}
