import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { canonicalize, sha256Hex } from '@/core/hash';
import { ProjectSchema, type Project } from '@/core/model/project';
import { project } from '@/core/geo';
import { ease } from '@/core/sim';
import { measurePath, pointAtLength } from '@/core/sim/path';
import { sampleKeyframes, samplePath } from '@/core/sim/track';
import { arrivalTicksOf, scheduleTriggers, TriggerCycleError } from '@/core/sim/triggers';
import { entityStatesAt, hasArrivalAt, simulate } from '@/core/sim/simulate';

const SCENE = path.resolve(process.cwd(), 'content/scenes/small-scene.project.json');
const rawScene = JSON.parse(readFileSync(SCENE, 'utf8')) as Record<string, unknown>;
const scene = ProjectSchema.parse(rawScene);

describe('منحنيات التسكين (S3.3)', () => {
  it('الطرفان ثابتان وكل منحنى رتيب', () => {
    for (const name of ['linear', 'easeIn', 'easeOut', 'easeInOut', 'step'] as const) {
      expect(ease(name, 0)).toBe(0);
      expect(ease(name, 1)).toBe(1);
      let previous = -1;
      for (let step = 0; step <= 20; step += 1) {
        const value = ease(name, step / 20);
        expect(value).toBeGreaterThanOrEqual(previous);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
        previous = value;
      }
    }
  });

  it('easeInOut متماثل حول المنتصف', () => {
    expect(ease('easeInOut', 0.25) + ease('easeInOut', 0.75)).toBeCloseTo(1, 12);
    expect(ease('easeIn', 0.5)).toBeCloseTo(0.25, 12);
    expect(ease('easeOut', 0.5)).toBeCloseTo(0.75, 12);
  });

  it('step لا يتقدّم قبل النهاية', () => {
    expect(ease('step', 0.999)).toBe(0);
    expect(ease('step', 1)).toBe(1);
  });
});

describe('طول القوس على المسار (S3.4)', () => {
  const points = [
    { lon: 0, lat: 0 },
    { lon: 10, lat: 0 },
    { lon: 10, lat: 20 },
  ];

  it('الطول يساوي مجموع المقاطع في الإسقاط', () => {
    const measured = measurePath(points);
    const expected = [project(0, 0), project(10, 0), project(10, 20)].reduce(
      (total, point, index, all) => {
        if (index === 0) return 0;
        const previous = all[index - 1]!;
        return total + Math.hypot(point.x - previous.x, point.y - previous.y);
      },
      0,
    );
    expect(measured.length).toBeCloseTo(expected, 6);
  });

  it('منتصف الطول يقع على منتصف المسار لا على منتصف النقاط', () => {
    const measured = measurePath(points);
    const middle = pointAtLength(measured, measured.length / 2);
    // النقطة الوسطى هندسياً هي رأس الزاوية (10,0)، ونصف الطول يقع على ضلعه الثاني.
    const corner = project(10, 0);
    const start = project(0, 0);
    const firstLeg = Math.hypot(corner.x - start.x, corner.y - start.y);
    expect(measured.length / 2).toBeGreaterThan(firstLeg);
    expect(middle.x).toBeCloseTo(corner.x, 6);
    // محور y في العالم يشير للأسفل: خط العرض الأكبر يعني y أصغر.
    expect(middle.y).toBeLessThan(corner.y);
  });

  it('الأطراف والمسافات خارج المدى تُقيَّد', () => {
    const measured = measurePath(points);
    expect(pointAtLength(measured, 0)).toEqual(project(0, 0));
    const end = pointAtLength(measured, measured.length);
    expect(end.x).toBeCloseTo(project(10, 20).x, 6);
    expect(pointAtLength(measured, -50)).toEqual(project(0, 0));
    expect(pointAtLength(measured, measured.length * 3)).toEqual(end);
  });

  it('مسار بطول صفر يعطي أول نقطة بلا انفجار', () => {
    const measured = measurePath([
      { lon: 5, lat: 5 },
      { lon: 5, lat: 5 },
    ]);
    expect(measured.length).toBe(0);
    expect(pointAtLength(measured, 10)).toEqual(project(5, 5));
  });
});

