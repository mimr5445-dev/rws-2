/**
 * تسلسل JSON متعارف: مفاتيح مرتبة، بلا مسافات، أرقام بصيغة واحدة.
 * الأساس الذي تجعله البصمة قابلة للمقارنة بين الأجهزة (S1.6).
 */
export function canonicalize(value: unknown): string {
  return encode(value, new Set());
}

function encode(value: unknown, seen: Set<object>): string {
  if (value === null) return 'null';

  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number': {
      if (!Number.isFinite(value)) throw new Error('JSON المتعارف لا يقبل غير المنتهي');
      return Object.is(value, -0) ? '0' : JSON.stringify(value);
    }
    case 'string':
      return JSON.stringify(value);
    case 'bigint':
      throw new Error('BigInt غير مدعوم في JSON المتعارف');
    case 'undefined':
      return 'null';
    case 'object': {
      if (seen.has(value)) throw new Error('بنية دائرية لا يمكن تسلسلها');
      seen.add(value);
      try {
        if (Array.isArray(value)) {
          return `[${value.map((item) => encode(item, seen)).join(',')}]`;
        }
        const record = value as Record<string, unknown>;
        const keys = Object.keys(record)
          .filter((key) => record[key] !== undefined)
          .sort();
        return `{${keys
          .map((key) => `${JSON.stringify(key)}:${encode(record[key], seen)}`)
          .join(',')}}`;
      } finally {
        seen.delete(value);
      }
    }
    default:
      throw new Error(`نوع غير مدعوم في JSON المتعارف: ${typeof value}`);
  }
}
