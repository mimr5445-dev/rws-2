/** SHA-256 عبر Web Crypto: يعمل في المتصفح وفي Node 22 بلا استيراد خاص (S1.6). */
const encoder = new TextEncoder();

export function toCanonicalBytes(input: string | Uint8Array): Uint8Array {
  return typeof input === 'string' ? encoder.encode(input) : input;
}

export async function sha256Hex(input: string | Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('Web Crypto غير متاح في هذه البيئة');
  const digest = await subtle.digest('SHA-256', toCanonicalBytes(input) as BufferSource);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function shortHash(hash: string, length = 12): string {
  return hash.slice(0, length);
}
