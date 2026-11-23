import { test } from 'node:test';
import assert from 'node:assert/strict';
import { discoverSoundEvents, eventNameFromFile, isEmptyAssetUrl } from './soundDiscovery';

test('event name comes from the file name, not the folder, without numeric suffix', () => {
  assert.equal(eventNameFromFile('ارتطامات/missile_impact_01.mp3'), 'missile_impact');
  assert.equal(eventNameFromFile('move_order.ogg'), 'move_order');
  assert.equal(eventNameFromFile('a/b/c/build_complete_12.wav'), 'build_complete');
});

test('empty asset URLs are detected, real data URLs are not', () => {
  assert.equal(isEmptyAssetUrl('data:audio/mpeg;base64,'), true);
  assert.equal(isEmptyAssetUrl('data:audio/mpeg;base64,SUQzBAA='), false);
  assert.equal(isEmptyAssetUrl('/assets/x-abc.mp3'), false);
});

test('numbered files with the same base form variants of one event', () => {
  const r = discoverSoundEvents(['sfx/gun_01.ogg', 'sfx/gun_02.ogg'], new Set(), null);
  assert.deepEqual(r.resolvedFiles['gun'], ['sfx/gun_01.ogg', 'sfx/gun_02.ogg']);
});

test('empty files are skipped silently', () => {
  const r = discoverSoundEvents(
    ['sfx/gun_01.ogg', 'sfx/gun_02.ogg'],
    new Set(['sfx/gun_02.ogg']),
    null
  );
  assert.deepEqual(r.resolvedFiles['gun'], ['sfx/gun_01.ogg']);
});

test('an event whose only file is empty does not appear as playable', () => {
  const r = discoverSoundEvents(['sfx/silent_01.ogg'], new Set(['sfx/silent_01.ogg']), null);
  assert.deepEqual(r.resolvedFiles['silent'] ?? [], []);
});

test('explicit manifest entries keep their volume and are not regrouped', () => {
  const manifest = {
    explosion: { files: ['missiles/ballistic_impact_01.mp3'], volume: 0.9, fallbackSynthId: 'explosion' as const }
  };
  const r = discoverSoundEvents(
    ['missiles/ballistic_impact_01.mp3', 'sfx/explosion_extra.ogg'],
    new Set(),
    manifest
  );
  assert.equal(r.manifest['explosion'].volume, 0.9);
  // The explicit entry keeps its own file only; 'explosion_extra' is a separate event by file-name rule.
  assert.deepEqual(r.resolvedFiles['explosion'], ['missiles/ballistic_impact_01.mp3']);
  assert.deepEqual(r.resolvedFiles['explosion_extra'], ['sfx/explosion_extra.ogg']);
});
