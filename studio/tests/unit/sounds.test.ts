import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SoundIntegrityError, loadSoundCatalog } from '@/content/sounds';

const ROOT = process.cwd();

type Handler = (url: string) => Uint8Array | 'missing' | undefined;

/** شبكة مزيفة تقرأ من القرص: تتيح اختبار التحقق من البصمة بلا متصفح. */
function stubFetch(handler?: Handler) {
  const requested: string[] = [];
  vi.stubGlobal('fetch', async (url: string) => {
    requested.push(url);
    const override = handler?.(url);
    if (override === 'missing') return new Response('missing', { status: 404 });
    if (override) return new Response(new Uint8Array(override).buffer as ArrayBuffer);
    try {
      const file = path.join(ROOT, 'content', url.replace(/^\//, ''));
      return new Response(new Uint8Array(readFileSync(file)));
    } catch {
      return new Response('missing', { status: 404 });
    }
  });
  return requested;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('تحميل الكتالوج والتحقق من البصمة (S4.3)', () => {
  it('يحمّل الملفات الأربعة ويعيد كتالوجاً كاملاً', async () => {
    const requested = stubFetch();
    const catalog = await loadSoundCatalog();
    expect(catalog.clips.size).toBe(4);
    expect(catalog.samples.size).toBe(4);
    expect(catalog.sampleRate).toBe(48_000);
    expect(catalog.samples.get('sound.click')?.length).toBe(2_400);
    expect(requested[0]).toBe('/sounds/manifest.json');
    expect(requested).toHaveLength(5);
  });

  it('يرفض ملفاً تغيّرت بصمته ويسمّي الملف', async () => {
    stubFetch((url) => {
      if (!url.endsWith('boom.wav')) return undefined;
      const bytes = new Uint8Array(readFileSync(path.join(ROOT, 'content/sounds/boom.wav')));
      bytes[bytes.length - 40] = bytes[bytes.length - 40]! ^ 0xff;
      return bytes;
    });
    const error = await loadSoundCatalog().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(SoundIntegrityError);
    expect((error as SoundIntegrityError).file).toBe('boom.wav');
    expect((error as Error).message).toContain('البصمة');
  });

  it('يرفض ملفاً مبتوراً لأن المدة لا تطابق المنيفست', async () => {
    stubFetch((url) => {
      if (!url.endsWith('chime.wav')) return undefined;
      const bytes = new Uint8Array(readFileSync(path.join(ROOT, 'content/sounds/chime.wav')));
      const cut = bytes.slice(0, 20_000);
      // نُصلح البصمة ونُبقي المدة خاطئة كي نختبر فحص الطول وحده.
      return cut;
    });
    const error = await loadSoundCatalog().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(SoundIntegrityError);
    expect((error as Error).message).toContain('البصمة');
  });

  it('يرفض ملفاً مفقوداً', async () => {
    stubFetch((url) => (url.endsWith('arrive.wav') ? 'missing' : undefined));
    await expect(loadSoundCatalog()).rejects.toThrow(/تعذّر التحميل/);
  });

  it('يرفض منيفست مفقوداً', async () => {
    stubFetch((url) => (url.endsWith('manifest.json') ? 'missing' : undefined));
    await expect(loadSoundCatalog()).rejects.toThrow(/manifest\.json/);
  });
});
