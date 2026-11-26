import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AUDIO_SAMPLE_RATE,
  SAMPLES_PER_TICK,
  buildSchedule,
  createCatalog,
  decodeWav,
  encodeWav,
  framesForTicks,
  interleaveChannels,
  mixOffline,
  panFromLon,
  panGains,
  sampleToSeconds,
  sampleToTick,
  tickToSample,
  type SoundManifest,
} from '@/core/audio';
import { AudioPreview, planFrom } from '@/core/audio/preview';
import { ProjectSchema } from '@/core/model/project';
import { TICK_RATE } from '@/core/time';

const ROOT = process.cwd();
const manifest = JSON.parse(
  readFileSync(path.join(ROOT, 'content/sounds/manifest.json'), 'utf8'),
) as SoundManifest;

function loadSamples(): Map<string, Float32Array> {
  const samples = new Map<string, Float32Array>();
  for (const clip of manifest.files) {
    const bytes = readFileSync(path.join(ROOT, 'content/sounds', clip.file));
    samples.set(clip.id, decodeWav(bytes).samples);
  }
  return samples;
}

const samples = loadSamples();
const catalog = createCatalog(manifest, samples);

const sceneProject = ProjectSchema.parse(
  JSON.parse(readFileSync(path.join(ROOT, 'content/scenes/small-scene.project.json'), 'utf8')),
);

describe('تحويل tick ↔ عينة (S4.6)', () => {
  it('كل tick = 800 عينة بالضبط، بلا كسور', () => {
    expect(SAMPLES_PER_TICK).toBe(800);
    expect(tickToSample(0)).toBe(0);
    expect(tickToSample(1)).toBe(800);
    expect(tickToSample(60)).toBe(48_000);
    expect(tickToSample(120)).toBe(96_000);
    expect(sampleToSeconds(tickToSample(120))).toBe(2);
    expect(sampleToTick(96_000)).toBe(120);
  });

  it('أي tick صحيح يُعطي عينة صحيحة (لا تقريب كسري على مدى المشروع)', () => {
    for (let tick = 0; tick <= 3_600; tick += 7) {
      const sample = tickToSample(tick);
      expect(Number.isInteger(sample)).toBe(true);
      expect(sample).toBe(tick * SAMPLES_PER_TICK);
      expect(sampleToTick(sample)).toBe(tick);
    }
  });

  it('مدة المشروع بعدد العينات نفسه', () => {
    expect(framesForTicks(180)).toBe(144_000);
    expect(framesForTicks(180) / AUDIO_SAMPLE_RATE).toBe(3);
    expect(TICK_RATE).toBe(60);
  });
});

describe('كتالوج الأصوات (S4.3)', () => {
  it('كل ملف يُفكّ بترويسة صحيحة ومدة مطابقة للمنيفست', () => {
    for (const clip of manifest.files) {
      const wav = decodeWav(readFileSync(path.join(ROOT, 'content/sounds', clip.file)));
      expect(wav.sampleRate, clip.file).toBe(AUDIO_SAMPLE_RATE);
      expect(wav.channels, clip.file).toBe(1);
      expect(wav.bitsPerSample, clip.file).toBe(16);
      expect(wav.frameCount, clip.file).toBe(clip.durationSamples);
      expect(wav.frameCount / wav.sampleRate, clip.file).toBeCloseTo(clip.durationSeconds, 5);
      const peak = wav.samples.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
      expect(peak, clip.file).toBeGreaterThan(0.5);
      expect(peak, clip.file).toBeLessThanOrEqual(1);
    }
  });

  it('الكتالوج يعيد بيانات الملفات والعينات معاً', () => {
    expect(catalog.clips.size).toBe(manifest.files.length);
    expect(catalog.samples.size).toBe(manifest.files.length);
    expect(catalog.masterGain).toBeGreaterThan(0);
    expect(catalog.samples.get('sound.arrive')?.length).toBe(
      catalog.clips.get('sound.arrive')?.durationSamples,
    );
  });

  it('الترميز والفك يعيدان الإشارة ضمن خطأ تكميم واحد', () => {
    const original = new Float32Array([0, 0.5, -0.5, 0.25, -1, 1]);
    const decoded = decodeWav(encodeWav(original, 48_000, 1));
    expect(decoded.frameCount).toBe(original.length);
    for (let index = 0; index < original.length; index += 1) {
      expect(decoded.samples[index]).toBeCloseTo(original[index]!, 3);
    }
  });

  it('ملف تالف يُرفض برسالة صريحة', () => {
    expect(() => decodeWav(new Uint8Array([0, 1, 2]))).toThrow(/أقصر/);
    const bad = encodeWav(new Float32Array([0.1, 0.2]), 48_000, 1);
    bad[8] = 0x58; // WAVE ← XAVE
    expect(() => decodeWav(bad)).toThrow(/ليس WAV/);
  });
});

