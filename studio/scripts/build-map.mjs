#!/usr/bin/env node
/**
 * يبني خريطة العالم مسبقة الإسقاط (S2.1، ADR-0009).
 * المخرجات حتمية بايت ببايت: بلا طوابع زمنية وبلا ترتيب عشوائي.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { feature } from 'topojson-client';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'node_modules/world-atlas/countries-110m.json');
const LICENCE = path.join(ROOT, 'node_modules/world-atlas/LICENSE');
// --out يسمح ببناء نسخة في مجلد مؤقت لاختبار الحتمية دون لمس المخرجات الملتزمة.
const outArgument = process.argv.indexOf('--out');
const OUT_DIR = path.resolve(
  ROOT,
  outArgument > -1 && process.argv[outArgument + 1]
    ? process.argv[outArgument + 1]
    : 'content/maps/world',
);

const WORLD_WIDTH = 8192;
const WORLD_HEIGHT = 4096;
const FORMAT = 'studio.map/1';

const project = (lon, lat) => [
  Math.round(((lon + 180) / 360) * WORLD_WIDTH),
  Math.round(((90 - lat) / 180) * WORLD_HEIGHT),
];

/**
 * إزالة التواء خط التاريخ: بعض الحلقات (روسيا، فيجي، أنتاركتيكا) تعبر ±180
 * فيقفز خط الطول من +179 إلى −179 وتُرسم خطوط أفقية تعبر الخريطة. نفكّ الالتواء
 * بتراكم إزاحة 360، ثم نكرّر الحلقة بإزاحة ±العرض كي تبقى الحافة متصلة.
 */
function unwrapRing(ring) {
  const points = [];
  let shift = 0;
  let previousLon = null;
  for (const [lon, lat] of ring) {
    if (previousLon !== null) {
      const delta = lon - previousLon;
      if (delta > 180) shift -= 360;
      else if (delta < -180) shift += 360;
    }
    previousLon = lon;
    points.push([lon + shift, lat]);
  }
  return points;
}

const topology = JSON.parse(await readFile(SOURCE, 'utf8'));
const collection = feature(topology, topology.objects.countries);
const features = collection.features.filter((item) => item.geometry && item.properties?.name);

const countries = [];
let totalPoints = 0;

for (const item of features) {
  const polygons =
    item.geometry.type === 'Polygon' ? [item.geometry.coordinates] : item.geometry.coordinates;

  const coords = [];
  const rings = [];

  polygons.forEach((polygon, polygonIndex) => {
    polygon.forEach((ring, ringIndex) => {
      const unwrapped = unwrapRing(ring);
      const projected = unwrapped.map(([lon, lat]) => project(lon, lat));
      const minRingX = Math.min(...projected.map(([x]) => x));
      const maxRingX = Math.max(...projected.map(([x]) => x));
      // النسخة الأصلية + نسخ ملتفّة عبر الحافة إن خرجت عن صندوق العالم.
      const offsets = [0];
      if (maxRingX > WORLD_WIDTH) offsets.push(-WORLD_WIDTH);
      if (minRingX < 0) offsets.push(WORLD_WIDTH);

      for (const offset of offsets) {
        const start = coords.length / 2;
        for (const [x, y] of projected) coords.push(x + offset, y);
        rings.push({
          start,
          length: projected.length,
          polygon: polygonIndex,
          hole: ringIndex > 0,
        });
      }
    });
  });

  if (coords.length === 0) continue;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let index = 0; index < coords.length; index += 2) {
    const x = coords[index];
    const y = coords[index + 1];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  const buffer = new Int16Array(coords);
  totalPoints += coords.length / 2;

  countries.push({
    id: String(item.id ?? item.properties.name),
    name: item.properties.name,
    bbox: [minX, minY, maxX, maxY],
    rings,
    coords: Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength).toString('base64'),
  });
}

countries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

const map = {
  format: FORMAT,
  projection: {
    kind: 'equirectangular',
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    quantization: 1,
  },
  countries,
};

const serialized = `${JSON.stringify(map)}\n`;
const hash = createHash('sha256').update(serialized).digest('hex');

await mkdir(OUT_DIR, { recursive: true });
await writeFile(path.join(OUT_DIR, 'map.bin.json'), serialized, 'utf8');
await writeFile(
  path.join(OUT_DIR, 'manifest.json'),
  `${JSON.stringify(
    {
      format: FORMAT,
      file: 'map.bin.json',
      sha256: hash,
      bytes: Buffer.byteLength(serialized),
      countries: countries.length,
      points: totalPoints,
      projection: map.projection,
      source: {
        name: 'world-atlas',
        version: '2.x',
        file: 'countries-110m.json',
        upstream: 'Natural Earth (public domain)',
        licence: 'ISC (Michael Bostock)',
      },
    },
    null,
    2,
  )}\n`,
  'utf8',
);

const licenceText = await readFile(LICENCE, 'utf8');
await writeFile(
  path.join(OUT_DIR, 'LICENSES.md'),
  `# ترخيص خريطة العالم\n\nالمصدر: حزمة \`world-atlas\` (ملف \`countries-110m.json\`)، والبيانات الأصلية من Natural Earth (ملك عام).\n\n## نص ترخيص world-atlas (ISC)\n\n\`\`\`\n${licenceText.trim()}\n\`\`\`\n`,
  'utf8',
);

console.log(
  `✓ ${path.relative(ROOT, path.join(OUT_DIR, 'map.bin.json'))} — ${countries.length} دولة، ${totalPoints} نقطة، ${(Buffer.byteLength(serialized) / 1024).toFixed(1)} ك.ب`,
);
console.log(`✓ البصمة: ${hash}`);
console.log(`✓ manifest.json وLICENSES.md`);
if (process.argv.includes('--print-hash')) console.log(hash);
