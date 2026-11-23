// محمّل الأصوات للمتصفح: يضمّن ملفات الأصوات وقت البناء عبر Vite، ويكتشف الأحداث من أسماء الملفات.
// لا يستورد node:fs، ولا يُستدعى من الاختبارات (يعتمد على import.meta.glob).
import { LoadedSounds } from './soundResolver';
import { SoundManifest, validateSoundManifest } from './schema';
import { discoverSoundEvents, isEmptyAssetUrl } from './soundDiscovery';

const SOUNDS_PREFIX = '../../content/sounds/';

const manifestModules = import.meta.glob('../../content/sounds/manifest.json', {
  eager: true,
  import: 'default'
}) as Record<string, unknown>;

const audioUrlModules = import.meta.glob('../../content/sounds/**/*.{ogg,mp3,wav}', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>;

export interface BundledSoundBank {
  sounds: LoadedSounds | null;
  errors: string[];
  urlFor(relativeFile: string): string | null;
}

let cached: BundledSoundBank | null = null;

export function getBundledSoundBank(): BundledSoundBank {
  if (cached) return cached;

  const errors: string[] = [];
  const manifestKey = `${SOUNDS_PREFIX}manifest.json`;

  const urlFor = (relativeFile: string): string | null => {
    const url = audioUrlModules[`${SOUNDS_PREFIX}${relativeFile}`];
    if (typeof url !== 'string' || isEmptyAssetUrl(url)) return null;
    return url;
  };

  // الملفات الموجودة فعلاً (مع استبعاد الفارغة)، والفارغة تُسجَّل للتجاهل الصامت.
  const files: string[] = [];
  const emptyFiles = new Set<string>();
  for (const [key, url] of Object.entries(audioUrlModules)) {
    const rel = key.startsWith(SOUNDS_PREFIX) ? key.slice(SOUNDS_PREFIX.length) : key;
    files.push(rel);
    if (typeof url === 'string' && isEmptyAssetUrl(url)) emptyFiles.add(rel);
  }

  let manifest: SoundManifest | null = null;
  const rawManifest = manifestModules[manifestKey];
  if (rawManifest !== undefined) {
    const validated = validateSoundManifest(rawManifest, manifestKey);
    if (validated.valid && validated.value) {
      manifest = validated.value;
    } else {
      for (const e of validated.errors) errors.push(`${e.code}: ${e.message}`);
    }
  }

  const sounds = discoverSoundEvents(files, emptyFiles, manifest, manifestKey);
  for (const [name, list] of Object.entries(sounds.resolvedFiles)) {
    if (list.length === 0) errors.push(`NO_PLAYABLE_FILE: ${name}`);
  }

  cached = { sounds, errors, urlFor };
  return cached;
}
