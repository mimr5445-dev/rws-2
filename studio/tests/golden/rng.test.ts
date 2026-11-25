import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createRng } from '@/core/rng';

interface Golden {
  generator: string;
  seed: number;
  count: number;
  firstValues: number[];
  sha256OfAll: string;
}

const golden = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'tests/golden/rng-seed42.json'), 'utf8'),
) as Golden;

describe('PCG32 — المرجع الذهبي (S1.4)', () => {
  it('يبدأ التسلسل بقيم المرجع نفسها للبذرة 42', () => {
    const rng = createRng(golden.seed);
    const first = Array.from({ length: golden.firstValues.length }, () => rng.nextUint32());
    expect(first).toEqual(golden.firstValues);
  });

  it('أول 10000 قيمة تطابق بصمة المرجع', () => {
    const rng = createRng(golden.seed);
    const values: number[] = [];
    for (let index = 0; index < golden.count; index += 1) values.push(rng.nextUint32());
    const digest = createHash('sha256').update(values.join(',')).digest('hex');
    expect(digest).toBe(golden.sha256OfAll);
    expect(values).toHaveLength(10000);
  });

  it('يتطابق مع قيم المرجع الرسمي PCG32 (seed 42, seq 54)', () => {
    const rng = createRng(42, 54);
    expect([rng.nextUint32(), rng.nextUint32(), rng.nextUint32()]).toEqual([
      0xa15c02b7, 0x7b47f409, 0xba1d3330,
    ]);
  });

  it('البذرة نفسها تعطي التسلسل نفسه، والبذرة الأخرى تعطي تسلسلاً آخر', () => {
    const a = createRng(7);
    const b = createRng(7);
    const c = createRng(8);
    expect([a.nextUint32(), a.nextUint32()]).toEqual([b.nextUint32(), b.nextUint32()]);
    expect(c.nextUint32()).not.toBe(createRng(7).nextUint32());
  });

  it('nextFloat داخل [0,1) وnextInt داخل المدى', () => {
    const rng = createRng(42);
    for (let index = 0; index < 1000; index += 1) {
      const value = rng.nextFloat();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      const int = rng.nextInt(3, 9);
      expect(int).toBeGreaterThanOrEqual(3);
      expect(int).toBeLessThan(9);
    }
  });

  it('التدفق الفرعي حتمي ومستقل عن الأصل', () => {
    const parentA = createRng(42);
    const parentB = createRng(42);
    const forkA = parentA.fork(1);
    const forkB = parentB.fork(1);
    expect(forkA.nextUint32()).toBe(forkB.nextUint32());
  });
});

describe('حدود مولّد PCG32', () => {
  it('يرفض بذرة سالبة ومدى غير صالح', () => {
    expect(() => createRng(-1)).toThrow();
    expect(() => createRng(1).nextInt(5, 5)).toThrow();
    expect(() => createRng(1).nextInt(1.5, 3)).toThrow();
  });

  it('snapshot يعرض الحالة الداخلية بلا تعديل', () => {
    const rng = createRng(3);
    rng.nextUint32();
    const snapshot = rng.snapshot;
    expect(snapshot.inc % 2n).toBe(1n);
    expect(rng.nextUint32()).not.toBe(0);
  });
});
