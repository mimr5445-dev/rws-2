import fs from 'node:fs';
import path from 'node:path';
import { SoundId } from '../core/types';
import { LoadedSounds, FallbackSynthLike, SoundResolution, resolveSoundEvent } from './soundResolver';

export type { LoadedSounds, FallbackSynthLike, SoundResolution };
export { resolveSoundEvent };
import { sanitizeSvg } from '../packs/packSchema';
import {
  ContentValidationError,
  findDuplicateJsonKeys,
  isSafeRelativeAssetPath,
  MapManifest,
  SoundManifest,
  UnitManifest,
  validateMapManifest,
  validateSoundManifest,
  validateUnitManifest
} from './schema';

export interface LoadedUnit {
  id: string;
  dirPath: string;
  manifestPath: string;
  manifest: UnitManifest;
  assetPath?: string;
  svgContent?: string;
}

export interface LoadedMap {
  id: string;
  dirPath: string;
  manifestPath: string;
  manifest: MapManifest;
  backgroundPath?: string;
  svgContent?: string;
}


export interface LoadedContentBundle {
  rootDir: string;
  units: Record<string, LoadedUnit>;
  maps: Record<string, LoadedMap>;
  sounds: LoadedSounds | null;
  errors: ContentValidationError[];
  ok: boolean;
}


