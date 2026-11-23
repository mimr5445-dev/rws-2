import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { CountryProfile, CountryRelationType } from '../../countries/countryTypes';
import { PctInput, RELATION_OPTIONS } from './CountryEditorShared';

interface CountryDiplomacyMediaTabProps {
  draft: CountryProfile;
  setDraft: React.Dispatch<React.SetStateAction<CountryProfile | null>>;
  knownCountries: CountryProfile[];
  knownCountryMap: Map<string, CountryProfile>;
  relKind: 'alliances' | 'rivalries';
  setRelKind: (k: 'alliances' | 'rivalries') => void;
  relTargetIso3: string;
  setRelTargetIso3: (v: string) => void;
  relName: string;
  setRelName: (v: string) => void;
  relType: CountryRelationType;
  setRelType: (t: CountryRelationType) => void;
  relNotes: string;
  setRelNotes: (v: string) => void;
  onAddRelation: () => void;
  onRemoveRelation: (kind: 'alliances' | 'rivalries', idx: number) => void;
}

export function CountryDiplomacyMediaTab({
  draft,
  setDraft,
  knownCountries,
  knownCountryMap,
  relKind,
  setRelKind,
  relTargetIso3,
  setRelTargetIso3,
  relName,
  setRelName,
  relType,
  setRelType,
  relNotes,
  setRelNotes,
  onAddRelation,
  onRemoveRelation
}: CountryDiplomacyMediaTabProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-200">إدارة التحالفات والخصومات</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-900/70 border border-slate-800 rounded-lg p-3">
          <select
            aria-label="نوع القائمة الدبلوماسية"
            value={relKind}
            onChange={(e) => {
              const next = e.target.value as 'alliances' | 'rivalries';
              setRelKind(next);
              setRelType(next === 'alliances' ? 'alliance' : 'rivalry');
            }}
            className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
          >
            <option value="alliances">إضافة إلى الحلفاء والشركاء</option>
            <option value="rivalries">إضافة إلى الخصومات والتوترات</option>
          </select>

          <select
            aria-label="تفاصيل نوع العلاقة"
            value={relType}
            onChange={(e) => setRelType(e.target.value as CountryRelationType)}
            className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
          >
            {RELATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            aria-label="اختيار دولة مسجلة"
            value={relTargetIso3}
            onChange={(e) => {
              const iso = e.target.value;
              setRelTargetIso3(iso);
              const found = knownCountryMap.get(iso);
              if (found) setRelName(found.nameAr);
            }}
            className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
          >
            <option value="">-- ربط بدولة مسجلة (اختياري) --</option>
            {knownCountries
              .filter((c) => c.iso3 !== draft.iso3)
              .map((c) => (
                <option key={c.iso3} value={c.iso3}>
                  {c.nameAr} ({c.iso3})
                </option>
              ))}
          </select>

          <input
            value={relName}
            onChange={(e) => setRelName(e.target.value)}
            placeholder="اسم الدولة أو الكتلة"
            className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
          />

          <input
            value={relNotes}
            onChange={(e) => setRelNotes(e.target.value)}
            placeholder="ملاحظة مختصرة (اختياري)"
            className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
          />

          <button
            type="button"
            onClick={onAddRelation}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded border border-sky-400 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة العلاقة</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="text-[11px] font-medium text-emerald-300">الحلفاء ({draft.diplomacy.alliances.length})</div>
            {draft.diplomacy.alliances.map((rel, idx) => (
              <div
                key={`ed-ally-${idx}`}
                className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs"
              >
                <span className="truncate text-slate-200">
                  {rel.name} {rel.targetIso3 ? `(${rel.targetIso3})` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveRelation('alliances', idx)}
                  className="text-slate-400 hover:text-red-300"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <div className="text-[11px] font-medium text-rose-300">الخصومات ({draft.diplomacy.rivalries.length})</div>
            {draft.diplomacy.rivalries.map((rel, idx) => (
              <div
                key={`ed-rival-${idx}`}
                className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs"
              >
                <span className="truncate text-slate-200">
                  {rel.name} {rel.targetIso3 ? `(${rel.targetIso3})` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveRelation('rivalries', idx)}
                  className="text-slate-400 hover:text-red-300"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800 pt-4 space-y-3">
        <h3 className="text-xs font-semibold text-slate-200">الإعلام والرأي العام</h3>
        <PctInput
          id="ce-pub-opinion"
          label="مؤشر الرأي العام الداخلي"
          value={draft.mediaAndPublic.publicOpinion}
          onChange={(v) => setDraft({ ...draft, mediaAndPublic: { ...draft.mediaAndPublic, publicOpinion: v } })}
        />
        <PctInput
          id="ce-media-inf"
          label="التأثير الإعلامي"
          value={draft.mediaAndPublic.mediaInfluence}
          onChange={(v) => setDraft({ ...draft, mediaAndPublic: { ...draft.mediaAndPublic, mediaInfluence: v } })}
        />
        <div className="space-y-1">
          <label htmlFor="ce-media-narrative" className="block text-xs text-slate-300">
            السردية الإعلامية الحالية
          </label>
          <textarea
            id="ce-media-narrative"
            rows={2}
            value={draft.mediaAndPublic.narrativeSummary ?? ''}
            onChange={(e) =>
              setDraft({
                ...draft,
                mediaAndPublic: { ...draft.mediaAndPublic, narrativeSummary: e.target.value }
              })
            }
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100"
          />
        </div>
      </div>
    </div>
  );
}
