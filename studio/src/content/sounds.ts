/**
 * تحميل كتالوج الأصوات والتحقق من بصمته قبل الاستخدام (S4.3).
 * يُستورد ديناميكياً من الواجهة كي لا يدخل حزمة الدخول.
 */
import { createCatalog, decodeWav, type SoundCatalog, type SoundManifest } from '@/core/audio';
import { sha256HexOfBytes } from './mapData';

const MANIFEST_URL = '/sounds/manifest.json';
const BASE_URL = '/sounds/';

export class SoundIntegrityError extends Error {
  constructor(
    readonly file: string,
    message: string,
  ) {
    super(`ملف صوت غير صالح (${file}): ${message}`);
    this.name = 'SoundIntegrityError';
  }
}

export async function loadSoundCatalog(baseUrl = ''): Promise<SoundCatalog> {
  const manifestResponse = await fetch(`${baseUrl}${MANIFEST_URL}`);
  if (!manifestResponse.ok) throw new SoundIntegrityError('manifest.json', 'تعذّر التحميل');
  const manifest = (await manifestResponse.json()) as SoundManifest;

  const samples = new Map<string, Float32Array>();
  for (const clip of manifest.files) {
    const response = await fetch(`${baseUrl}${BASE_URL}${clip.file}`);
    if (!response.ok) throw new SoundIntegrityError(clip.file, 'تعذّر التحميل');

    const bytes = new Uint8Array(await response.arrayBuffer());
    const digest = await sha256HexOfBytes(bytes);
    if (digest !== clip.sha256) {
      throw new SoundIntegrityError(clip.file, 'البصمة لا تطابق manifest — الملف تالف أو معدَّل');
    }
    const wav = decodeWav(bytes);
    if (wav.sampleRate !== clip.sampleRate || wav.frameCount !== clip.durationSamples) {
      throw new SoundIntegrityError(clip.file, 'المدة أو معدل العينات لا يطابق manifest');
    }
    samples.set(clip.id, wav.samples);
  }

  return createCatalog(manifest, samples);
}
