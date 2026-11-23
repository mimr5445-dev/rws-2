import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FallbackSynthLike, LoadedSounds, resolveSoundEvent } from './soundResolver';
import { SoundId } from '../core/types';

function recorder(): FallbackSynthLike & { calls: SoundId[] } {
  const calls: SoundId[] = [];
  return { calls, play: (id: SoundId) => { calls.push(id); } };
}

const sounds: LoadedSounds = {
  manifestPath: 'content/sounds/manifest.json',
  manifest: {
    'tank.fire': { files: ['vehicles/a.ogg', 'vehicles/b.ogg'], volume: 0.5 },
    'explosion': { files: ['boom/x.ogg'] },
    'empty.event': { files: [], fallbackSynthId: 'radar_ping' }
  },
  resolvedFiles: {
    'tank.fire': ['vehicles/a.ogg', 'vehicles/b.ogg'],
    'explosion': ['boom/x.ogg'],
    'empty.event': []
  }
};

test('manifest event picks the file at the variant index with its volume', () => {
  const r = resolveSoundEvent(sounds, 'tank.fire', undefined, 'alert_ping', 1);
  assert.equal(r.source, 'manifest');
  if (r.source === 'manifest') {
    assert.equal(r.chosenFile, 'vehicles/b.ogg');
    assert.equal(r.volume, 0.5);
  }
});

test('variant index wraps around the file list', () => {
  const r = resolveSoundEvent(sounds, 'tank.fire', undefined, 'alert_ping', 5);
  assert.equal(r.source, 'manifest');
  if (r.source === 'manifest') assert.equal(r.chosenFile, 'vehicles/b.ogg');
});

test('unknown event falls back to the fallback id and calls the synth once', () => {
  const synth = recorder();
  const r = resolveSoundEvent(sounds, 'not.in.manifest', synth, 'alert_ping');
  assert.equal(r.source, 'synth_fallback');
  assert.deepEqual(synth.calls, ['alert_ping']);
});

test('known synth id is used directly when it is missing from the manifest', () => {
  const synth = recorder();
  const r = resolveSoundEvent(sounds, 'explosion', synth, 'alert_ping');
  assert.equal(r.source, 'manifest');
  assert.deepEqual(synth.calls, []);
});

test('entry with no files uses its declared fallbackSynthId', () => {
  const synth = recorder();
  const r = resolveSoundEvent(sounds, 'empty.event', synth, 'alert_ping');
  assert.equal(r.source, 'synth_fallback');
  assert.deepEqual(synth.calls, ['radar_ping']);
});

test('missing sound bank falls back without throwing', () => {
  const synth = recorder();
  const r = resolveSoundEvent(null, 'tank.fire', synth, 'alert_ping');
  assert.equal(r.source, 'synth_fallback');
  assert.deepEqual(synth.calls, ['alert_ping']);
});