describe('تقييم المسارات والمفاتيح (S3.3، S3.4)', () => {
  const path = {
    points: [
      { lon: 0, lat: 0 },
      { lon: 20, lat: 0 },
    ],
    startTick: 0,
    endTick: 100,
    easing: 'linear' as const,
  };

  it('البداية والنهاية على طرفي المسار', () => {
    expect(samplePath(path, 0).lon).toBeCloseTo(0, 6);
    expect(samplePath(path, 100).lon).toBeCloseTo(20, 6);
  });

  it('عند منتصف المدة يكون منتصف المسافة (linearly)', () => {
    const middle = samplePath(path, 50);
    expect(middle.lon).toBeCloseTo(10, 6);
    const world = project(middle.lon, middle.lat);
    const start = project(0, 0);
    const end = project(20, 0);
    expect(world.x - start.x).toBeCloseTo((end.x - start.x) / 2, 3);
  });

  it('easeInOut يعطي المنتصف تماماً عند المنتصف', () => {
    const eased = samplePath({ ...path, easing: 'easeInOut' }, 50);
    expect(eased.lon).toBeCloseTo(10, 6);
  });

  it('قبل البداية وبعد النهاية يُقيَّدان', () => {
    expect(samplePath(path, -10).lon).toBeCloseTo(0, 6);
    expect(samplePath(path, 500).lon).toBeCloseTo(20, 6);
  });

  it('المفاتيح العددية تُقيَّم مع تسكين الوصول', () => {
    const keyframes = [
      { tick: 0, value: 1, easing: 'linear' as const },
      { tick: 100, value: 3, easing: 'linear' as const },
    ];
    expect(sampleKeyframes(keyframes, 0)).toBe(1);
    expect(sampleKeyframes(keyframes, 50)).toBe(2);
    expect(sampleKeyframes(keyframes, 100)).toBe(3);
    expect(sampleKeyframes(keyframes, 40)).toBe(1.8);
  });

  it('مفاتيح المواقع تُقيَّم خطياً بين نقطتين', () => {
    const keyframes = [
      { tick: 0, value: { lon: 0, lat: 0 }, easing: 'linear' as const },
      { tick: 10, value: { lon: 10, lat: 20 }, easing: 'linear' as const },
    ];
    expect(sampleKeyframes(keyframes, 5)).toEqual({ lon: 5, lat: 10 });
  });
});

