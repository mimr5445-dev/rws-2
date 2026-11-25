/**
 * يطبع بصمة مشروع الاختبار المرجعي. يُشغَّل 3 مرات متتالية في `npm run check`
 * لإثبات الحتمية بين عمليات مختلفة، لا داخل العملية نفسها فقط.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { migrate } from '../src/core/model/migrations.ts';
import { hashProject } from '../src/core/hash/index.ts';
import { shortHash } from '../src/core/hash/sha256.ts';

const fixture = path.resolve(import.meta.dirname, '..', 'fixtures/bench.project.json');
const raw = JSON.parse(await readFile(fixture, 'utf8'));
const project = migrate(raw);
const hash = await hashProject(project);
console.log(JSON.stringify({ hash, short: shortHash(hash), entities: project.entities.length }));
