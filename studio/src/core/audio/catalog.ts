/**
 * كتالوج الأصوات: بيانات وصفية + عينات مُفكَّكة (S4.3).
 * التحقق من البصمة يقع في طبقة التحميل (content) قبل بناء الكتالوج.
 */
export type SoundKind = 'effect' | 'ambience';

export interface SoundClipMeta {
  readonly id: string;
  readonly file: string;
  readonly label: string;
  readonly kind: SoundKind;
  readonly sha256: string;
  readonly bytes: number;
  readonly sampleRate: number;
  readonly channels: number;
  readonly durationSamples: number;
  readonly durationSeconds: number;
  readonly defaultGain: number;
  readonly licence: string;
}

export interface SoundManifest {
  readonly format: string;
  readonly masterGain: number;
  readonly files: readonly SoundClipMeta[];
}

export interface SoundCatalog {
  readonly sampleRate: number;
  readonly masterGain: number;
  readonly clips: ReadonlyMap<string, SoundClipMeta>;
  readonly samples: ReadonlyMap<string, Float32Array>;
}

export class MissingClipError extends Error {
  constructor(clipId: string) {
    super(`مقطع صوتي غير موجود في الكتالوج: ${clipId}`);
    this.name = 'MissingClipError';
  }
}

export function createCatalog(
  manifest: SoundManifest,
  samples: ReadonlyMap<string, Float32Array>,
): SoundCatalog {
  const clips = new Map<string, SoundClipMeta>();
  for (const clip of manifest.files) clips.set(clip.id, clip);
  return {
    sampleRate: manifest.files[0]?.sampleRate ?? 48_000,
    masterGain: manifest.masterGain,
    clips,
    samples,
  };
}

export function requireClip(catalog: SoundCatalog, clipId: string): SoundClipMeta {
  const clip = catalog.clips.get(clipId);
  if (!clip) throw new MissingClipError(clipId);
  return clip;
}
