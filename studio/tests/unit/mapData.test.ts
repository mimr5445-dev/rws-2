import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { decodeMap, loadWorldMap, sha256HexOf, type RawMap } from '@/content/mapData';

const TEXT = readFileSync(path.resolve(process.cwd(), 'content/maps/world/map.bin.json'), 'utf8');
const MANIFEST = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'content/maps/world/manifest.json'), 'utf8'),
) as { sha256: string; bytes: number; countries: number };

const sha = (text: string): string => createHash('sha256').update(text).digest('hex');

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('فك ترميز الخريطة (S2.1)', () => {
  it('يفك كل الدول ويحوّل الإحداثيات إلى أعداد صحيحة', () => {
    const decoded = decodeMap(JSON.parse(TEXT) as RawMap);
    expect(decoded.countries.length).toBe(MANIFEST.countries);
    const saudi = decoded.countries.find((country) => country.name === 'Saudi Arabia');
    expect(saudi).toBeDefined();
    expect(saudi?.points.length).toBeGreaterThan(0);
    expect(decoded.projection.worldWidth).toBe(8192);
    expect(decoded.manifest).toBeNull();
    for (const value of saudi?.points ?? []) {
      expect(Number.isInteger(value)).toBe(true);
      expect(Math.abs(value)).toBeLessThanOrEqual(8192);
    }
  });

  it('يرفض صيغة أو إسقاطاً غير معروفين', () => {
    const raw = JSON.parse(TEXT) as RawMap;
    expect(() => decodeMap({ ...raw, format: 'studio.map/9' })).toThrow(/studio\.map\/9/);
    expect(() =>
      decodeMap({
        ...raw,
        projection: { ...raw.projection, kind: 'mercator' as 'equirectangular' },
      }),
    ).toThrow(/mercator/);
  });

  it('بصمة SHA-256 تطابق crypto', async () => {
    expect(await sha256HexOf('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(await sha256HexOf(TEXT)).toBe(MANIFEST.sha256);
  });
});

describe('تحميل الخريطة والتحقق من البصمة (S2.4)', () => {
  const stubFetch = (manifestText: string, mapText: string) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        const body = url.endsWith('manifest.json') ? manifestText : mapText;
        return new Response(body, { status: 200 });
      }),
    );
  };

  it('يحمل ويطابق البصمة فينجح', async () => {
    stubFetch(JSON.stringify(MANIFEST), TEXT);
    const map = await loadWorldMap();
    expect(map.manifest?.sha256).toBe(MANIFEST.sha256);
    expect(map.countries.length).toBe(MANIFEST.countries);
  });

  it('يوقف التحميل إذا كانت البصمة مختلفة', async () => {
    stubFetch(JSON.stringify({ ...MANIFEST, sha256: 'x'.repeat(64) }), TEXT);
    await expect(loadWorldMap()).rejects.toThrow(/بصمة/);
  });

  it('يرفض استجابة غير ناجحة', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('missing', { status: 404 })),
    );
    await expect(loadWorldMap()).rejects.toThrow(/تعذّر تحميل/);
  });

  it('البصمة المحسوبة في الاختبار تطابق الملف الملتزم', () => {
    expect(sha(TEXT)).toBe(MANIFEST.sha256);
    expect(Buffer.byteLength(TEXT)).toBe(MANIFEST.bytes);
  });
});
