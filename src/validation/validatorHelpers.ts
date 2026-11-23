import { parseStrictSec } from '../engine/engine';
import { ScenarioStep } from '../core/types';

export const VALID_FACTIONS = new Set(['blue', 'red', 'neutral']);
export const VALID_SOUNDS = new Set([
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
]);
export const VALID_STRIKE_MODES = new Set([
  'airstrike',
  'missile',
  'shell',
  'bullet',
  'artillery',
  'interceptor',
  'torpedo',
  'scan'
]);
export const VALID_ENTITY_ID_RE = /^[^\s.]+$/;
export type AfterEvent = 'arrived' | 'built';
export const AFTER_TRIGGER_RE = /^([^\s.]+)\.(arrived|built)$/;

export const isPlainObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export type StepTrigger =
  | { type: 'at'; atSec: number }
  | { type: 'after'; targetId: string; event: AfterEvent }
  | { type: 'invalid' };

export interface CreationRecord {
  id: string;
  stepIndex: number;
  kind: 'spawn' | 'construct';
  actorId: string;
  constructDurationSec: number;
  trigger: StepTrigger;
}

export interface RemovalRecord {
  id: string;
  stepIndex: number;
  trigger: StepTrigger;
}

export interface MotionRecord {
  id: string;
  stepIndex: number;
  kind: 'move' | 'airstrike';
  trigger: StepTrigger;
}

export function closestKey(target: string, keys: string[]): string | null {
  let best: string | null = null;
  let bestScore = Infinity;
  for (const k of keys) {
    let diff = Math.abs(k.length - target.length);
    const minL = Math.min(k.length, target.length);
    for (let i = 0; i < minL; i++) if (k[i] !== target[i]) diff++;
    if (diff < bestScore && diff <= 4) {
      bestScore = diff;
      best = k;
    }
  }
  return best;
}

export function parseStepTrigger(step: ScenarioStep): StepTrigger {
  const hasAt = step.at !== undefined;
  const hasAfter = step.after !== undefined;
  if (hasAt && !hasAfter) {
    const atSec = parseStrictSec(step.at);
    return atSec !== null ? { type: 'at', atSec } : { type: 'invalid' };
  }
  if (hasAfter && !hasAt && typeof step.after === 'string') {
    const m = AFTER_TRIGGER_RE.exec(step.after);
    if (m) return { type: 'after', targetId: m[1], event: m[2] as AfterEvent };
  }
  return { type: 'invalid' };
}

export function isValidEntityId(id: unknown): id is string {
  return typeof id === 'string' && id.trim().length > 0 && id.trim() === id && VALID_ENTITY_ID_RE.test(id);
}

export function setsEqual(a: Set<string> | undefined, b: Set<string>): boolean {
  if (!a || a.size !== b.size) return false;
  for (const v of b) if (!a.has(v)) return false;
  return true;
}

export function formatYamlSyntaxErrorAr(err: unknown): string {
  const e = err as { reason?: string; message?: string; mark?: { line?: number; column?: number } } | null;
  const reasonRaw = (e?.reason || e?.message || 'خطأ غير معروف').trim();
  const line = typeof e?.mark?.line === 'number' ? e.mark.line + 1 : null;
  const col = typeof e?.mark?.column === 'number' ? e.mark.column + 1 : null;
  const loc = line !== null ? ` (السطر ${line}${col !== null ? `، العمود ${col}` : ''})` : '';

  const lower = reasonRaw.toLowerCase();
  let reasonAr = reasonRaw;
  if (lower.includes('bad indentation')) {
    reasonAr = 'مسافات بادئة (indentation) غير متناسقة — تأكد من محاذاة الأسطر بالمسافات وليس Tab';
  } else if (lower.includes('can not read a block mapping entry') || lower.includes('multiline key')) {
    reasonAr = 'تعذر قراءة أحد الحقول — تحقق من وجود النقطتين (:) أو صحة المسافات البادئة';
  } else if (lower.includes('end of the stream or a document separator')) {
    reasonAr = 'نهاية غير متوقعة أو خلل في تدرج القوائم والمسافات البادئة';
  } else if (lower.includes('unexpected end of the stream') && lower.includes('quoted')) {
    reasonAr = 'علامة تنصيص غير مغلقة (" أو \')';
  } else if (lower.includes('duplicated mapping key')) {
    reasonAr = 'يوجد حقل مكرر بنفس الاسم داخل نفس الكتلة';
  } else if (lower.includes('incomplete explicit mapping pair')) {
    reasonAr = 'زوج مفتاح/قيمة غير مكتمل';
  } else if (lower.includes('cannot read an implicit mapping pair') || lower.includes('colon is missed')) {
    reasonAr = 'نقطتان (:) مفقودتان أو صياغة غير صالحة';
  } else if (lower.includes('found character that cannot start any token') || lower.includes('tab')) {
    reasonAr = 'حرف غير مسموح (تجنب استخدام زر Tab واستخدم مسافات فقط)';
  } else if (lower.includes('unexpected token') || lower.includes('missed comma')) {
    reasonAr = 'فاصلة مفقودة أو قوس غير مغلق في القوائم {} أو []';
  } else if (lower.includes('unknown tag')) {
    reasonAr = 'وسم YAML غير معروف';
  } else {
    reasonAr = 'تأكد من صحة بناء YAML والمسافات البادئة والنقطتين (:)';
  }

  return `خطأ في صياغة YAML${loc}: ${reasonAr}`;
}
