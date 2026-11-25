import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ProjectSchema, findAfterCycles, validateProject } from '@/core/model';

const raw = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'fixtures/bench.project.json'), 'utf8'),
) as Record<string, unknown>;

const bench = () => structuredClone(raw);

describe('النموذج والتحقق (S1.1)', () => {
  it('المشروع المرجعي صالح', () => {
    const result = ProjectSchema.safeParse(bench());
    expect(result.success).toBe(true);
  });

  it('يرفض معرّفات مكررة', () => {
    const project = bench();
    const entities = project['entities'] as Record<string, unknown>[];
    entities.push({ ...entities[0] });
    expect(ProjectSchema.safeParse(project).success).toBe(false);
  });

  it('يرفض زمناً خارج المدة', () => {
    const project = bench();
    const effects = project['effects'] as Record<string, unknown>[];
    effects[0] = { ...effects[0], at: { tick: 99999 } };
    const result = ProjectSchema.safeParse(project);
    expect(result.success).toBe(false);
  });

  it('يرفض إشارة مسار إلى كيان غير موجود', () => {
    const project = bench();
    const tracks = project['tracks'] as Record<string, unknown>[];
    tracks[0] = { ...tracks[0], targetId: 'ghost' };
    expect(ProjectSchema.safeParse(project).success).toBe(false);
  });

  it('يرفض مساراً بلا keyframes ولا path أو بهما معاً', () => {
    const project = bench();
    const tracks = project['tracks'] as Record<string, unknown>[];
    const track = tracks[0] as Record<string, unknown>;
    tracks[0] = { ...track, path: undefined, keyframes: undefined };
    expect(ProjectSchema.safeParse(project).success).toBe(false);
  });

  it('يرفض زوماً خارج 0.25..4 في الكاميرا', () => {
    const project = bench();
    const camera = project['camera'] as Record<string, unknown>[];
    camera[0] = { ...camera[0], zoom: 8 };
    expect(ProjectSchema.safeParse(project).success).toBe(false);
  });

  it('يرفض حقولاً مجهولة (strict)', () => {
    const project = bench();
    (project['entities'] as Record<string, unknown>[])[0] = {
      ...(project['entities'] as Record<string, unknown>[])[0],
      sneaky: true,
    };
    expect(ProjectSchema.safeParse(project).success).toBe(false);
  });

  it('يعطي رسائل قابلة للقراءة عبر validateProject', () => {
    const project = bench();
    (project['entities'] as Record<string, unknown>[])[0] = { id: 'x' };
    const result = validateProject(project);
    expect(result.ok).toBe(false);
    expect(result.messages.length).toBeGreaterThan(0);
    expect(result.messages[0]?.path).toContain('entities');
  });

  it('كاشف الدورات يعمل على رسم اصطناعي', () => {
    expect(findAfterCycles([{ id: 'a', when: { tick: 1 } }])).toEqual([]);
    const cyclic = [
      { id: 'A', when: { after: 'B.done' } },
      { id: 'B', when: { after: 'A.done' } },
    ];
    expect(findAfterCycles(cyclic).length).toBeGreaterThan(0);
  });
});

describe('تفاصيل المخططات', () => {
  const baseTrack = {
    id: 'trk1',
    targetId: 'u01',
    property: 'position' as const,
    keyframes: [
      { tick: 0, value: { lon: 1, lat: 1 }, easing: 'linear' as const },
      { tick: 60, value: { lon: 2, lat: 2 }, easing: 'easeIn' as const },
    ],
  };

  it('يقبل keyframes لخاصية position بقيم مواضع', async () => {
    const { TrackSchema } = await import('@/core/model/track');
    expect(TrackSchema.safeParse(baseTrack).success).toBe(true);
  });

  it('يقبل keyframes رقمية لخاصية scale', async () => {
    const { TrackSchema } = await import('@/core/model/track');
    const track = {
      ...baseTrack,
      property: 'scale' as const,
      keyframes: [
        { tick: 0, value: 1, easing: 'linear' as const },
        { tick: 30, value: 2, easing: 'linear' as const },
      ],
    };
    expect(TrackSchema.safeParse(track).success).toBe(true);
  });

  it('يرفض قيمة غير مطابقة للخاصية', async () => {
    const { TrackSchema } = await import('@/core/model/track');
    const track = { ...baseTrack, property: 'scale' as const };
    expect(TrackSchema.safeParse(track).success).toBe(false);
  });

  it('يرفض مفاتيح غير متزايدة زمنياً', async () => {
    const { TrackSchema } = await import('@/core/model/track');
    const track = {
      ...baseTrack,
      keyframes: [
        { tick: 60, value: { lon: 1, lat: 1 }, easing: 'linear' as const },
        { tick: 60, value: { lon: 2, lat: 2 }, easing: 'linear' as const },
      ],
    };
    expect(TrackSchema.safeParse(track).success).toBe(false);
  });

  it('يرفض path لخاصية غير position أو بزمن مقلوب', async () => {
    const { TrackSchema } = await import('@/core/model/track');
    const path = {
      points: [
        { lon: 1, lat: 1 },
        { lon: 2, lat: 2 },
      ],
      startTick: 120,
      endTick: 60,
      easing: 'linear' as const,
    };
    expect(
      TrackSchema.safeParse({ id: 't', targetId: 'u01', property: 'position', path }).success,
    ).toBe(false);
    expect(
      TrackSchema.safeParse({
        id: 't',
        targetId: 'u01',
        property: 'opacity',
        path: { ...path, endTick: 240 },
      }).success,
    ).toBe(false);
  });

  it('whenTick وwhenAfter يقرآن الشكلين', async () => {
    const { whenAfter, whenTick } = await import('@/core/model/primitives');
    expect(whenTick({ tick: 12 })).toBe(12);
    expect(whenTick({ after: 'u1.arrived' })).toBeNull();
    expect(whenAfter({ tick: 12 })).toBeNull();
    expect(whenAfter({ after: 'u1.arrived' })).toBe('u1.arrived');
  });

  it('semanticIssues فارغة للمشروع المرجعي', async () => {
    const { migrate } = await import('@/core/model/migrations');
    const { semanticIssues } = await import('@/core/model/validate');
    expect(semanticIssues(migrate(bench()))).toEqual([]);
  });

  it('يرفض مدة غير موجبة أو بذرة سالبة', () => {
    expect(ProjectSchema.safeParse({ ...bench(), durationTicks: 0 }).success).toBe(false);
    expect(ProjectSchema.safeParse({ ...bench(), seed: -1 }).success).toBe(false);
  });
});
