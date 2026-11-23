import { Domain, MapZoneDef, NavCell, Point, SoundId, StrikeMode, UnitAbilityDef, UnitCategory } from '../core/types';
import { isSafeAssetUrl } from '../packs/packSchema';

export type ContentErrorCode =
  | 'INVALID_JSON'
  | 'MISSING_FILE'
  | 'MISSING_DIR'
  | 'MISSING_FIELD'
  | 'INVALID_TYPE'
  | 'INVALID_VALUE'
  | 'DUPLICATE_ID'
  | 'UNSAFE_PATH'
  | 'UNSAFE_KEY'
  | 'INVALID_ASSET';

export interface ContentValidationError {
  code: ContentErrorCode;
  path: string;
  file: string;
  field?: string;
  message: string;
}

export function formatContentError(err: ContentValidationError): string {
  const fieldPart = err.field ? ` (${err.field})` : '';
  return `[${err.file} | ${err.path}]${fieldPart}: ${err.message}`;
}

export interface UnitManifest {
  id: string;
  label: string;
  domain: Domain;
  kind: 'person' | 'vehicle' | 'ship' | 'building' | 'air';
  speed: number;
  turnRate: number;
  scale: number;
  radius: number;
  extends?: string;
  sprite?: string;
  model?: string;
  svg?: string;
  sounds?: Record<string, string>;
  ability?: UnitAbilityDef;
}

export interface SoundManifestEntry {
  files: string[];
  volume?: number;
  fallbackSynthId?: SoundId;
}

export type SoundManifest = Record<string, SoundManifestEntry>;

export interface MapManifest {
  id: string;
  title: string;
  kind: 'geopolitical' | 'tactical';
  width: number;
  height: number;
  cellSize: number;
  cols: number;
  rows: number;
  navGrid: NavCell[];
  background?: string;
  svgOrUrl?: string;
  unitScaleMultiplier?: number;
  anchors: Record<string, Point & { label?: string }>;
  zones: Record<string, MapZoneDef>;
}

export interface ValidationResult<T> {
  valid: boolean;
  value?: T;
  errors: ContentValidationError[];
}

const SAFE_ID_RE = /^[A-Za-z0-9_-]{1,80}$/;
const SAFE_EVENT_RE = /^[A-Za-z0-9_.-]{1,80}$/;
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const DOMAINS: readonly Domain[] = ['land', 'sea', 'air'];
const ACTOR_KINDS = ['person', 'vehicle', 'ship', 'building', 'air'] as const;
const MAP_KINDS = ['geopolitical', 'tactical'] as const;
const UNIT_CATEGORIES: readonly UnitCategory[] = ['infantry', 'armor', 'air', 'naval', 'building'];
const STRIKE_MODES: readonly StrikeMode[] = [
  'airstrike',
  'missile',
  'shell',
  'bullet',
  'artillery',
  'interceptor',
  'torpedo',
  'scan'
];
const SOUND_IDS: readonly SoundId[] = [
  'build_complete',
  'alert_ping',
  'move_order',
  'spawn_pop',
  'jet_takeoff',
  'missile_launch',
  'explosion',
  'ship_horn',
  'cannon_fire',
  'gunfire_burst',
  'artillery_fire',
  'torpedo_launch',
  'radar_ping'
];
const KNOWN_TEMPLATES = new Set([
  '_person',
  '_vehicle',
  '_ship',
  '_carrier',
  '_sub',
  '_air',
  '_heli',
  '_building'
]);

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isNonNegNum = (v: unknown): v is number => isNum(v) && v >= 0;
const isPosNum = (v: unknown): v is number => isNum(v) && v > 0;

function fileNameOf(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const idx = normalized.lastIndexOf('/');
  return idx === -1 ? normalized : normalized.slice(idx + 1);
}

function makeErr(
  code: ContentErrorCode,
  filePath: string,
  message: string,
  field?: string
): ContentValidationError {
  return {
    code,
    path: filePath,
    file: fileNameOf(filePath) || filePath,
    ...(field ? { field } : {}),
    message
  };
}

