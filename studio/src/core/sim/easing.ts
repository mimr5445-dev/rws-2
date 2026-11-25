/**
 * منحنيات التسكين المستخدمة في المسارات والمفاتيح (S3.3).
 * دوال نقية من [0,1] إلى [0,1]: نفس المدخل يعطي نفس المخرج دائماً.
 */
import type { Easing } from '../model/primitives';

export type { Easing };

const clamp01 = (value: number): number => (value <= 0 ? 0 : value >= 1 ? 1 : value);

export function ease(name: Easing, progress: number): number {
  const t = clamp01(progress);
  switch (name) {
    case 'linear':
      return t;
    case 'easeIn':
      return t * t;
    case 'easeOut':
      return 1 - (1 - t) * (1 - t);
    case 'easeInOut':
      return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
    case 'step':
      return t >= 1 ? 1 : 0;
    default:
      return t;
  }
}

/** عكس المنحنى عند نقاطه الطرفية: يُستخدم في اختبارات التناظر. */
export function isSymmetric(name: Easing): boolean {
  return name === 'linear' || name === 'easeInOut';
}
