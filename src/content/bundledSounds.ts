// محمّل الأصوات للمتصفح: يضمّن مانيفست الأصوات وملفاتها وقت البناء عبر Vite.
// لا يستورد node:fs، ولا يُستدعى من الاختبارات (يعتمد على import.meta.glob).
import { LoadedSounds } from './soundResolver';
import { SoundManifest, validateSoundManifest } from './schema';

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
  const raw = manifestModules[manifestKey];

  const urlFor = (relativeFile: string): string | null => {
    const url = audioUrlModules[`${SOUNDS_PREFIX}${relativeFile}`];
    return typeof url === 'string' ? url : null;
  };

  if (raw === undefined) {
    cached = { sounds: null, errors, urlFor };
    return cached;
  }

  const validated = validateSoundManifest(raw, manifestKey);
  if (!validated.valid || !validated.value) {
    for (const e of validated.errors) errors.push(`${e.code}: ${e.message}`);
    cached = { sounds: null, errors, urlFor };
    return cached;
  }

  const manifest: SoundManifest = validated.value;
  const resolvedFiles: Record<string, string[]> = {};
  for (const [eventName, entry] of Object.entries(manifest)) {
    const available: string[] = [];
    for (const file of entry.files) {
      if (urlFor(file)) available.push(file);
      else errors.push(`MISSING_FILE: ${eventName} -> ${file}`);
    }
    resolvedFiles[eventName] = available;
  }

  cached = {
    sounds: { manifestPath: manifestKey, manifest, resolvedFiles },
    errors,
    urlFor
  };
  return cached;
}
