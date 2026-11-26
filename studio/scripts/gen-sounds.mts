#!/usr/bin/env node
/**
 * يولّد كتالوج صوت المشروع حتمياً (S4.3): موجات مُصنَّعة رياضياً، بلا موارد خارجية.
 * كل ملف WAV بمعدل 48000 هرتز، قناة واحدة، 16-بت، وبصمة SHA-256 في manifest.
 */
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_DIR = path.join(ROOT, 'content/sounds');
const SAMPLE_RATE = 48_000;

interface ClipSpec {
  id: string;
  file: string;
  kind: 'effect' | 'ambience';
  gain: number;
  label: string;
  seconds: number;
  render: (t: number, index: number) => number;
}

/** ضجيج حتمي بسيط: مولد خطي تكعيبي ثابت البذرة (لا Math.random في البناء). */
function noise(seed: number): (index: number) => number {
  return (index: number) => {
    let state = (seed + index * 1_103_515_245) >>> 0;
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return (state / 0x8000_0000 - 1) * 0.5;
  };
}

const decay = (t: number, seconds: number, power = 4): number =>
  Math.exp(-power * 3 * (t / seconds));

const CLIPS: ClipSpec[] = [
  {
    id: 'sound.click',
    file: 'click.wav',
    kind: 'effect',
    gain: 0.5,
    label: 'نقرة قصيرة',
    seconds: 0.05,
    render: (t, index) =>
      Math.sin(2 * Math.PI * 1200 * t) * decay(t, 0.05, 6) + noise(7)(index) * 0.05,
  },
  {
    id: 'sound.chime',
    file: 'chime.wav',
    kind: 'effect',
    gain: 0.6,
    label: 'جرس مزدوج',
    seconds: 0.45,
    render: (t) =>
      (Math.sin(2 * Math.PI * 880 * t) * 0.6 + Math.sin(2 * Math.PI * 1320 * t) * 0.3) *
      decay(t, 0.45, 3),
  },
  {
    id: 'sound.boom',
    file: 'boom.wav',
    kind: 'effect',
    gain: 0.7,
    label: 'انفجار منخفض',
    seconds: 0.7,
    render: (t, index) =>
      (Math.sin(2 * Math.PI * 70 * t) * 0.7 + noise(31)(index) * 0.25) * decay(t, 0.7, 2.5),
  },
  {
    id: 'sound.arrive',
    file: 'arrive.wav',
    kind: 'effect',
    gain: 0.55,
    label: 'وصول',
    seconds: 0.3,
    render: (t, index) =>
      Math.sin(2 * Math.PI * (520 + (900 * t) / 0.3) * t) *
        Math.sin(Math.PI * Math.min(1, t / 0.3)) ** 0.6 +
      noise(53)(index) * 0.02,
  },
];

function encodeWav(samples: Float32Array): Buffer {
  const dataBytes = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataBytes, 40);
  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index] ?? 0));
    buffer.writeInt16LE(Math.round(clamped * 32_767), 44 + index * 2);
  }
  return buffer;
}

await mkdir(OUT_DIR, { recursive: true });

const files = [];
for (const clip of CLIPS) {
  const count = Math.round(clip.seconds * SAMPLE_RATE);
  const samples = new Float32Array(count);
  let peak = 0;
  for (let index = 0; index < count; index += 1) {
    const value = clip.render(index / SAMPLE_RATE, index) * clip.gain;
    samples[index] = Math.max(-1, Math.min(1, value));
    peak = Math.max(peak, Math.abs(samples[index] ?? 0));
  }
  // تطبيع إلى 0.85 كي تبقى المقارنات بين الأصوات عادلة والذروة معروفة.
  const scale = peak > 0 ? 0.85 / peak : 1;
  for (let index = 0; index < count; index += 1) {
    samples[index] = Math.max(-1, Math.min(1, (samples[index] ?? 0) * scale));
  }

  const buffer = encodeWav(samples);
  await writeFile(path.join(OUT_DIR, clip.file), buffer);
  files.push({
    id: clip.id,
    file: clip.file,
    label: clip.label,
    kind: clip.kind,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    bytes: buffer.byteLength,
    sampleRate: SAMPLE_RATE,
    channels: 1,
    bitsPerSample: 16,
    durationSamples: count,
    durationSeconds: Number((count / SAMPLE_RATE).toFixed(6)),
    defaultGain: clip.gain,
    licence: 'أصل أصلي داخل المشروع (CC0) — موجة مُصنَّعة رياضياً',
  });
}

await writeFile(
  path.join(OUT_DIR, 'manifest.json'),
  `${JSON.stringify({ format: 'studio.sounds/1', masterGain: 0.9, files }, null, 2)}\n`,
  'utf8',
);

await writeFile(
  path.join(OUT_DIR, 'LICENSES.md'),
  `# تراخيص أصوات المشروع\n\nكل ملف في هذا المجلد مُصنَّع داخل المشروع بسكربت \`scripts/gen-sounds.mts\` (موجات جيبية وضجيج بمولّد ثابت البذرة)، ولا يستخدم أي مادة خارجية.\n\n| الملف | المصدر | الترخيص |\n| --- | --- | --- |\n${files
    .map((file) => `| \`${file.file}\` | توليد رياضي داخل السكربت | CC0 (أصل أصلي) |`)
    .join('\n')}\n`,
  'utf8',
);

console.log(`✓ ${files.length} ملفات صوتية في content/sounds`);
for (const file of files) {
  console.log(
    `  - ${file.file}: ${file.durationSamples} عينة، ${file.bytes} بايت، ${file.sha256.slice(0, 12)}…`,
  );
}
process.exit(0);
