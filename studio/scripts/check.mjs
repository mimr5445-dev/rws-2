#!/usr/bin/env node
/**
 * فحص واحد يجمع حراس المشروع: الحتمية، ثبات البصمة بين عمليات، التراخيص، القفل.
 * تُضاف فحوص المراحل اللاحقة إلى هذا الملف.
 */
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { scanCore } from './check-determinism.mjs';

const run = promisify(execFile);
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

const CONTENT_META = new Set([
  'manifest.json',
  'LICENSES.md',
  'SHA256SUMS.txt',
  '.gitkeep',
  'README.md',
]);

export async function checkLicenses() {
  const contentDir = path.join(ROOT, 'content');
  const files = await walk(
    contentDir,
    (file) =>
      !CONTENT_META.has(path.basename(file)) && !file.includes(`${path.sep}schema${path.sep}`),
  );
  const violations = [];
  const knownText = new Map();

  for (const file of files) {
    const relative = path.relative(contentDir, file);
    // سجل الأصل يُقرأ من مجلد الأصل نفسه (مجموعات متداخلة مثل maps/world) ثم من جذر المجموعة.
    const group = relative.split(path.sep)[0] ?? '';
    const dirs = [path.dirname(file), path.join(contentDir, group)];
    const cacheKey = dirs.join('|');
    let text = knownText.get(cacheKey);
    if (text === undefined) {
      const chunks = [];
      const seen = new Set();
      for (const dir of dirs) {
        for (const name of ['manifest.json', 'LICENSES.md', 'SHA256SUMS.txt']) {
          try {
            const body = await readFile(path.join(dir, name), 'utf8');
            if (seen.has(body)) continue;
            seen.add(body);
            chunks.push(body);
          } catch {
            // الملف غير موجود في هذا المستوى: يُفحص المستوى التالي.
          }
        }
      }
      text = chunks.join('\n');
      knownText.set(cacheKey, text);
    }
    if (!text.includes(path.basename(file))) {
      violations.push({
        file: path.relative(ROOT, file),
        reason: 'لا يوجد سجل ترخيص أو بصمة لهذا الأصل',
      });
    }
  }
  return { files: files.length, violations };
}

/** البصمة نفسها في ثلاث عمليات منفصلة: الحتمية لا تعتمد على حالة العملية. */
async function checkHashStability(runs = 3) {
  const results = [];
  for (let index = 0; index < runs; index += 1) {
    const { stdout } = await run('npx', ['tsx', 'scripts/hash-report.mts'], {
      cwd: ROOT,
      env: { ...process.env, TZ: index === 0 ? 'UTC' : 'Pacific/Kiritimati' },
    });
    results.push(stdout.trim());
  }
  const unique = new Set(results);
  return { runs, results, stable: unique.size === 1 };
}

/**
 * حارس الصوت (S4.4): توقيت الصوت لا يُبنى على مؤقتات، بل على ساعة الصوت نفسها.
 * يفحص كل وحدة تحتوي `audio` في مسارها داخل `src/`.
 */
async function checkNoAudioTimers() {
  const files = (await walk(path.join(ROOT, 'src'), (file) => file.endsWith('.ts'))).filter(
    (file) => /(^|[\\/])audio[\\/]/.test(path.relative(path.join(ROOT, 'src'), file)),
  );
  const violations = [];
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    text.split('\n').forEach((line, index) => {
      if (/\b(setTimeout|setInterval|requestAnimationFrame)\s*\(/.test(line)) {
        violations.push({ file: path.relative(ROOT, file), line: index + 1, snippet: line.trim() });
      }
    });
  }
  return { files: files.length, violations };
}

/**
 * حارس الأصوات (S4.3): بصمة كل ملف تطابق manifest، ولكل ملف سطر ترخيص صريح.
 */