describe('مولّد الجدول النقي (S4.2)', () => {
  it('يعطي نفس الجدول في كل تشغيل، مرتباً بالـ tick ثم المعرّف', () => {
    const first = buildSchedule(sceneProject);
    const second = buildSchedule(sceneProject);
    expect(second).toEqual(first);
    expect(first.map((sound) => sound.id)).toEqual(['c2', 'c1', 'e1']);
    expect(first.map((sound) => sound.tick)).toEqual([60, 120, 130]);
    expect(first.map((sound) => sound.sample)).toEqual([48_000, 96_000, 104_000]);
  });

  it('audio الوصول يُحسب من جدول الأحداث لا من حالة العرض', () => {
    const schedule = buildSchedule(sceneProject);
    const arrivalCue = schedule.find((sound) => sound.id === 'c1');
    expect(arrivalCue?.tick).toBe(120);
    expect(arrivalCue?.origin).toBe('cue');
    expect(arrivalCue?.channel).toBe('a');
  });

  it('تغيير cue واحد يغيّر عنصراً واحداً فقط', () => {
    const before = buildSchedule(sceneProject);
    const changed = buildSchedule({
      ...sceneProject,
      cues: sceneProject.cues.map((cue) => (cue.id === 'c2' ? { ...cue, gain: 0.9 } : cue)),
    });
    expect(changed).toHaveLength(before.length);
    const diffs = before
      .map((sound, index) => ({ sound, other: changed[index] }))
      .filter(({ sound, other }) => JSON.stringify(sound) !== JSON.stringify(other));
    expect(diffs).toHaveLength(1);
    expect(diffs[0]?.other?.id).toBe('c2');
    expect(diffs[0]?.other?.gain).toBe(0.9);
  });

  it('يحل مرجع نهاية المسار والمشغّل، ويستبعد المرجع المجهول', () => {
    const project = {
      ...sceneProject,
      cues: [
        { id: 'cEnd', when: { after: 'tr-u1.end' }, clipId: 'sound.click', gain: 0.5, pan: 0 },
        {
          id: 'cKey',
          when: { after: 'tr-m1-scale.end' },
          clipId: 'sound.click',
          gain: 0.5,
          pan: 0,
        },
        { id: 'cTrig', when: { after: 't1.fired' }, clipId: 'sound.click', gain: 0.5, pan: 0 },
        { id: 'cGhost', when: { after: 'ghost.end' }, clipId: 'sound.click', gain: 0.5, pan: 0 },
        { id: 'cLate', when: { tick: 9_999 }, clipId: 'sound.click', gain: 0.5, pan: 0 },
      ],
    } as typeof sceneProject;
    const schedule = buildSchedule(project);
    expect(schedule.map((sound) => sound.id)).toEqual(['cEnd', 'cTrig', 'e1', 'cKey']);
    expect(schedule.map((sound) => sound.tick)).toEqual([120, 120, 130, 180]);
  });

  it('صوت المؤثر يأتي من حقل المؤثر ويُوزع بحسب موقعه', () => {
    const effectSound = buildSchedule(sceneProject).find((sound) => sound.id === 'e1');
    expect(effectSound?.clipId).toBe('sound.boom');
    expect(effectSound?.origin).toBe('effect');
    expect(effectSound?.channel).toBe('b');
    expect(effectSound?.pan).toBeCloseTo(panFromLon(50.1033), 6);
  });
});