describe('ترتيب المشغّلات والدورات (S3.2)', () => {
  const base = { ...scene };

  it('سلسلة من ثلاثة مشغّلات تُرتَّب طوبولوجياً مهما كان ترتيب التصريح', () => {
    const chain = [
      { id: 'a', when: { tick: 10 } },
      { id: 'b', when: { after: 'a.done' } },
      { id: 'c', when: { after: 'b.done' } },
    ];
    const forward = scheduleTriggers({ ...base, triggers: chain });
    const backward = scheduleTriggers({ ...base, triggers: [...chain].reverse() });
    expect(forward.order).toEqual(['a', 'b', 'c']);
    expect(backward.order).toEqual(['a', 'b', 'c']);
    expect(backward.ticks.get('c')).toBe(10);
    expect([...forward.ticks.entries()]).toEqual([...backward.ticks.entries()]);
  });

  it('المشغّل بعد arrived يأخذ tick الوصول نفسه', () => {
    const arrivals = arrivalTicksOf(scene);
    expect(arrivals.get('u1')).toBe(120);
    const schedule = scheduleTriggers(scene);
    expect(schedule.ticks.get('t1')).toBe(120);
    expect(schedule.ticks.get('t2')).toBe(120);
    expect(schedule.ticks.get('t3')).toBe(120);
    expect(schedule.ticks.get('t0')).toBe(60);
  });

  it('الدورة تُرفض برسالة تذكر الحلقة', () => {
    const cyclic = [
      { id: 'x', when: { after: 'y.done' } },
      { id: 'y', when: { after: 'x.done' } },
    ];
    let error: unknown;
    try {
      scheduleTriggers({ ...base, triggers: cyclic });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(TriggerCycleError);
    expect((error as TriggerCycleError).cycle.length).toBeGreaterThanOrEqual(2);
    expect(String((error as Error).message)).toMatch(/→/);
  });

  it('المرجع إلى حدث لا يقع يُدرج في unresolved', () => {
    const dangling = [{ id: 'lonely', when: { after: 'u3.arrived' } }];
    const schedule = scheduleTriggers({ ...base, triggers: dangling });
    expect(schedule.unresolved).toEqual(['lonely']);
    expect(schedule.ticks.has('lonely')).toBe(false);
  });
});

describe('حالة الكيانات: الشفافية والدوران والانطفاء (S3.3)', () => {
  const withExtraTracks = ProjectSchema.parse({
    ...rawScene,
    entities: scene.entities.map((entity) =>
      entity.id === 'u3' ? { ...entity, despawnTick: 100 } : entity,
    ),
    tracks: [
      ...scene.tracks,
      {
        id: 'tr-u2-opacity',
        targetId: 'u2',
        property: 'opacity',
        keyframes: [
          { tick: 0, value: 1, easing: 'linear' },
          { tick: 60, value: 0.2, easing: 'linear' },
        ],
      },
      {
        id: 'tr-u3-rotation',
        targetId: 'u3',
        property: 'rotation',
        keyframes: [
          { tick: 0, value: 0, easing: 'linear' },
          { tick: 40, value: 90, easing: 'linear' },
        ],
      },
    ],
    triggers: [...scene.triggers, { id: 'tdone', when: { after: 'tr-u1.done' } }],
  });

  it('مفاتيح الشفافية والدوران تُطبَّق على الحالة', () => {
    const at30 = entityStatesAt(withExtraTracks, 30);
    expect(at30.find((state) => state.id === 'u2')?.opacity).toBeCloseTo(0.6, 6);
    expect(at30.find((state) => state.id === 'u3')?.rotation).toBeCloseTo(67.5, 6);
  });

  it('despawnTick يُخفي الكيان من ذلك الـ tick', () => {
    expect(entityStatesAt(withExtraTracks, 99).map((state) => state.id)).toContain('u3');
    expect(entityStatesAt(withExtraTracks, 100).map((state) => state.id)).not.toContain('u3');
  });

  it('المشغّل بعد done لمسار يأخذ tick نهاية المسار', () => {
    const schedule = scheduleTriggers(withExtraTracks);
    expect(schedule.ticks.get('tdone')).toBe(120);
  });

  it('تناقض أنواع المفاتيح يُرفض برسالة صريحة', () => {
    expect(() =>
      sampleKeyframes(
        [
          { tick: 0, value: 1, easing: 'linear' },
          { tick: 10, value: { lon: 1, lat: 2 }, easing: 'linear' },
        ],
        5,
      ),
    ).toThrow(/غير متوافق/);
  });
});

describe('محاكاة المشهد الصغير (S3.5، S3.7)', () => {
  it('حدث arrived يقع عند tick 120 بالضبط', () => {
    const result = simulate(scene);
    expect(hasArrivalAt(result, 'u1', 120)).toBe(true);
    expect(result.events.filter((event) => event.kind === 'arrived')).toHaveLength(1);
  });

  it('المشغّلات المشروطة بالوصول تقع بعده في الجدول نفسه', () => {
    const result = simulate(scene);
    const triggers = result.events.filter((event) => event.kind === 'trigger');
    expect(triggers.map((event) => event.id)).toEqual(['t0', 't1', 't2', 't3']);
    expect(triggers[0]).toEqual({ tick: 60, kind: 'trigger', id: 't0' });
    expect(triggers.slice(1).every((event) => event.tick === 120)).toBe(true);
  });

  it('الكيانات في المنتصف تتحرك على المسار، والعلامة تظهر عند الوصول', () => {
    const atStart = entityStatesAt(scene, 0);
    expect(atStart.map((state) => state.id)).toEqual(['u1', 'u2', 'u3']);

    const half = entityStatesAt(scene, 60).find((state) => state.id === 'u1');
    expect(half?.position.lon).toBeGreaterThan(46.6753);
    expect(half?.position.lon).toBeLessThan(50.1033);

    const before = entityStatesAt(scene, 119).map((state) => state.id);
    expect(before).not.toContain('m1');
    const after = entityStatesAt(scene, 120).find((state) => state.id === 'm1');
    expect(after).toBeDefined();
    expect(after?.position.lon).toBeCloseTo(50.1033, 6);
  });

  it('البصمة حتمية: نفس المشهد في كل تشغيل', async () => {
    const first = await sha256Hex(canonicalize(simulate(scene).events as unknown));
    const second = await sha256Hex(canonicalize(simulate(scene).events as unknown));
    expect(second).toBe(first);
    // بصمة مثبتة: أي تغيير في ترتيب الأحداث أو توقيتاتها يجب أن يوقف الاختبار.
    expect(first).toBe('b9a7f30566a8cb334b89afea18158dce0eb65ec8227218098763c6d4a987a29f');
  });

  it('الملف الملتزم يطابق بصمة manifest', async () => {
    const manifest = JSON.parse(
      readFileSync(path.resolve(process.cwd(), 'content/scenes/manifest.json'), 'utf8'),
    ) as {
      files: { file: string; sha256: string; entities: number; tracks: number; triggers: number }[];
    };
    const entry = manifest.files[0];
    expect(entry).toBeDefined();
    const text = readFileSync(SCENE, 'utf8');
    expect(await sha256Hex(text)).toBe(entry?.sha256);
    expect(entry?.entities).toBe(scene.entities.length);
    expect(entry?.tracks).toBe(scene.tracks.length);
    expect(entry?.triggers).toBe(scene.triggers.length);
  });

  it('المشروع المولّد صالح عبر المخطط الكامل', () => {
    const parsed: Project = ProjectSchema.parse(rawScene);
    expect(parsed.id).toBe('scene.small');
    expect(parsed.durationTicks).toBe(180);
  });
});