async function checkSoundCatalog() {
  const dir = path.join(ROOT, 'content', 'sounds');
  const manifest = JSON.parse(await readFile(path.join(dir, 'manifest.json'), 'utf8'));
  const licences = await readFile(path.join(dir, 'LICENSES.md'), 'utf8');
  const violations = [];
  const listed = new Set();

  for (const clip of manifest.files) {
    listed.add(clip.file);
    const bytes = await readFile(path.join(dir, clip.file));
    const digest = createHash('sha256').update(bytes).digest('hex');
    if (digest !== clip.sha256) {
      violations.push({
        file: clip.file,
        reason: `البصمة ${digest.slice(0, 12)} لا تطابق manifest`,
      });
    }
    if (bytes.length !== clip.bytes) {
      violations.push({ file: clip.file, reason: 'الحجم بالبايت لا يطابق manifest' });
    }
    const needle = clip.file.replace('.', '\\.');
    if (!new RegExp(`\\|\\s*\`?${needle}\`?\\s*\\|`).test(licences)) {
      violations.push({ file: clip.file, reason: 'لا يوجد سطر ترخيص في LICENSES.md' });
    }
  }

  const entries = await readdir(dir);
  for (const name of entries) {
    if (name.endsWith('.wav') && !listed.has(name)) {
      violations.push({ file: name, reason: 'ملف صوت خارج الكتالوج' });
    }
  }

  return { files: manifest.files.length, violations };
}

async function main() {
  let failed = false;

  const determinism = await scanCore(ROOT);
  if (determinism.violations.length === 0) {
    console.log(`✓ الحتمية: لا مخالفات في ${determinism.files} ملفاً داخل src/core`);
  } else {
    failed = true;
    console.error('✗ الحتمية: مخالفات في src/core');
    for (const violation of determinism.violations) {
      console.error(
        `  - ${violation.file}:${violation.line} [${violation.label}] ${violation.snippet}`,
      );
    }
  }

  const hashes = await checkHashStability(3);
  if (hashes.stable) {
    const parsed = JSON.parse(hashes.results[0] ?? '{}');
    console.log(
      `✓ البصمة: متطابقة في ${hashes.runs} عمليات (${parsed.short ?? '?'} — ${parsed.entities ?? '?'} كياناً)`,
    );
  } else {
    failed = true;
    console.error('✗ البصمة: نتائج مختلفة بين العمليات');
    for (const result of hashes.results) console.error(`  - ${result}`);
  }

  const licenses = await checkLicenses();
  if (licenses.violations.length === 0) {
    console.log(`✓ التراخيص: ${licenses.files} ملف أصل موثق`);
  } else {
    failed = true;
    console.error('✗ التراخيص: أصول بلا سجل');
    for (const violation of licenses.violations) {
      console.error(`  - ${violation.file}: ${violation.reason}`);
    }
  }

  const sounds = await checkSoundCatalog();
  if (sounds.violations.length === 0) {
    console.log(`✓ الأصوات: ${sounds.files} ملفاً ببصمة وترخيص مطابقين`);
  } else {
    failed = true;
    console.error('✗ الأصوات: ملفات بلا بصمة أو ترخيص');
    for (const violation of sounds.violations) {
      console.error(`  - ${violation.file}: ${violation.reason}`);
    }
  }

  const timers = await checkNoAudioTimers();
  if (timers.violations.length === 0) {
    console.log(`✓ الصوت: لا مؤقتات في ${timers.files} وحدة صوتية (التوقيت من ساعة الصوت)`);
  } else {
    failed = true;
    console.error('✗ الصوت: مؤقتات في وحدات صوتية');
    for (const violation of timers.violations) {
      console.error(`  - ${violation.file}:${violation.line} ${violation.snippet}`);
    }
  }

  const pkg = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));
  const lockExists = await stat(path.join(ROOT, 'package-lock.json'))
    .then(() => true)
    .catch(() => false);
  if (lockExists) {
    console.log(`✓ القفل: package-lock.json موقوف على الإصدار ${pkg.version ?? '-'}`);
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
if (isEntryPoint) await main();
