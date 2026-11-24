import { TICK_RATE } from '../engine/engine';
import { StrikeMode } from '../core/types';
import { WORLD_BRIEFING_MAP_ID } from '../maps/worldMapIds';

export interface ArmedAbilityState {
  entityId: string;
  mode: StrikeMode;
  radius: number;
  color: string;
  label: string;
  shortLabel: string;
}

export interface StudioHudState {
  simTimeSec: number;
  tick: number;
  maxTicks: number;
  caption: string;
  entityCount: number;
  executedSteps: number;
  totalSteps: number;
}

export const INITIAL_HUD_STATE: StudioHudState = {
  simTimeSec: 0,
  tick: 0,
  maxTicks: Math.round(20 * TICK_RATE),
  caption: '',
  entityCount: 0,
  executedSteps: 0,
  totalSteps: 0
};

export const DEFAULT_EMPTY_YAML = `meta:
  title: "سيناريو عالمي جديد"
  map: ${WORLD_BRIEFING_MAP_ID}
timeline:
  - at: "0s"
    caption:
      text: "بداية العرض التكتيكي"
`;
