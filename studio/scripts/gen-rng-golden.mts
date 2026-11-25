/**
 * يبني المرجع الذهبي لمولّد PCG32: أول 10000 قيمة للبذرة 42.
 * المرجع يُلتزم في المستودع، وأي تغيير في المولّد يفشل الاختبار (S1.4).
 */
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRng } from '../src/core/rng/pcg32.ts';

const SEED = 42;
const COUNT = 10000;

const rng = createRng(SEED);
const values: number[] = [];
for (let index = 0; index < COUNT; index += 1) values.push(rng.nextUint32());

const digest = createHash('sha256').update(values.join(',')).digest('hex');
const payload = {
  generator: 'PCG32',
  seed: SEED,
  count: COUNT,
  firstValues: values.slice(0, 10),
  sha256OfAll: digest,
};

const target = path.resolve(import.meta.dirname, '..', 'tests/golden/rng-seed42.json');
await writeFile(target, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`✓ tests/golden/rng-seed42.json — ${digest.slice(0, 16)}`);
console.log('أول 10 قيم:', payload.firstValues.join(', '));
