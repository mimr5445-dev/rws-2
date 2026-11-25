#!/usr/bin/env node
/**
 * يولّد المشهد الصغير الحتمي (S3.7) في content/scenes.
 * لا طوابع زمنية ولا عشوائية: الملف وبصمته ثابتان بايت ببايت.
 */
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_DIR = path.join(ROOT, 'content/scenes');

const RIYADH = { lon: 46.6753, lat: 24.7136 };
const DAMMAM = { lon: 50.1033, lat: 26.4207 };
const JEDDAH = { lon: 39.1978, lat: 21.4858 };
const ABHA = { lon: 42.5053, lat: 18.2164 };

const project = {
  schemaVersion: 1,
  id: 'scene.small',
  title: 'مشهد صغير: ثلاث وحدات ووصول',
  locale: 'ar',
  seed: 42,
  map: 'world',
  durationTicks: 180,
  entities: [
    {
      id: 'u1',
      kind: 'unit',
      assetId: 'unit.armor',
      side: 'a',
      position: RIYADH,
      scale: 1,
    },
    {
      id: 'u2',
      kind: 'unit',
      assetId: 'unit.infantry',
      side: 'b',
      position: JEDDAH,
      scale: 1,
    },
    {
      id: 'u3',
      kind: 'unit',
      assetId: 'unit.recon',
      side: 'neutral',
      position: ABHA,
      scale: 1,
    },
    {
      id: 'm1',
      kind: 'marker',
      assetId: 'marker.objective',
      side: 'a',
      position: DAMMAM,
      scale: 1.2,
      spawnTick: 120,
    },
  ],
  tracks: [
    {
      id: 'tr-u1',
      targetId: 'u1',
      property: 'position',
      path: {
        points: [RIYADH, { lon: 47.5, lat: 25.3 }, DAMMAM],
        startTick: 0,
        endTick: 120,
        easing: 'linear',
      },
    },
    {
      id: 'tr-m1-scale',
      targetId: 'm1',
      property: 'scale',
      keyframes: [
        { tick: 120, value: 1.2, easing: 'linear' },
        { tick: 140, value: 1.6, easing: 'easeOut' },
        { tick: 180, value: 1.2, easing: 'easeInOut' },
      ],
    },
  ],
  triggers: [
    { id: 't1', when: { after: 'u1.arrived' } },
    { id: 't2', when: { after: 't1.done' } },
    { id: 't3', when: { after: 't2.done' } },
    { id: 't0', when: { tick: 60 } },
  ],
  effects: [],
  cues: [],
  camera: [
    { tick: 0, lon: 46.6753, lat: 24.7136, zoom: 1, easing: 'easeInOut' },
    { tick: 120, lon: 50.1033, lat: 26.4207, zoom: 1.4, easing: 'easeInOut' },
  ],
  variables: { sideA: 'الفريق الأحمر' },
};

const serialized = `${JSON.stringify(project, null, 2)}\n`;
const sha256 = createHash('sha256').update(serialized).digest('hex');

await mkdir(OUT_DIR, { recursive: true });
await writeFile(path.join(OUT_DIR, 'small-scene.project.json'), serialized, 'utf8');
await writeFile(
  path.join(OUT_DIR, 'manifest.json'),
  `${JSON.stringify(
    {
      format: 'studio.scenes/1',
      files: [
        {
          file: 'small-scene.project.json',
          sha256,
          bytes: Buffer.byteLength(serialized),
          entities: project.entities.length,
          tracks: project.tracks.length,
          triggers: project.triggers.length,
          durationTicks: project.durationTicks,
          licence: 'أصل أصلي داخل المشروع (CC0)',
        },
      ],
    },
    null,
    2,
  )}\n`,
  'utf8',
);

console.log(
  `✓ content/scenes/small-scene.project.json — ${project.entities.length} كياناً، ${project.tracks.length} مساراً، ${project.triggers.length} مشغّلاً`,
);
console.log(`✓ البصمة: ${sha256}`);
process.exit(0);
