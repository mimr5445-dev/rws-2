#!/usr/bin/env node
// فحص واحد يجمع حراس المرحلة: الحتمية والتراخيص. تُضاف فحوص المراحل اللاحقة هنا.
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');

async function walk(dir, filter) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      out.push(...(await walk(full, filter)));
    } else if (filter(full)) {
      out.push(full);
    }
  }
  return out;
}

const FORBIDDEN = [
  { pattern: /\bMath\.random\b/g, label: 'Math.random' },
  { pattern: /\bDate\b/g, label: 'Date' },
  { pattern: /\bperformance\.now\b/g, label: 'performance.now' },
  { pattern: /\bsetTimeout\b/g, label: 'setTimeout' },
  { pattern: /\bsetInterval\b/g, label: 'setInterval' },
];

const ALLOW_MARKER = 'determinism-allow:';

export async function checkDeterminism() {
  const files = await walk(path.join(ROOT, 'src/core'), (file) => /\.(ts|tsx)$/.test(file));
  const violations = [];
  for (const file of files) {
    const lines = (await readFile(file, 'utf8')).split('\n');
    lines.forEach((line, index) => {
      if (line.includes(ALLOW_MARKER)) return;
      for (const rule of FORBIDDEN) {
        rule.pattern.lastIndex = 0;
        if (rule.pattern.test(line)) {
          violations.push({
            file: path.relative(ROOT, file),
            line: index + 1,
            label: rule.label,
            snippet: line.trim().slice(0, 120),
          });
        }
      }
    });
  }
  return { files: files.length, violations };
}

const CONTENT_META = new Set(['manifest.json', 'LICENSES.md', 'SHA256SUMS.txt', '.gitkeep']);

export async function checkLicenses() {
  const contentDir = path.join(ROOT, 'content');
  const files = await walk(contentDir, (file) => !CONTENT_META.has(path.basename(file)));
  const violations = [];
  const knownText = new Map();

  for (const file of files) {
    const relative = path.relative(contentDir, file);
    const group = relative.split(path.sep)[0] ?? '';
    const groupDir = path.join(contentDir, group);
    let text = knownText.get(groupDir);
    if (text === undefined) {
      const chunks = [];
      for (const name of ['manifest.json', 'LICENSES.md', 'SHA256SUMS.txt']) {
        try {
          chunks.push(await readFile(path.join(groupDir, name), 'utf8'));
        } catch {
          // الملف غير موجود: يُفحص لاحقاً عبر محتوى المجموعة.
        }
      }
      text = chunks.join('\n');
      knownText.set(groupDir, text);
    }
    const base = path.basename(file);
    if (!text.includes(base)) {
      violations.push({
        file: path.relative(ROOT, file),
        reason: 'لا يوجد سجل ترخيص أو بصمة لهذا الأصل',
      });
    }
  }
  return { files: files.length, violations };
}

async function main() {
  let failed = false;

  const determinism = await checkDeterminism();
  if (determinism.violations.length === 0) {
    console.log(`✓ الحتمية: لا مخالفات في ${determinism.files} ملفاً داخل src/core`);
  } else {
    failed = true;
    console.error('✗ الحتمية: مخالفات في src/core');
    for (const v of determinism.violations) {
      console.error(`  - ${v.file}:${v.line} [${v.label}] ${v.snippet}`);
    }
  }

  const licenses = await checkLicenses();
  if (licenses.violations.length === 0) {
    console.log(`✓ التراخيص: ${licenses.files} ملف أصل موثق`);
  } else {
    failed = true;
    console.error('✗ التراخيص: أصول بلا سجل');
    for (const v of licenses.violations) {
      console.error(`  - ${v.file}: ${v.reason}`);
    }
  }

  const pkg = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));
  const lockExists = await stat(path.join(ROOT, 'package-lock.json'))
    .then(() => true)
    .catch(() => false);
  if (lockExists) {
    console.log(`✓ القفل: package-lock.json ملتصق بالإصدار ${pkg.version ?? '-'}`);
  } else {
    failed = true;
    console.error('✗ القفل: package-lock.json مفقود');
  }

  if (failed) {
    console.error('\nفشل الفحص. أصلح المخالفات أعلاه.');
    process.exit(1);
  }
  console.log('\nكل الفحوص نجحت.');
}

const isEntryPoint =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename);
if (isEntryPoint) {
  await main();
}
