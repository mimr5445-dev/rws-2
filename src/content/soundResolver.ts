import { SoundId } from '../core/types';
import { SoundManifest } from './schema';

export interface LoadedSounds {
  manifestPath: string;
  manifest: SoundManifest;
  resolvedFiles: Record<string, string[]>;
}

export interface FallbackSynthLike {
  play(id: SoundId): void;
}

export type SoundResolution =
  | {
      source: 'manifest';
      eventName: string;
      files: string[];
      chosenFile: string;
      volume: number;
    }
  | {
      source: 'synth_fallback';
      eventName: string;
      synthId: SoundId;
    };

const KNOWN_SYNTH_SOUND_IDS = new Set<SoundId>([
  'build_complete',
  'alert_ping',
  'move_order',
  'spawn_pop',
  'jet_takeoff',
  'missile_launch',
  'explosion',
  'ship_horn',
  'cannon_fire',
  'gunfire_burst',
  'artillery_fire',
  'torpedo_launch',
  'radar_ping'
]);

export function resolveSoundEvent(
  sounds: LoadedSounds | null | undefined,
  eventName: string,
  fallbackSynth?: FallbackSynthLike,
  fallbackId: SoundId = 'alert_ping',
  variantIndex = 0
): SoundResolution {
  const entry = sounds?.manifest?.[eventName];
  const files = sounds?.resolvedFiles?.[eventName];
  if (entry && files && files.length > 0) {
    const idx = Math.abs(Math.floor(variantIndex)) % files.length;
    return {
      source: 'manifest',
      eventName,
      files,
      chosenFile: files[idx],
      volume: entry.volume ?? 1.0
    };
  }

  const synthId: SoundId = KNOWN_SYNTH_SOUND_IDS.has(eventName as SoundId)
    ? (eventName as SoundId)
    : entry?.fallbackSynthId ?? fallbackId;

  if (fallbackSynth) {
    fallbackSynth.play(synthId);
  }

  return {
    source: 'synth_fallback',
    eventName,
    synthId
  };
}