export function isSafeRelativeAssetPath(rel: string): boolean {
  if (typeof rel !== 'string') return false;
  const s = rel.trim();
  if (!s) return false;
  if (/[\u0000-\u001f\u007f]/.test(s)) return false;
  if (s.includes('\\') || s.startsWith('/') || s.startsWith('//') || /%5c/i.test(s)) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s) || s.includes(':')) return false;
  if (!/^(?:\.\/)?[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(s)) return false;
  const segments = s.split('/');
  if (segments.some((seg) => seg === '..' || seg === '')) return false;
  return true;
}

function findDangerousKey(
  val: unknown,
  where: string,
  seen = new WeakSet<object>()
): { field: string; key: string } | null {
  if (typeof val !== 'object' || val === null) return null;
  if (seen.has(val)) return null;
  seen.add(val);

  if (Array.isArray(val)) {
    for (let i = 0; i < val.length; i++) {
      const found = findDangerousKey(val[i], `${where}[${i}]`, seen);
      if (found) return found;
    }
    return null;
  }

  for (const key of Object.getOwnPropertyNames(val)) {
    if (DANGEROUS_KEYS.has(key)) {
      return { field: where ? `${where}.${key}` : key, key };
    }
    const nextWhere = where ? `${where}.${key}` : key;
    const found = findDangerousKey((val as Record<string, unknown>)[key], nextWhere, seen);
    if (found) return found;
  }
  return null;
}

/**
 * Detects duplicate keys inside a raw JSON string at the same object level
 * before JSON.parse silently overwrites earlier occurrences.
 */
export function findDuplicateJsonKeys(rawJson: string): Array<{ path: string; key: string }> {
  const duplicates: Array<{ path: string; key: string }> = [];
  let i = 0;
  const len = rawJson.length;

  const skipWs = () => {
    while (i < len && /\s/.test(rawJson[i])) i++;
  };

  const readString = (): string | null => {
    if (rawJson[i] !== '"') return null;
    const start = i;
    i++;
    while (i < len) {
      const ch = rawJson[i];
      if (ch === '\\') {
        i += 2;
        continue;
      }
      if (ch === '"') {
        const slice = rawJson.slice(start, i + 1);
        i++;
        try {
          return JSON.parse(slice) as string;
        } catch {
          return null;
        }
      }
      i++;
    }
    return null;
  };

  const scanValue = (path: string): boolean => {
    skipWs();
    if (i >= len) return false;
    const ch = rawJson[i];
    if (ch === '{') {
      i++;
      const seenKeys = new Set<string>();
      skipWs();
      if (rawJson[i] === '}') {
        i++;
        return true;
      }
      while (i < len) {
        skipWs();
        const key = readString();
        if (key === null) return false;
        const keyPath = path ? `${path}.${key}` : key;
        if (seenKeys.has(key)) {
          duplicates.push({ path: keyPath, key });
        } else {
          seenKeys.add(key);
        }
        skipWs();
        if (rawJson[i] !== ':') return false;
        i++;
        if (!scanValue(keyPath)) return false;
        skipWs();
        if (rawJson[i] === ',') {
          i++;
          continue;
        }
        if (rawJson[i] === '}') {
          i++;
          return true;
        }
        return false;
      }
      return false;
    }
    if (ch === '[') {
      i++;
      skipWs();
      if (rawJson[i] === ']') {
        i++;
        return true;
      }
      let idx = 0;
      while (i < len) {
        if (!scanValue(`${path}[${idx}]`)) return false;
        idx++;
        skipWs();
        if (rawJson[i] === ',') {
          i++;
          continue;
        }
        if (rawJson[i] === ']') {
          i++;
          return true;
        }
        return false;
      }
      return false;
    }
    if (ch === '"') {
      return readString() !== null;
    }
    // Primitive literal (number, true, false, null)
    while (i < len && !/[\s,\]}]/.test(rawJson[i])) i++;
    return true;
  };

  scanValue('');
  return duplicates;
}

