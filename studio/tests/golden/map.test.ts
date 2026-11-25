import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SCRIPT = path.join(ROOT, 'scripts/build-map.mjs');
const COMMITTED = path.join(ROOT, 'content/maps/world/map.bin.json');
const tempDirs: string[] = [];

function build(): { dir: string; bytes: Buffer; sha256: string } {
  const dir = mkdtempSync(path.join(tmpdir(), 'studio-map-'));
  tempDirs.push(dir);
  execFileSync(process.execPath, [SCRIPT, '--out', dir], { cwd: ROOT, stdio: 'pipe' });
  const bytes = readFileSync(path.join(dir, 'map.bin.json'));
  return { dir, bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}

afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

describe('خريطة العالم المبنية مسبقاً (S2.1، ADR-0009)', () => {
  it('البناء حتمي: نسختان متتاليتان متطابقتان بايت ببايت', () => {
    const first = build();
    const second = build();
    expect(second.sha256).toBe(first.sha256);
    expect(second.bytes.equals(first.bytes)).toBe(true);
  });

  it('المخرجات الملتزمة تطابق إعادة البناء', () => {
    const rebuilt = build();
    const committed = readFileSync(COMMITTED);
    const manifest = JSON.parse(
      readFileSync(path.join(ROOT, 'content/maps/world/manifest.json'), 'utf8'),
    ) as { sha256: string; bytes: number; countries: number; points: number };

    expect(rebuilt.sha256).toBe(createHash('sha256').update(committed).digest('hex'));
    expect(rebuilt.sha256).toBe(manifest.sha256);
    expect(committed.byteLength).toBe(manifest.bytes);
    const map = JSON.parse(committed.toString('utf8')) as { countries: unknown[] };
    expect(map.countries.length).toBe(manifest.countries);
    expect(manifest.countries).toBe(177);
    expect(manifest.points).toBe(11076);
    expect(manifest.countries).toBe(177);
  }, 60_000);
});
