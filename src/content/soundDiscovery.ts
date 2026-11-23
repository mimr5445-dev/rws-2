// اكتشاف الأصوات من أسماء الملفات، بلا أي استيراد من Vite أو Node، ليبقى قابلاً للاختبار.
//
// القواعد:
// - اسم الحدث = اسم الملف بدون الامتداد وبدون اللاحقة الرقمية (`_01`، `_02`...). المجلدات للتنظيم فقط.
// - الملفات المتعددة بنفس الاسم الأساسي تكوّن أصواتاً متعددة للحدث نفسه (يُختار واحد عشوائياً).
// - الملفات الفارغة (0 بايت) تُتجاهل بصمت.
// - المدخلات الصريحة في manifest.json تأخذ الأولوية (مستوى الصوت، والمولّد الاحتياطي).

import { SoundManifest, SoundManifestEntry } from './schema';
import { LoadedSounds } from './soundResolver';

const AUDIO_EXT_RE = /\.(ogg|mp3|wav)$/i;

export function eventNameFromFile(relPath: string): string {
  const base = relPath.split('/').pop() ?? relPath;
  return base.replace(AUDIO_EXT_RE, '').replace(/_\d+$/, '');
}

// Vite يضمّن الملفات الصغيرة (أقل من 4 كيلوبايت) كـ data URL. الملف الفارغ يصبح data URL بلا محتوى.
export function isEmptyAssetUrl(url: string): boolean {
  return /^data:[^,]*;base64,$/.test(url);
}

export function discoverSoundEvents(
  files: string[],
  emptyFiles: Set<string>,
  manifest: SoundManifest | null,
  manifestPath = 'content/sounds/manifest.json'
): LoadedSounds {
  const explicit: SoundManifest = manifest ? { ...manifest } : {};
  const explicitFiles = new Set<string>();
  for (const entry of Object.values(explicit)) {
    for (const f of entry.files) explicitFiles.add(f);
  }

  // 1) الملفات غير المذكورة صراحةً: تُجمَّع حسب اسم الحدث.
  const grouped = new Map<string, string[]>();
  for (const file of files) {
    if (emptyFiles.has(file) || explicitFiles.has(file)) continue;
    const name = eventNameFromFile(file);
    if (!name) continue;
    const list = grouped.get(name) ?? [];
    list.push(file);
    grouped.set(name, list);
  }

  const merged: SoundManifest = {};
  for (const [name, list] of grouped) {
    merged[name] = { files: [...list].sort() };
  }
  // 2) المدخلات الصريحة تكمل أو تتجاوز المكتشفة، مع تصفية الملفات الفارغة منها.
  for (const [name, entry] of Object.entries(explicit)) {
    const kept = entry.files.filter((f) => !emptyFiles.has(f));
    const base: SoundManifestEntry = merged[name] ?? { files: [] };
    merged[name] = {
      ...base,
      ...entry,
      files: kept.length > 0 ? kept : base.files.filter((f) => !emptyFiles.has(f))
    };
  }

  const resolvedFiles: Record<string, string[]> = {};
  for (const [name, entry] of Object.entries(merged)) {
    resolvedFiles[name] = entry.files.filter((f) => files.includes(f) && !emptyFiles.has(f));
  }

  return { manifestPath, manifest: merged, resolvedFiles };
}