export function validateUnitManifest(raw: unknown, filePath: string): ValidationResult<UnitManifest> {
  const errors: ContentValidationError[] = [];
  if (!isObj(raw)) {
    return {
      valid: false,
      errors: [makeErr('INVALID_TYPE', filePath, 'يجب أن يكون مانيفست الوحدة كائن JSON صالحاً')]
    };
  }

  const dangerous = findDangerousKey(raw, '');
  if (dangerous) {
    errors.push(
      makeErr('UNSAFE_KEY', filePath, `المفتاح الخطر "${dangerous.key}" مرفوض لأسباب أمنية`, dangerous.field)
    );
    return { valid: false, errors };
  }

  if (raw.id === undefined) {
    errors.push(makeErr('MISSING_FIELD', filePath, 'الحقل المطلوب id غير موجود', 'id'));
  } else if (typeof raw.id !== 'string' || !SAFE_ID_RE.test(raw.id) || DANGEROUS_KEYS.has(raw.id)) {
    errors.push(
      makeErr('INVALID_VALUE', filePath, 'معرّف الوحدة id غير صالح (استخدم أحرفاً وأرقاماً و_ و- فقط)', 'id')
    );
  }

  if (raw.label === undefined) {
    errors.push(makeErr('MISSING_FIELD', filePath, 'الحقل المطلوب label غير موجود', 'label'));
  } else if (typeof raw.label !== 'string' || raw.label.trim().length === 0) {
    errors.push(makeErr('INVALID_VALUE', filePath, 'label يجب أن يكون نصاً غير فارغ', 'label'));
  }

  if (raw.domain === undefined) {
    errors.push(makeErr('MISSING_FIELD', filePath, 'الحقل المطلوب domain غير موجود', 'domain'));
  } else if (!DOMAINS.includes(raw.domain as Domain)) {
    errors.push(makeErr('INVALID_VALUE', filePath, 'domain يجب أن يكون land أو sea أو air', 'domain'));
  }

  if (raw.kind === undefined) {
    errors.push(makeErr('MISSING_FIELD', filePath, 'الحقل المطلوب kind غير موجود', 'kind'));
  } else if (!ACTOR_KINDS.includes(raw.kind as (typeof ACTOR_KINDS)[number])) {
    errors.push(
      makeErr('INVALID_VALUE', filePath, 'kind يجب أن يكون person أو vehicle أو ship أو building أو air', 'kind')
    );
  }

  for (const field of ['speed', 'turnRate'] as const) {
    if (raw[field] === undefined) {
      errors.push(makeErr('MISSING_FIELD', filePath, `الحقل المطلوب ${field} غير موجود`, field));
    } else if (!isNonNegNum(raw[field])) {
      errors.push(makeErr('INVALID_VALUE', filePath, `${field} يجب أن يكون رقماً غير سالب`, field));
    }
  }

  for (const field of ['scale', 'radius'] as const) {
    if (raw[field] === undefined) {
      errors.push(makeErr('MISSING_FIELD', filePath, `الحقل المطلوب ${field} غير موجود`, field));
    } else if (!isPosNum(raw[field])) {
      errors.push(makeErr('INVALID_VALUE', filePath, `${field} يجب أن يكون رقماً موجباً أكبر من صفر`, field));
    }
  }

  if (raw.extends !== undefined && (typeof raw.extends !== 'string' || !KNOWN_TEMPLATES.has(raw.extends))) {
    errors.push(
      makeErr('INVALID_VALUE', filePath, `قالب الوراثة extends "${String(raw.extends)}" غير معروف`, 'extends')
    );
  }

  const hasSprite = raw.sprite !== undefined;
  const hasModel = raw.model !== undefined;
  const hasSvg = raw.svg !== undefined;
  if (!hasSprite && !hasModel && !hasSvg) {
    errors.push(
      makeErr('MISSING_FIELD', filePath, 'يجب تحديد أصل مرئي للوحدة عبر sprite أو model أو svg', 'sprite')
    );
  }

  if (hasSprite) {
    if (typeof raw.sprite !== 'string' || (!isSafeRelativeAssetPath(raw.sprite) && !isSafeAssetUrl(raw.sprite))) {
      errors.push(
        makeErr('UNSAFE_PATH', filePath, 'مسار أو أصل sprite غير آمن أو غير صالح', 'sprite')
      );
    }
  }
  if (hasModel) {
    if (typeof raw.model !== 'string' || !isSafeRelativeAssetPath(raw.model)) {
      errors.push(
        makeErr('UNSAFE_PATH', filePath, 'مسار النموذج model يجب أن يكون مساراً نسبياً آمناً', 'model')
      );
    }
  }
  if (hasSvg) {
    if (typeof raw.svg !== 'string' || !isSafeAssetUrl(raw.svg)) {
      errors.push(
        makeErr('INVALID_ASSET', filePath, 'محتوى أو مسار svg غير آمن أو غير صالح', 'svg')
      );
    }
  }

  if (raw.sounds !== undefined) {
    if (!isObj(raw.sounds)) {
      errors.push(makeErr('INVALID_TYPE', filePath, 'sounds يجب أن يكون كائناً يربط اسم الحدث باسم الصوت', 'sounds'));
    } else {
      for (const [k, v] of Object.entries(raw.sounds)) {
        if (!SAFE_EVENT_RE.test(k) || DANGEROUS_KEYS.has(k)) {
          errors.push(makeErr('INVALID_VALUE', filePath, `مفتاح حدث الصوت "${k}" غير صالح`, `sounds.${k}`));
        }
        if (typeof v !== 'string' || !SAFE_EVENT_RE.test(v)) {
          errors.push(
            makeErr('INVALID_VALUE', filePath, `اسم الصوت المرتبط بالحدث "${k}" غير صالح`, `sounds.${k}`)
          );
        }
      }
    }
  }

  if (raw.ability !== undefined) {
    if (!isObj(raw.ability)) {
      errors.push(makeErr('INVALID_TYPE', filePath, 'ability يجب أن يكون كائناً', 'ability'));
    } else {
      const ab = raw.ability;
      if (!STRIKE_MODES.includes(ab.mode as StrikeMode)) {
        errors.push(makeErr('INVALID_VALUE', filePath, 'ability.mode غير صالح', 'ability.mode'));
      }
      if (typeof ab.label !== 'string' || !ab.label.trim()) {
        errors.push(makeErr('MISSING_FIELD', filePath, 'ability.label مطلوب', 'ability.label'));
      }
      if (typeof ab.shortLabel !== 'string' || !ab.shortLabel.trim()) {
        errors.push(makeErr('MISSING_FIELD', filePath, 'ability.shortLabel مطلوب', 'ability.shortLabel'));
      }
      if (!UNIT_CATEGORIES.includes(ab.category as UnitCategory)) {
        errors.push(makeErr('INVALID_VALUE', filePath, 'ability.category غير صالح', 'ability.category'));
      }
      if (typeof ab.accentColor !== 'string' || !/^#[0-9a-fA-F]{3,8}$/.test(ab.accentColor)) {
        errors.push(makeErr('INVALID_VALUE', filePath, 'ability.accentColor يجب أن يكون لون hex صالحاً', 'ability.accentColor'));
      }
      if (!isPosNum(ab.radius)) {
        errors.push(makeErr('INVALID_VALUE', filePath, 'ability.radius يجب أن يكون رقماً موجباً', 'ability.radius'));
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    value: raw as unknown as UnitManifest,
    errors: []
  };
}

export function validateSoundManifest(raw: unknown, filePath: string): ValidationResult<SoundManifest> {
  const errors: ContentValidationError[] = [];
  if (!isObj(raw)) {
    return {
      valid: false,
      errors: [makeErr('INVALID_TYPE', filePath, 'يجب أن يكون مانيفست الأصوات كائن JSON يربط اسم الحدث بتفاصيله')]
    };
  }

  const dangerous = findDangerousKey(raw, '');
  if (dangerous) {
    errors.push(
      makeErr('UNSAFE_KEY', filePath, `المفتاح الخطر "${dangerous.key}" مرفوض لأسباب أمنية`, dangerous.field)
    );
    return { valid: false, errors };
  }

  const result: SoundManifest = {};
  for (const [eventName, entry] of Object.entries(raw)) {
    if (!SAFE_EVENT_RE.test(eventName) || DANGEROUS_KEYS.has(eventName)) {
      errors.push(makeErr('INVALID_VALUE', filePath, `اسم الحدث الصوتي "${eventName}" غير صالح`, eventName));
      continue;
    }
    if (!isObj(entry)) {
      errors.push(makeErr('INVALID_TYPE', filePath, `تعريف الحدث "${eventName}" يجب أن يكون كائناً`, eventName));
      continue;
    }

    if (entry.files === undefined) {
      errors.push(makeErr('MISSING_FIELD', filePath, `الحقل المطلوب files غير موجود للحدث "${eventName}"`, `${eventName}.files`));
    } else if (!Array.isArray(entry.files) || entry.files.length === 0) {
      errors.push(
        makeErr('INVALID_VALUE', filePath, `files يجب أن يكون مصفوفة غير فارغة للحدث "${eventName}"`, `${eventName}.files`)
      );
    } else {
      entry.files.forEach((f, idx) => {
        if (typeof f !== 'string' || !isSafeRelativeAssetPath(f)) {
          errors.push(
            makeErr(
              'UNSAFE_PATH',
              filePath,
              `مسار ملف الصوت "${String(f)}" غير آمن أو غير صالح`,
              `${eventName}.files[${idx}]`
            )
          );
        }
      });
    }

    if (entry.volume !== undefined) {
      if (!isNum(entry.volume) || entry.volume < 0 || entry.volume > 2) {
        errors.push(
          makeErr('INVALID_VALUE', filePath, `volume للحدث "${eventName}" يجب أن يكون بين 0 و 2`, `${eventName}.volume`)
        );
      }
    }

    if (entry.fallbackSynthId !== undefined) {
      if (typeof entry.fallbackSynthId !== 'string' || !SOUND_IDS.includes(entry.fallbackSynthId as SoundId)) {
        errors.push(
          makeErr(
            'INVALID_VALUE',
            filePath,
            `fallbackSynthId "${String(entry.fallbackSynthId)}" غير معروف`,
            `${eventName}.fallbackSynthId`
          )
        );
      }
    }

    result[eventName] = {
      files: Array.isArray(entry.files) ? (entry.files as string[]) : [],
      ...(typeof entry.volume === 'number' ? { volume: entry.volume } : {}),
      ...(typeof entry.fallbackSynthId === 'string'
        ? { fallbackSynthId: entry.fallbackSynthId as SoundId }
        : {})
    };
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    value: result,
    errors: []
  };
}

export function validateMapManifest(raw: unknown, filePath: string): ValidationResult<MapManifest> {
  const errors: ContentValidationError[] = [];
  if (!isObj(raw)) {
    return {
      valid: false,
      errors: [makeErr('INVALID_TYPE', filePath, 'يجب أن يكون مانيفست الخريطة كائن JSON صالحاً')]
    };
  }

  const dangerous = findDangerousKey(raw, '');
  if (dangerous) {
    errors.push(
      makeErr('UNSAFE_KEY', filePath, `المفتاح الخطر "${dangerous.key}" مرفوض لأسباب أمنية`, dangerous.field)
    );
    return { valid: false, errors };
  }

  if (raw.id === undefined) {
    errors.push(makeErr('MISSING_FIELD', filePath, 'الحقل المطلوب id غير موجود', 'id'));
  } else if (typeof raw.id !== 'string' || !SAFE_ID_RE.test(raw.id) || DANGEROUS_KEYS.has(raw.id)) {
    errors.push(
      makeErr('INVALID_VALUE', filePath, 'معرّف الخريطة id غير صالح (استخدم أحرفاً وأرقاماً و_ و- فقط)', 'id')
    );
  }

  if (raw.title === undefined) {
    errors.push(makeErr('MISSING_FIELD', filePath, 'الحقل المطلوب title غير موجود', 'title'));
  } else if (typeof raw.title !== 'string' || raw.title.trim().length === 0) {
    errors.push(makeErr('INVALID_VALUE', filePath, 'title يجب أن يكون نصاً غير فارغ', 'title'));
  }

  if (raw.kind === undefined) {
    errors.push(makeErr('MISSING_FIELD', filePath, 'الحقل المطلوب kind غير موجود', 'kind'));
  } else if (!MAP_KINDS.includes(raw.kind as (typeof MAP_KINDS)[number])) {
    errors.push(makeErr('INVALID_VALUE', filePath, 'kind يجب أن يكون geopolitical أو tactical', 'kind'));
  }

  for (const field of ['width', 'height', 'cellSize', 'cols', 'rows'] as const) {
    if (raw[field] === undefined) {
      errors.push(makeErr('MISSING_FIELD', filePath, `الحقل المطلوب ${field} غير موجود`, field));
    } else if (!isPosNum(raw[field])) {
      errors.push(makeErr('INVALID_VALUE', filePath, `${field} يجب أن يكون رقماً موجباً`, field));
    }
  }

  if (isPosNum(raw.cols) && !Number.isInteger(raw.cols)) {
    errors.push(makeErr('INVALID_VALUE', filePath, 'cols يجب أن يكون عدداً صحيحاً موجباً', 'cols'));
  }
  if (isPosNum(raw.rows) && !Number.isInteger(raw.rows)) {
    errors.push(makeErr('INVALID_VALUE', filePath, 'rows يجب أن يكون عدداً صحيحاً موجباً', 'rows'));
  }

  if (
    isPosNum(raw.width) &&
    isPosNum(raw.cellSize) &&
    isPosNum(raw.cols) &&
    Math.abs(raw.cols * raw.cellSize - raw.width) > 1e-6
  ) {
    errors.push(
      makeErr(
        'INVALID_VALUE',
        filePath,
        `width (${raw.width}) لا يطابق cols × cellSize (${raw.cols * raw.cellSize})`,
        'width'
      )
    );
  }

  if (
    isPosNum(raw.height) &&
    isPosNum(raw.cellSize) &&
    isPosNum(raw.rows) &&
    Math.abs(raw.rows * raw.cellSize - raw.height) > 1e-6
  ) {
    errors.push(
      makeErr(
        'INVALID_VALUE',
        filePath,
        `height (${raw.height}) لا يطابق rows × cellSize (${raw.rows * raw.cellSize})`,
        'height'
      )
    );
  }

  if (raw.navGrid === undefined) {
    errors.push(makeErr('MISSING_FIELD', filePath, 'الحقل المطلوب navGrid غير موجود', 'navGrid'));
  } else if (!Array.isArray(raw.navGrid)) {
    errors.push(makeErr('INVALID_TYPE', filePath, 'navGrid يجب أن يكون مصفوفة', 'navGrid'));
  } else {
    if (isPosNum(raw.cols) && isPosNum(raw.rows) && raw.navGrid.length !== raw.cols * raw.rows) {
      errors.push(
        makeErr(
          'INVALID_VALUE',
          filePath,
          `navGrid يجب أن يحتوي cols × rows (${raw.cols * raw.rows}) عنصراً، والموجود ${raw.navGrid.length}`,
          'navGrid'
        )
      );
    }
    if (!raw.navGrid.every((c) => c === 0 || c === 1 || c === 2 || c === 3)) {
      errors.push(makeErr('INVALID_VALUE', filePath, 'خلايا navGrid يجب أن تكون من القيم 0 أو 1 أو 2 أو 3', 'navGrid'));
    }
  }

  const bgField = raw.background !== undefined ? 'background' : raw.svgOrUrl !== undefined ? 'svgOrUrl' : null;
  if (!bgField) {
    errors.push(
      makeErr('MISSING_FIELD', filePath, 'يجب تحديد خلفية الخريطة عبر الحقل background أو svgOrUrl', 'background')
    );
  } else {
    const bgVal = raw[bgField];
    if (typeof bgVal !== 'string' || (!isSafeRelativeAssetPath(bgVal) && !isSafeAssetUrl(bgVal))) {
      errors.push(makeErr('UNSAFE_PATH', filePath, `مسار أو أصل الخلفية ${bgField} غير آمن أو غير صالح`, bgField));
    }
  }

  if (raw.unitScaleMultiplier !== undefined && !isPosNum(raw.unitScaleMultiplier)) {
    errors.push(
      makeErr('INVALID_VALUE', filePath, 'unitScaleMultiplier يجب أن يكون رقماً موجباً', 'unitScaleMultiplier')
    );
  }

  if (raw.anchors === undefined) {
    errors.push(makeErr('MISSING_FIELD', filePath, 'الحقل المطلوب anchors غير موجود', 'anchors'));
  } else if (!isObj(raw.anchors)) {
    errors.push(makeErr('INVALID_TYPE', filePath, 'anchors يجب أن يكون كائناً', 'anchors'));
  } else {
    for (const [name, p] of Object.entries(raw.anchors)) {
      if (!SAFE_ID_RE.test(name) || DANGEROUS_KEYS.has(name)) {
        errors.push(makeErr('INVALID_VALUE', filePath, `معرّف المرساة "${name}" غير صالح`, `anchors.${name}`));
      }
      if (!isObj(p) || !isNum(p.x) || !isNum(p.y)) {
        errors.push(
          makeErr('INVALID_VALUE', filePath, `المرساة "${name}" يجب أن تحمل إحداثيي x و y رقميين`, `anchors.${name}`)
        );
      } else if (
        isPosNum(raw.width) &&
        isPosNum(raw.height) &&
        (p.x < 0 || p.x > raw.width || p.y < 0 || p.y > raw.height)
      ) {
        errors.push(
          makeErr(
            'INVALID_VALUE',
            filePath,
            `المرساة "${name}" (${p.x}, ${p.y}) خارج حدود الخريطة [0..${raw.width}]×[0..${raw.height}]`,
            `anchors.${name}`
          )
        );
      }
    }
  }

  if (raw.zones === undefined) {
    errors.push(makeErr('MISSING_FIELD', filePath, 'الحقل المطلوب zones غير موجود', 'zones'));
  } else if (!isObj(raw.zones)) {
    errors.push(makeErr('INVALID_TYPE', filePath, 'zones يجب أن يكون كائناً', 'zones'));
  } else {
    for (const [zName, z] of Object.entries(raw.zones)) {
      if (!SAFE_ID_RE.test(zName) || DANGEROUS_KEYS.has(zName)) {
        errors.push(makeErr('INVALID_VALUE', filePath, `معرّف المنطقة "${zName}" غير صالح`, `zones.${zName}`));
      }
      if (
        !isObj(z) ||
        !Array.isArray(z.polygon) ||
        z.polygon.length < 3 ||
        !z.polygon.every((pt) => isObj(pt) && isNum(pt.x) && isNum(pt.y))
      ) {
        errors.push(
          makeErr(
            'INVALID_VALUE',
            filePath,
            `المنطقة "${zName}" يجب أن تحتوي مضلعاً من 3 نقاط صالحة على الأقل`,
            `zones.${zName}`
          )
        );
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    value: raw as unknown as MapManifest,
    errors: []
  };
}