function isWithinDir(parentDir: string, targetPath: string): boolean {
  const rel = path.relative(path.resolve(parentDir), path.resolve(targetPath));
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function readJsonSafe(
  filePath: string
): { ok: true; data: unknown; rawText: string } | { ok: false; error: ContentValidationError } {
  const fileName = path.basename(filePath);
  let rawText: string;
  try {
    rawText = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    return {
      ok: false,
      error: {
        code: 'MISSING_FILE',
        path: filePath,
        file: fileName,
        message: `تعذّر قراءة الملف: ${(err as Error).message}`
      }
    };
  }

  try {
    const data: unknown = JSON.parse(rawText);
    return { ok: true, data, rawText };
  } catch (err) {
    return {
      ok: false,
      error: {
        code: 'INVALID_JSON',
        path: filePath,
        file: fileName,
        message: `صيغة JSON غير صالحة: ${(err as Error).message}`
      }
    };
  }
}

function resolveContainedFile(
  baseDir: string,
  relPath: string,
  manifestPath: string,
  field: string
): { ok: true; fullPath: string } | { ok: false; error: ContentValidationError } {
  const manifestFile = path.basename(manifestPath);
  if (!isSafeRelativeAssetPath(relPath)) {
    return {
      ok: false,
      error: {
        code: 'UNSAFE_PATH',
        path: manifestPath,
        file: manifestFile,
        field,
        message: `المسار "${relPath}" غير آمن أو يتجاوز المجلد المسموح`
      }
    };
  }

  const candidate = path.resolve(baseDir, relPath);
  if (!isWithinDir(baseDir, candidate)) {
    return {
      ok: false,
      error: {
        code: 'UNSAFE_PATH',
        path: manifestPath,
        file: manifestFile,
        field,
        message: `المسار "${relPath}" يخرج عن نطاق مجلد المحتوى`
      }
    };
  }

  try {
    const st = fs.statSync(candidate);
    if (!st.isFile()) {
      return {
        ok: false,
        error: {
          code: 'MISSING_FILE',
          path: manifestPath,
          file: path.basename(relPath),
          field,
          message: `الملف المرجعي "${relPath}" ليس ملفاً صالحاً في "${candidate}"`
        }
      };
    }
  } catch {
    return {
      ok: false,
      error: {
        code: 'MISSING_FILE',
        path: manifestPath,
        file: path.basename(relPath),
        field,
        message: `الملف المرجعي "${relPath}" غير موجود في المسار "${candidate}"`
      }
    };
  }

  return { ok: true, fullPath: candidate };
}

function listSubdirsSafe(dirPath: string): string[] {
  try {
    if (!fs.existsSync(dirPath)) return [];
    return fs
      .readdirSync(dirPath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

function loadUnits(
  rootDir: string,
  errors: ContentValidationError[]
): Record<string, LoadedUnit> {
  const units: Record<string, LoadedUnit> = {};
  const unitsDir = path.join(rootDir, 'units');
  if (!fs.existsSync(unitsDir)) return units;

  const subdirs = listSubdirsSafe(unitsDir);
  for (const dirName of subdirs) {
    const unitDir = path.join(unitsDir, dirName);
    const manifestPath = path.join(unitDir, 'unit.json');
    if (!fs.existsSync(manifestPath)) {
      errors.push({
        code: 'MISSING_FILE',
        path: manifestPath,
        file: 'unit.json',
        message: `مجلد الوحدة "${dirName}" لا يحتوي على الملف المطلوب unit.json`
      });
      continue;
    }

    const parsed = readJsonSafe(manifestPath);
    if (!parsed.ok) {
      errors.push(parsed.error);
      continue;
    }

    const dupKeys = findDuplicateJsonKeys(parsed.rawText);
    if (dupKeys.length > 0) {
      for (const d of dupKeys) {
        errors.push({
          code: 'DUPLICATE_ID',
          path: manifestPath,
          file: 'unit.json',
          field: d.path,
          message: `المفتاح "${d.key}" مكرر داخل unit.json`
        });
      }
      continue;
    }

    const validated = validateUnitManifest(parsed.data, manifestPath);
    if (!validated.valid || !validated.value) {
      errors.push(...validated.errors);
      continue;
    }

    const manifest = validated.value;
    if (units[manifest.id]) {
      errors.push({
        code: 'DUPLICATE_ID',
        path: manifestPath,
        file: 'unit.json',
        field: 'id',
        message: `معرّف الوحدة "${manifest.id}" مكرر (مسجّل مسبقاً في "${units[manifest.id].manifestPath}")`
      });
      continue;
    }

    let assetPath: string | undefined;
    let svgContent: string | undefined;

    if (manifest.sprite && isSafeRelativeAssetPath(manifest.sprite)) {
      const res = resolveContainedFile(unitDir, manifest.sprite, manifestPath, 'sprite');
      if (!res.ok) {
        errors.push(res.error);
        continue;
      }
      assetPath = res.fullPath;
      if (manifest.sprite.toLowerCase().endsWith('.svg')) {
        try {
          const rawSvg = fs.readFileSync(res.fullPath, 'utf8');
          const safe = sanitizeSvg(rawSvg);
          if (!safe) {
            errors.push({
              code: 'INVALID_ASSET',
              path: manifestPath,
              file: path.basename(manifest.sprite),
              field: 'sprite',
              message: `ملف SVG "${manifest.sprite}" يحتوي عناصر غير آمنة أو تالفة`
            });
            continue;
          }
          svgContent = safe;
        } catch (err) {
          errors.push({
            code: 'MISSING_FILE',
            path: manifestPath,
            file: path.basename(manifest.sprite),
            field: 'sprite',
            message: `تعذّر قراءة ملف الرسم "${manifest.sprite}": ${(err as Error).message}`
          });
          continue;
        }
      }
    } else if (manifest.model && isSafeRelativeAssetPath(manifest.model)) {
      const res = resolveContainedFile(unitDir, manifest.model, manifestPath, 'model');
      if (!res.ok) {
        errors.push(res.error);
        continue;
      }
      assetPath = res.fullPath;
    } else if (manifest.svg) {
      if (isSafeRelativeAssetPath(manifest.svg)) {
        const res = resolveContainedFile(unitDir, manifest.svg, manifestPath, 'svg');
        if (!res.ok) {
          errors.push(res.error);
          continue;
        }
        assetPath = res.fullPath;
        try {
          const safe = sanitizeSvg(fs.readFileSync(res.fullPath, 'utf8'));
          if (!safe) {
            errors.push({
              code: 'INVALID_ASSET',
              path: manifestPath,
              file: path.basename(manifest.svg),
              field: 'svg',
              message: `ملف SVG "${manifest.svg}" غير صالح`
            });
            continue;
          }
          svgContent = safe;
        } catch (err) {
          errors.push({
            code: 'MISSING_FILE',
            path: manifestPath,
            file: path.basename(manifest.svg),
            field: 'svg',
            message: `تعذّر قراءة ملف SVG: ${(err as Error).message}`
          });
          continue;
        }
      } else {
        const safe = sanitizeSvg(manifest.svg);
        if (safe) svgContent = safe;
      }
    }

    units[manifest.id] = {
      id: manifest.id,
      dirPath: unitDir,
      manifestPath,
      manifest,
      ...(assetPath ? { assetPath } : {}),
      ...(svgContent ? { svgContent } : {})
    };
  }

  return units;
}

function loadSounds(rootDir: string, errors: ContentValidationError[]): LoadedSounds | null {
  const soundsDir = path.join(rootDir, 'sounds');
  const manifestPath = path.join(soundsDir, 'manifest.json');
  if (!fs.existsSync(soundsDir) && !fs.existsSync(manifestPath)) {
    return null;
  }
  if (!fs.existsSync(manifestPath)) {
    errors.push({
      code: 'MISSING_FILE',
      path: manifestPath,
      file: 'manifest.json',
      message: 'مجلد الأصوات content/sounds/ لا يحتوي على الملف المطلوب manifest.json'
    });
    return null;
  }

  const parsed = readJsonSafe(manifestPath);
  if (!parsed.ok) {
    errors.push(parsed.error);
    return null;
  }

  const dupKeys = findDuplicateJsonKeys(parsed.rawText);
  if (dupKeys.length > 0) {
    for (const d of dupKeys) {
      errors.push({
        code: 'DUPLICATE_ID',
        path: manifestPath,
        file: 'manifest.json',
        field: d.path,
        message: `معرّف الحدث الصوتي "${d.key}" مكرر داخل manifest.json`
      });
    }
    return null;
  }

  const validated = validateSoundManifest(parsed.data, manifestPath);
  if (!validated.valid || !validated.value) {
    errors.push(...validated.errors);
    return null;
  }

  const manifest = validated.value;
  const resolvedFiles: Record<string, string[]> = {};
  let hasAssetErrors = false;

  for (const [eventName, entry] of Object.entries(manifest)) {
    const resolvedForEvent: string[] = [];
    entry.files.forEach((relFile, idx) => {
      const check = resolveContainedFile(
        soundsDir,
        relFile,
        manifestPath,
        `${eventName}.files[${idx}]`
      );
      if (!check.ok) {
        errors.push(check.error);
        hasAssetErrors = true;
      } else {
        resolvedForEvent.push(check.fullPath);
      }
    });
    resolvedFiles[eventName] = resolvedForEvent;
  }

  if (hasAssetErrors) {
    return null;
  }

  return {
    manifestPath,
    manifest,
    resolvedFiles
  };
}

function loadMaps(
  rootDir: string,
  errors: ContentValidationError[]
): Record<string, LoadedMap> {
  const maps: Record<string, LoadedMap> = {};
  const mapsDir = path.join(rootDir, 'maps');
  if (!fs.existsSync(mapsDir)) return maps;

  const subdirs = listSubdirsSafe(mapsDir);
  for (const dirName of subdirs) {
    const mapDir = path.join(mapsDir, dirName);
    const manifestPath = path.join(mapDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      errors.push({
        code: 'MISSING_FILE',
        path: manifestPath,
        file: 'manifest.json',
        message: `مجلد الخريطة "${dirName}" لا يحتوي على الملف المطلوب manifest.json`
      });
      continue;
    }

    const parsed = readJsonSafe(manifestPath);
    if (!parsed.ok) {
      errors.push(parsed.error);
      continue;
    }

    const dupKeys = findDuplicateJsonKeys(parsed.rawText);
    if (dupKeys.length > 0) {
      for (const d of dupKeys) {
        errors.push({
          code: 'DUPLICATE_ID',
          path: manifestPath,
          file: 'manifest.json',
          field: d.path,
          message: `المفتاح "${d.key}" مكرر داخل manifest.json`
        });
      }
      continue;
    }

    const validated = validateMapManifest(parsed.data, manifestPath);
    if (!validated.valid || !validated.value) {
      errors.push(...validated.errors);
      continue;
    }

    const manifest = validated.value;
    if (maps[manifest.id]) {
      errors.push({
        code: 'DUPLICATE_ID',
        path: manifestPath,
        file: 'manifest.json',
        field: 'id',
        message: `معرّف الخريطة "${manifest.id}" مكرر (مسجّل مسبقاً في "${maps[manifest.id].manifestPath}")`
      });
      continue;
    }

    const bgField = manifest.background !== undefined ? 'background' : 'svgOrUrl';
    const bgRef = manifest.background ?? manifest.svgOrUrl ?? '';
    let backgroundPath: string | undefined;
    let svgContent: string | undefined;

    if (isSafeRelativeAssetPath(bgRef)) {
      const check = resolveContainedFile(mapDir, bgRef, manifestPath, bgField);
      if (!check.ok) {
        errors.push(check.error);
        continue;
      }
      backgroundPath = check.fullPath;
      if (bgRef.toLowerCase().endsWith('.svg')) {
        try {
          const safe = sanitizeSvg(fs.readFileSync(check.fullPath, 'utf8'));
          if (!safe) {
            errors.push({
              code: 'INVALID_ASSET',
              path: manifestPath,
              file: path.basename(bgRef),
              field: bgField,
              message: `ملف خلفية الخريطة "${bgRef}" يحتوي SVG غير آمن أو تالف`
            });
            continue;
          }
          svgContent = safe;
        } catch (err) {
          errors.push({
            code: 'MISSING_FILE',
            path: manifestPath,
            file: path.basename(bgRef),
            field: bgField,
            message: `تعذّر قراءة ملف الخلفية "${bgRef}": ${(err as Error).message}`
          });
          continue;
        }
      }
    } else if (bgRef.trim().startsWith('<svg') || bgRef.trim().startsWith('<?xml')) {
      const safe = sanitizeSvg(bgRef);
      if (safe) svgContent = safe;
    }

    maps[manifest.id] = {
      id: manifest.id,
      dirPath: mapDir,
      manifestPath,
      manifest,
      ...(backgroundPath ? { backgroundPath } : {}),
      ...(svgContent ? { svgContent } : {})
    };
  }

  return maps;
}

export function loadContentRoot(rootDir: string): LoadedContentBundle {
  const resolvedRoot = path.resolve(rootDir);
  const errors: ContentValidationError[] = [];

  if (!fs.existsSync(resolvedRoot)) {
    errors.push({
      code: 'MISSING_DIR',
      path: resolvedRoot,
      file: path.basename(resolvedRoot) || resolvedRoot,
      message: `مجلد المحتوى الجذري غير موجود: "${resolvedRoot}"`
    });
    return {
      rootDir: resolvedRoot,
      units: {},
      maps: {},
      sounds: null,
      errors,
      ok: false
    };
  }

  const units = loadUnits(resolvedRoot, errors);
  const sounds = loadSounds(resolvedRoot, errors);
  const maps = loadMaps(resolvedRoot, errors);

  return {
    rootDir: resolvedRoot,
    units,
    maps,
    sounds,
    errors,
    ok: errors.length === 0
  };
}