describe('جدولة المعاينة (S4.4)', () => {
  const schedule = buildSchedule(sceneProject);

  class FakeSink {
    starts: { clipId: string; when: number; gain: number; pan: number }[] = [];
    stops = 0;
    start(clipId: string, when: number, gain: number, pan: number) {
      this.starts.push({ clipId, when, gain, pan });
    }
    stopAll() {
      this.stops += 1;
      this.starts = [];
    }
  }

  it('الوقت المطلق = ساعة الصوت + الفارق بالتكات', () => {
    const sink = new FakeSink();
    const preview = new AudioPreview({ currentTime: 10 }, sink);
    const plan = preview.play(schedule, 90);
    expect(plan.map((item) => item.id)).toEqual(['c1', 'e1']);
    expect(sink.starts.map((item) => item.when)).toEqual([10.5, 10 + 40 / 60]);
    expect(sink.starts.map((item) => item.clipId)).toEqual(['sound.arrive', 'sound.boom']);
  });

  it('seek يوقف كل شيء أولاً ثم يجدول من جديد بلا تراكم', () => {
    const sink = new FakeSink();
    const preview = new AudioPreview({ currentTime: 20 }, sink);
    preview.play(schedule, 0);
    expect(sink.starts).toHaveLength(3);
    const replanned = preview.seek(schedule, 100);
    expect(sink.stops).toBe(2);
    // من tick 100 يبقى cue الوصول (120) والمؤثر (130).
    expect(replanned.map((item) => item.id)).toEqual(['c1', 'e1']);
    expect(replanned[0]?.when).toBeCloseTo(20 + 20 / 60, 9);
    expect(replanned[1]?.when).toBeCloseTo(20.5, 9);
    expect(preview.planned).toHaveLength(2);
  });

  it('لا يجدول صوتاً مضى، ولا يخترع تأخيراً سالباً', () => {
    const plan = planFrom(schedule, 121, { currentTime: 0 });
    expect(plan.map((item) => item.id)).toEqual(['e1']);
    expect(plan.every((item) => item.delay >= 0)).toBe(true);
  });

  it('stop يُفرغ الخطة ويوقف المصادر', () => {
    const sink = new FakeSink();
    const preview = new AudioPreview({ currentTime: 0 }, sink);
    preview.play(schedule, 0);
    preview.stop();
    expect(preview.isPlaying).toBe(false);
    expect(preview.planned).toHaveLength(0);
    expect(sink.stops).toBe(2);
  });
});

describe('المزج دون اتصال (S4.5، S4.6)', () => {
  const template = samples.get('sound.click')!;

  function correlationOffset(
    mixed: Float32Array,
    clip: Float32Array,
    around: number,
    radius = 600,
  ): number {
    let bestOffset = around;
    let bestScore = -Infinity;
    for (let offset = around - radius; offset <= around + radius; offset += 1) {
      let score = 0;
      for (let index = 0; index < clip.length; index += 1) {
        score += (mixed[offset + index] ?? 0) * (clip[index] ?? 0);
      }
      if (score > bestScore) {
        bestScore = score;
        bestOffset = offset;
      }
    }
    return bestOffset;
  }

  it('ذروة cue تقع ضمن عينة واحدة من الموضع النظري', () => {
    const schedule = buildSchedule(sceneProject);
    const mix = mixOffline({
      durationTicks: sceneProject.durationTicks,
      sounds: schedule,
      samples,
    });
    const expected = tickToSample(60);
    const offset = correlationOffset(mix.left, template, expected);
    expect(Math.abs(offset - expected)).toBeLessThanOrEqual(1);
    expect(mix.missingClips).toEqual([]);
  });

  it('مدة المزج تساوي مدة المشروع بالعينات نفسها', () => {
    const mix = mixOffline({
      durationTicks: sceneProject.durationTicks,
      sounds: buildSchedule(sceneProject),
      samples,
    });
    expect(mix.frameCount).toBe(framesForTicks(sceneProject.durationTicks));
    expect(mix.frameCount).toBe(144_000);
    expect(mix.left).toHaveLength(144_000);
    expect(mix.right).toHaveLength(144_000);
    expect(mix.peak).toBeGreaterThan(0);
    expect(mix.peak).toBeLessThanOrEqual(1);
  });

  it('مشروع بلا أصوات يعطي صمتاً تاماً بالمدة الصحيحة', () => {
    const mix = mixOffline({ durationTicks: 60, sounds: [], samples });
    expect(mix.frameCount).toBe(48_000);
    expect(mix.peak).toBe(0);
  });

  it('التوزيع متساوي القدرة: اليسار الكامل لا يتسرب يميناً', () => {
    expect(panGains(-1).right).toBeCloseTo(0, 6);
    expect(panGains(1).left).toBeCloseTo(0, 6);
    expect(panGains(0).left).toBeCloseTo(panGains(0).right, 12);
    expect(panGains(0).left).toBeCloseTo(Math.SQRT1_2, 6);
  });

  it('مقطع ناقص يُبلَّغ عنه ولا يُسقط بقية الأصوات', () => {
    const schedule = buildSchedule(sceneProject);
    const mix = mixOffline({
      durationTicks: sceneProject.durationTicks,
      sounds: schedule,
      samples: new Map([...samples].filter(([id]) => id !== 'sound.boom')),
    });
    expect(mix.missingClips).toEqual(['sound.boom']);
    expect(mix.peak).toBeGreaterThan(0);
  });

  it('التشابك يعطي قناتين متداخلتين', () => {
    const left = new Float32Array([0.1, 0.2]);
    const right = new Float32Array([-0.1, -0.2]);
    expect([...interleaveChannels(left, right)]).toEqual([
      expect.closeTo(0.1, 6),
      expect.closeTo(-0.1, 6),
      expect.closeTo(0.2, 6),
      expect.closeTo(-0.2, 6),
    ]);
  });
});
