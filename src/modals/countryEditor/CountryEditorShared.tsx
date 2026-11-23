import React from 'react';
import { CountryProfile, CountryRelationType } from '../../countries/countryTypes';

export type EditorTab = 'identity' | 'leadership' | 'economy_mil' | 'diplomacy_media';

export const COLOR_SWATCHES = [
  '#15803d',
  '#0f766e',
  '#0284c7',
  '#1d4ed8',
  '#4338ca',
  '#b45309',
  '#ea580c',
  '#dc2626',
  '#be123c',
  '#475569'
];

export const RELATION_OPTIONS: Array<{ value: CountryRelationType; label: string }> = [
  { value: 'alliance', label: 'تحالف' },
  { value: 'defense_pact', label: 'دفاع مشترك' },
  { value: 'trade', label: 'شراكة تجارية' },
  { value: 'rivalry', label: 'خصومة' },
  { value: 'sanctions', label: 'عقوبات' },
  { value: 'tension', label: 'توتر' }
];

export function cloneDraft(src: CountryProfile): CountryProfile {
  return {
    ...src,
    flag: { ...src.flag },
    leader: { ...src.leader },
    government: { ...src.government },
    stability: { ...src.stability },
    economy: { ...src.economy, primaryResources: [...src.economy.primaryResources] },
    military: { ...src.military },
    diplomacy: {
      ...src.diplomacy,
      alliances: src.diplomacy.alliances.map((a) => ({ ...a })),
      rivalries: src.diplomacy.rivalries.map((r) => ({ ...r }))
    },
    mediaAndPublic: { ...src.mediaAndPublic },
    metadata: { ...src.metadata },
    extensions: src.extensions ? { ...src.extensions } : undefined
  };
}

export function PctInput({
  id,
  label,
  value,
  onChange
}: {
  id: string;
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <label htmlFor={id} className="text-slate-300">
          {label}
        </label>
        <span dir="ltr" className="font-mono tabular-nums text-sky-300 font-semibold">
          {value}%
        </span>
      </div>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
          className="flex-1 accent-sky-400 cursor-pointer"
        />
        <input
          type="number"
          min={0}
          max={100}
          aria-label={`${label} رقمياً`}
          value={value}
          onChange={(e) => onChange(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
          className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono tabular-nums text-slate-100 text-center"
        />
      </div>
    </div>
  );
}
