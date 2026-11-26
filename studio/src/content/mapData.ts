import type { BBox, PolygonalCountry, RingRef } from '@/core/geo';

export interface MapProjection {
  kind: 'equirectangular';
  worldWidth: number;
  worldHeight: number;
  quantization: number;
}

export interface MapManifest {
  format: string;
  file: string;
  sha256: string;
  bytes: number;
  countries: number;
  points: number;
  projection: MapProjection;
  source: Record<string, string>;
}

export interface RawCountry {
  id: string;
  name: string;
  bbox: [number, number, number, number];
  rings: RingRef[];
  coords: string;
}

export interface RawMap {
  format: string;
  projection: MapProjection;
  countries: RawCountry[];
}

export interface MapData {
  projection: MapProjection;
  countries: PolygonalCountry[];
  manifest: MapManifest | null;
}

const MAP_FORMAT = 'studio.map/1';

function decodeBase64Int16(base64: string): Float64Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const view = new DataView(bytes.buffer);
  const count = bytes.byteLength / 2;
  const out = new Float64Array(count);
  for (let index = 0; index < count; index += 1) out[index] = view.getInt16(index * 2, true);
  return out;
}

export function decodeMap(raw: RawMap): MapData {
  if (raw.format !== MAP_FORMAT) throw new Error(`صيغة خريطة غير معروفة: ${raw.format}`);
  if (raw.projection.kind !== 'equirectangular') {
    throw new Error(`إسقاط غير مدعوم: ${raw.projection.kind}`);
  }

  const countries: PolygonalCountry[] = raw.countries.map((country) => ({
    id: country.id,
    name: country.name,
    bbox: country.bbox as BBox,
    rings: country.rings,
    points: decodeBase64Int16(country.coords),
  }));

  return { projection: raw.projection, countries, manifest: null };
}

export async function sha256HexOf(text: string): Promise<string> {
  return sha256HexOfBytes(new TextEncoder().encode(text));
}

export async function sha256HexOfBytes(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * تحميل الخريطة والتحقق من بصمتها قبل الاستخدام (S2.1).
 * أي اختلاف بين الملف والـ manifest يوقف التحميل برسالة مفهومة.
 */
export async function loadWorldMap(baseUrl = ''): Promise<MapData> {
  const [manifestResponse, mapResponse] = await Promise.all([
    fetch(`${baseUrl}/maps/world/manifest.json`),
    fetch(`${baseUrl}/maps/world/map.bin.json`),
  ]);
  if (!manifestResponse.ok || !mapResponse.ok) {
    throw new Error('تعذّر تحميل ملفات الخريطة');
  }

  const manifest = (await manifestResponse.json()) as MapManifest;
  const text = await mapResponse.text();
  const digest = await sha256HexOf(text);
  if (digest !== manifest.sha256) {
    throw new Error('بصمة الخريطة لا تطابق manifest — الملف تالف أو معدَّل');
  }

  const decoded = decodeMap(JSON.parse(text) as RawMap);
  return { ...decoded, manifest };
}
