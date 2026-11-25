#!/usr/bin/env node
/**
 * حارس الحتمية (S1.7): يمنع مصادر الزمن الحقيقي والعشوائية غير المبذورة داخل src/core.
 * الاستثناء الوحيد: تعليق صريح `// determinism-allow: <السبب>` في السطر نفسه.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

export const FORBIDDEN_PATTERNS = [
  { pattern: /\bMath\.random\b/g, label: 'Math.random' },
  { pattern: /\bDate\b/g, label: 'Date' },
  { pattern: /\bperformance\.now\b/g, label: 'performance.now' },
  { pattern: /\bsetTimeout\b/g, label: 'setTimeout' },
  { pattern: /\bsetInterval\b/g, label: 'setInterval' },
];

export const ALLOW_MARKER = 'determinism-allow:';

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
    if (entry.isDirectory()) out.push(...(await walk(full, filter)));
    else if (filter(full)) out.push(full);
  }
  return out;
}

export async function scanCore(root) {
  const coreDir = path.join(root, 'src/core');
  const files = await walk(coreDir, (file) => /\.(ts|tsx)$/.test(file));
  const violations = [];

  for (const file of files) {
    const lines = (await readFile(file, 'utf8')).split('\n');
    lines.forEach((line, index) => {
      if (line.includes(ALLOW_MARKER)) return;
      for (const rule of FORBIDDEN_PATTERNS) {
        rule.pattern.lastIndex = 0;
        if (rule.pattern.test(line)) {
          violations.push({
            file: path.relative(root, file),
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

const isEntryPoint =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename);

if (isEntryPoint) {
  const root = path.resolve(import.meta.dirname, '..');
  const { files, violations } = await scanCore(root);
  if (violations.length === 0) {
    console.log(`✓ الحتمية: لا مخالفات في ${files} ملفاً داخل src/core`);
    process.exit(0);
  }
  console.error('✗ الحتمية: مخالفات في src/core');
  for (const violation of violations) {
    console.error(
      `  - ${violation.file}:${violation.line} [${violation.label}] ${violation.snippet}`,
    );
  }
  process.exit(1);
}
