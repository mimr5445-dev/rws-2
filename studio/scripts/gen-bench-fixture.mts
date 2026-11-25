/**
 * يولّد fixtures/bench.project.json حتمياً (S1.8).
 * الملف الناتج لا يُعدَّل يدوياً: كل قياس في المراحل 05–09 يعتمد عليه.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ProjectSchema } from '../src/core/model/project.ts';

const SEED = 42;
const DURATION_TICKS = 1800; // 30 ثانية
const UNITS = 50;
const STATIC_ENTITIES = 100;
const EXPLOSIONS = 20;

const entityId = (index: number) => `u${String(index + 1).padStart(2, '0')}`;
const staticId = (index: number) => `s${String(index + 1).padStart(3, '0')}`;

const center = { lon: 30, lat: 30 };
const radius = 10;

const ringPoint = (index: number, count: number, ringRadius: number) => {
  const angle = (index / count) * Math.PI * 2;
  return {
    lon: center.lon + Math.cos(angle) * ringRadius,
    lat: center.lat + Math.sin(angle) * ringRadius * 0.7,
  };
};

const units = Array.from({ length: UNITS }, (_, index) => ({
  id: entityId(index),
  kind: 'unit' as const,
  assetId: index % 2 === 0 ? 'symbol.infantry' : 'symbol.armor',
  side: index % 3 === 0 ? ('b' as const) : ('a' as const),
  position: ringPoint(index, UNITS, radius),
  scale: 1,
  spawnTick: 0,
}));

const statics = Array.from({ length: STATIC_ENTITIES }, (_, index) => {
  const kinds = ['marker', 'structure', 'zone', 'label'] as const;
  const kind = kinds[index % kinds.length] ?? 'marker';
  return {
    id: staticId(index),
    kind,
    assetId: `static.${kind}`,
    side: 'neutral' as const,
    position: ringPoint(index, STATIC_ENTITIES, radius * 1.6),
    scale: kind === 'zone' ? 2 : 1,
  };
});

const tracks = units.map((unit, index) => {
  const startTick = 120 + index * 6;
  const endTick = Math.min(DURATION_TICKS - 60, startTick + 480);
  return {
    id: `path.${unit.id}`,
    targetId: unit.id,
    property: 'position' as const,
    path: {
      points: [unit.position, ringPoint(index + 7, UNITS, radius * 0.35)],
      startTick,
      endTick,
      easing: 'easeInOut' as const,
    },
  };
});

const effects = Array.from({ length: EXPLOSIONS }, (_, index) => ({
  id: `boom.${String(index + 1).padStart(2, '0')}`,
  kind: 'fireball' as const,
  at: { tick: 90 + index * 84 },
  position: ringPoint(index + 3, EXPLOSIONS, radius * 0.6),
  intensity: 0.6 + (index % 4) * 0.1,
}));

const triggers = Array.from({ length: EXPLOSIONS }, (_, index) => ({
  id: `t.${String(index + 1).padStart(2, '0')}`,
  when: { tick: 90 + index * 84 },
}));

const cues = triggers.map((trigger, index) => ({
  id: `cue.${String(index + 1).padStart(2, '0')}`,
  when: { tick: 90 + index * 84 },
  clipId: index % 2 === 0 ? 'weapons/explosion_01' : 'weapons/explosion_02',
  gain: 0.8,
  pan: 0,
}));

const camera = [
  { tick: 0, lon: center.lon, lat: center.lat, zoom: 1.2, easing: 'easeInOut' as const },
  { tick: 900, lon: center.lon + 2, lat: center.lat + 1.5, zoom: 2, easing: 'easeInOut' as const },
  { tick: 1799, lon: center.lon - 1, lat: center.lat - 1, zoom: 1.5, easing: 'linear' as const },
];

const project = {
  schemaVersion: 1 as const,
  id: 'bench',
  title: 'مشهد القياس المرجعي',
  locale: 'ar' as const,
  seed: SEED,
  map: 'world',
  durationTicks: DURATION_TICKS,
  entities: [...units, ...statics],
  tracks,
  triggers,
  effects,
  cues,
  camera,
  variables: { speed: 1, label: 'bench' },
};

const parsed = ProjectSchema.safeParse(project);
if (!parsed.success) {
  console.error('المشروع المرجعي غير صالح:', parsed.error.issues.slice(0, 5));
  process.exit(1);
}

const target = path.resolve(import.meta.dirname, '..', 'fixtures/bench.project.json');
await mkdir(path.dirname(target), { recursive: true });
await writeFile(target, `${JSON.stringify(project, null, 2)}\n`, 'utf8');
console.log(
  `✓ fixtures/bench.project.json: ${project.entities.length} كياناً، ${tracks.length} مساراً، ${effects.length} انفجاراً، ${DURATION_TICKS} tick`,
);
