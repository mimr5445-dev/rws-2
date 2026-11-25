import type { Project } from '../model/project';
import { canonicalize } from './canonical';
import { sha256Hex } from './sha256';

export { canonicalize } from './canonical';
export { sha256Hex, shortHash, toCanonicalBytes } from './sha256';

/** بصمة المشروع: تسلسل متعارف ثم SHA-256. */
export async function hashProject(project: Project): Promise<string> {
  return sha256Hex(canonicalize(project));
}

/** بصمة أي قيمة (حالة محاكاة، جدول أصوات، إلخ). */
export async function hashValue(value: unknown): Promise<string> {
  return sha256Hex(canonicalize(value));
}
