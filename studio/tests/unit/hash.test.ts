import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { canonicalize, hashProject, sha256Hex } from '@/core/hash';
import { migrate } from '@/core/model';

const fixturePath = path.resolve(process.cwd(), 'fixtures/bench.project.json');
const fixture = () => migrate(JSON.parse(readFileSync(fixturePath, 'utf8')));

describe('البصمة (S1.6)', () => {
  it('يرتب المفاتيح ويحذف غير المعرّف', () => {
    expect(canonicalize({ b: 1, a: 2, c: undefined })).toBe('{"a":2,"b":1}');
    expect(canonicalize({ a: [3, { z: 1, y: 2 }] })).toBe('{"a":[3,{"y":2,"z":1}]}');
    expect(canonicalize({ x: -0 })).toBe('{"x":0}');
  });

  it('يرفض البنى الدائرية والأرقام غير المنتهية', () => {
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;
    expect(() => canonicalize(circular)).toThrow();
    expect(() => canonicalize({ a: Number.POSITIVE_INFINITY })).toThrow();
  });

  it('Web Crypto يطابق node:crypto على التسلسل نفسه', async () => {
    const project = fixture();
    const canonical = canonicalize(project);
    const webHash = await sha256Hex(canonical);
    const nodeHash = createHash('sha256').update(canonical, 'utf8').digest('hex');
    expect(webHash).toBe(nodeHash);
    expect(webHash).toHaveLength(64);
  });

  it('بصمة المشروع المرجعي ثابتة ومقصودة', async () => {
    const hash = await hashProject(fixture());
    expect(hash).toBe('c2a58a35c3fb786d2c5d0d23f8374806bfe3d97124e0bdd580cc64db65c71b2a');
  });

  it('تتغير البصمة عند تغيير حقل واحد فقط', async () => {
    const project = fixture();
    const base = await hashProject(project);
    const changed = await hashProject({ ...project, title: 'عنوان آخر' });
    expect(changed).not.toBe(base);
  });
});

describe('أدوات البصمة', () => {
  it('shortHash يقص البصمة', async () => {
    const { shortHash } = await import('@/core/hash');
    expect(shortHash('abcdef0123456789', 8)).toBe('abcdef01');
  });

  it('hashValue يعمل على أي قيمة', async () => {
    const { hashValue } = await import('@/core/hash');
    expect(await hashValue({ a: 1 })).toBe(await hashValue({ a: 1 }));
    expect(await hashValue({ a: 1 })).not.toBe(await hashValue({ a: 2 }));
  });
});
