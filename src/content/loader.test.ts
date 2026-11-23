import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { SoundId } from '../core/types';
import { SoundSynth } from '../renderer/soundSynth';
import { loadContentRoot, resolveSoundEvent } from './loader';
import { formatContentError } from './schema';

function makeTempContentDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'rws-content-test-'));
}

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function writeText(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function createMinimalValidFixture(rootDir: string): void {
  writeJson(path.join(rootDir, 'units', 'tank_m1', 'unit.json'), {
    id: 'tank_m1',
    label: 'دبابة اختبار',
    domain: 'land',
    kind: 'vehicle',
    speed: 85,
    turnRate: 2.5,
    scale: 48,
    radius: 20,
    sprite: 'sprite.svg',
    sounds: { fire: 'tank.fire' }
  });
  writeText(
    path.join(rootDir, 'units', 'tank_m1', 'sprite.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="8" y="16" width="48" height="32" fill="#64748b"/></svg>'
  );

  writeJson(path.join(rootDir, 'sounds', 'manifest.json'), {
    'tank.fire': {
      files: ['vehicles/tank_fire_01.ogg'],
      volume: 0.8,
      fallbackSynthId: 'cannon_fire'
    }
  });
  writeText(path.join(rootDir, 'sounds', 'vehicles', 'tank_fire_01.ogg'), 'OggS-test-payload');

  writeJson(path.join(rootDir, 'maps', 'desert_pass', 'manifest.json'), {
    id: 'desert_pass',
    title: 'خريطة اختبار',
    kind: 'tactical',
    width: 160,
    height: 120,
    cellSize: 40,
    cols: 4,
    rows: 3,
    background: 'map.svg',
    anchors: {
      base_a: { x: 40, y: 60, label: 'القاعدة' }
    },
    zones: {
      zone_1: {
        id: 'zone_1',
        label: 'منطقة',
        polygon: [
          { x: 0, y: 0 },
          { x: 80, y: 0 },
          { x: 80, y: 80 }
        ]
      }
    },
    navGrid: [0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0]
  });
  writeText(
    path.join(rootDir, 'maps', 'desert_pass', 'map.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120"><rect width="160" height="120" fill="#1e293b"/></svg>'
  );
}

test('loads real repository content/ examples (unit, sound, map) cleanly with zero errors', () => {
  const repoContentDir = path.resolve(process.cwd(), 'content');
  const loaded = loadContentRoot(repoContentDir);

  assert.equal(loaded.ok, true, loaded.errors.map(formatContentError).join('\n'));
  assert.equal(loaded.errors.length, 0);
  assert.ok(loaded.units.tank_m1, 'expected content/units/tank_m1 to load');
  assert.ok(loaded.units.tank_m1.svgContent?.includes('<svg'));
  assert.ok(loaded.sounds?.manifest['tank.fire'], 'expected content/sounds/manifest.json tank.fire event');
  assert.equal(loaded.sounds?.resolvedFiles['tank.fire']?.length, 1);
  assert.ok(loaded.maps.desert_pass, 'expected content/maps/desert_pass to load');
  assert.ok(loaded.maps.desert_pass.svgContent?.includes('<svg'));
});

test('loads valid fixture manifests cleanly', () => {
  const dir = makeTempContentDir();
  try {
    createMinimalValidFixture(dir);
    const loaded = loadContentRoot(dir);
    assert.equal(loaded.ok, true, loaded.errors.map(formatContentError).join('\n'));
    assert.equal(Object.keys(loaded.units).length, 1);
    assert.equal(Object.keys(loaded.maps).length, 1);
    assert.ok(loaded.sounds?.manifest['tank.fire']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('reports missing required fields with file path, filename, and field without throwing', () => {
  const dir = makeTempContentDir();
  try {
    createMinimalValidFixture(dir);
    // Remove required fields in unit.json, sounds/manifest.json, and map manifest.json
    writeJson(path.join(dir, 'units', 'tank_m1', 'unit.json'), {
      id: 'tank_m1',
      domain: 'land',
      kind: 'vehicle',
      speed: 80,
      turnRate: 2.5,
      scale: 48,
      radius: 20,
      sprite: 'sprite.svg'
      // label is missing
    });
    writeJson(path.join(dir, 'sounds', 'manifest.json'), {
      'tank.fire': {
        volume: 0.7
        // files is missing
      }
    });
    writeJson(path.join(dir, 'maps', 'desert_pass', 'manifest.json'), {
      id: 'desert_pass',
      kind: 'tactical',
      width: 160,
      height: 120,
      cellSize: 40,
      cols: 4,
      rows: 3,
      background: 'map.svg',
      anchors: {},
      zones: {},
      navGrid: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      // title is missing
    });

    const loaded = loadContentRoot(dir);
    assert.equal(loaded.ok, false);

    const unitErr = loaded.errors.find((e) => e.file === 'unit.json' && e.field === 'label');
    assert.ok(unitErr, 'expected missing label error in unit.json');
    assert.equal(unitErr.code, 'MISSING_FIELD');
    assert.ok(unitErr.path.includes('unit.json'));

    const soundErr = loaded.errors.find(
      (e) => e.file === 'manifest.json' && e.path.includes('sounds') && e.field === 'tank.fire.files'
    );
    assert.ok(soundErr, 'expected missing files error in sounds/manifest.json');
    assert.equal(soundErr.code, 'MISSING_FIELD');

    const mapErr = loaded.errors.find(
      (e) => e.file === 'manifest.json' && e.path.includes('desert_pass') && e.field === 'title'
    );
    assert.ok(mapErr, 'expected missing title error in map manifest.json');
    assert.equal(mapErr.code, 'MISSING_FIELD');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('rejects duplicate unit IDs, duplicate map IDs, and duplicate JSON keys in sounds manifest', () => {
  const dir = makeTempContentDir();
  try {
    createMinimalValidFixture(dir);
    // Add a second unit folder declaring duplicate id "tank_m1"
    writeJson(path.join(dir, 'units', 'tank_m1_clone', 'unit.json'), {
      id: 'tank_m1',
      label: 'نسخة مكررة',
      domain: 'land',
      kind: 'vehicle',
      speed: 80,
      turnRate: 2.5,
      scale: 48,
      radius: 20,
      sprite: 'sprite.svg'
    });
    writeText(
      path.join(dir, 'units', 'tank_m1_clone', 'sprite.svg'),
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32"/></svg>'
    );

    // Add a second map folder declaring duplicate id "desert_pass"
    writeJson(path.join(dir, 'maps', 'desert_pass_copy', 'manifest.json'), {
      id: 'desert_pass',
      title: 'خريطة مكررة',
      kind: 'tactical',
      width: 160,
      height: 120,
      cellSize: 40,
      cols: 4,
      rows: 3,
      background: 'map.svg',
      anchors: {},
      zones: {},
      navGrid: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    });
    writeText(
      path.join(dir, 'maps', 'desert_pass_copy', 'map.svg'),
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120"><rect width="160" height="120"/></svg>'
    );

    // Raw JSON with duplicate key "tank.fire" in sounds/manifest.json
    writeText(
      path.join(dir, 'sounds', 'manifest.json'),
      `{
        "tank.fire": { "files": ["vehicles/tank_fire_01.ogg"] },
        "tank.fire": { "files": ["vehicles/tank_fire_01.ogg"] }
      }`
    );

    const loaded = loadContentRoot(dir);
    assert.equal(loaded.ok, false);
    assert.ok(loaded.errors.some((e) => e.code === 'DUPLICATE_ID' && e.file === 'unit.json' && e.field === 'id'));
    assert.ok(
      loaded.errors.some(
        (e) => e.code === 'DUPLICATE_ID' && e.path.includes('desert_pass_copy') && e.field === 'id'
      )
    );
    assert.ok(
      loaded.errors.some(
        (e) => e.code === 'DUPLICATE_ID' && e.path.includes('sounds') && e.field === 'tank.fire'
      )
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('reports missing audio file referenced in sounds manifest without throwing', () => {
  const dir = makeTempContentDir();
  try {
    createMinimalValidFixture(dir);
    fs.unlinkSync(path.join(dir, 'sounds', 'vehicles', 'tank_fire_01.ogg'));

    const loaded = loadContentRoot(dir);
    assert.equal(loaded.ok, false);
    assert.equal(loaded.sounds, null);

    const missingAudioErr = loaded.errors.find(
      (e) => e.code === 'MISSING_FILE' && e.file === 'tank_fire_01.ogg'
    );
    assert.ok(missingAudioErr, 'expected MISSING_FILE error referencing tank_fire_01.ogg');
    assert.ok(missingAudioErr.path.includes('manifest.json'));
    assert.equal(missingAudioErr.field, 'tank.fire.files[0]');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('handles malformed JSON, path traversal, and prototype-pollution keys gracefully', () => {
  const dir = makeTempContentDir();
  try {
    createMinimalValidFixture(dir);
    writeText(path.join(dir, 'units', 'tank_m1', 'unit.json'), '{ invalid json');
    writeJson(path.join(dir, 'sounds', 'manifest.json'), {
      'tank.fire': { files: ['../outside.ogg'] }
    });
    writeText(
      path.join(dir, 'maps', 'desert_pass', 'manifest.json'),
      '{"__proto__": {"polluted": true}, "id": "desert_pass"}'
    );

    const loaded = loadContentRoot(dir);
    assert.equal(loaded.ok, false);
    assert.ok(loaded.errors.some((e) => e.code === 'INVALID_JSON' && e.file === 'unit.json'));
    assert.ok(loaded.errors.some((e) => e.code === 'UNSAFE_PATH' && e.field === 'tank.fire.files[0]'));
    assert.ok(loaded.errors.some((e) => e.code === 'UNSAFE_KEY'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('resolveSoundEvent uses manifest file when present and falls back to SoundSynth when absent', () => {
  const repoContentDir = path.resolve(process.cwd(), 'content');
  const loaded = loadContentRoot(repoContentDir);
  assert.equal(loaded.ok, true);

  const playedFallbackIds: SoundId[] = [];
  const synth = new SoundSynth();
  const origPlay = synth.play.bind(synth);
  synth.play = (id: SoundId) => {
    playedFallbackIds.push(id);
    origPlay(id);
  };

  // Present in manifest -> resolves to manifest file without calling synth fallback
  const hit = resolveSoundEvent(loaded.sounds, 'tank.fire', synth, 'cannon_fire');
  assert.equal(hit.source, 'manifest');
  if (hit.source === 'manifest') {
    assert.ok(hit.chosenFile.endsWith('tank_fire_01.ogg'));
    assert.equal(hit.volume, 0.85);
  }
  assert.equal(playedFallbackIds.length, 0);

  // Absent from manifest -> falls back cleanly to SoundSynth
  const miss = resolveSoundEvent(loaded.sounds, 'explosion', synth, 'alert_ping');
  assert.equal(miss.source, 'synth_fallback');
  if (miss.source === 'synth_fallback') {
    assert.equal(miss.synthId, 'explosion');
  }
  assert.deepEqual(playedFallbackIds, ['explosion']);
});
