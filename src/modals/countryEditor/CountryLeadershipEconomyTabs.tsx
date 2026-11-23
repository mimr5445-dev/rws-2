import React from 'react';
import { Plus, Trash2, Upload } from 'lucide-react';
import { CountryProfile } from '../../countries/countryTypes';
import { LeaderPortraitView } from '../../panels/CountryFlagView';
import { PctInput } from './CountryEditorShared';

export function CountryLeadershipTab({
  draft,
  setDraft,
  onPortraitImageUpload
}: {
  draft: CountryProfile;
  setDraft: React.Dispatch<React.SetStateAction<CountryProfile | null>>;
  onPortraitImageUpload: (file: File) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <LeaderPortraitView
            name={draft.leader.name}
            portraitSvg={draft.leader.portraitSvg}
            portraitUrl={draft.leader.portraitUrl}
          />
          <div>
            <div className="text-xs font-semibold text-slate-200">صورة رئيس الدولة (اختياري)</div>
            <div className="text-[11px] text-slate-400">يمكنك رفع صورة PNG/JPG أو تركها للأحرف التلقائية</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 rounded-md cursor-pointer whitespace-nowrap">
            <Upload className="w-3.5 h-3.5" />
            <span>رفع صورة</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPortraitImageUpload(f);
              }}
            />
          </label>
          {(draft.leader.portraitUrl || draft.leader.portraitSvg) && (
            <button
              type="button"
              onClick={() =>
                setDraft({
                  ...draft,
                  leader: { ...draft.leader, portraitUrl: undefined, portraitSvg: undefined }
                })
              }
              className="px-2.5 py-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-md"
            >
              مسح الصورة
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="ce-leader-name" className="block text-xs text-slate-300">
            اسم رئيس الدولة
          </label>
          <input
            id="ce-leader-name"
            value={draft.leader.name}
            onChange={(e) => setDraft({ ...draft, leader: { ...draft.leader, name: e.target.value } })}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="ce-leader-title" className="block text-xs text-slate-300">
            منصب رئيس الدولة
          </label>
          <input
            id="ce-leader-title"
            value={draft.leader.title}
            onChange={(e) => setDraft({ ...draft, leader: { ...draft.leader, title: e.target.value } })}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="ce-gov-head" className="block text-xs text-slate-300">
            رئيس الحكومة / الجهة التنفيذية
          </label>
          <input
            id="ce-gov-head"
            value={draft.government.headOfGovernment}
            onChange={(e) =>
              setDraft({
                ...draft,
                government: { ...draft.government, headOfGovernment: e.target.value }
              })
            }
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="ce-gov-title" className="block text-xs text-slate-300">
            مسمى رئاسة الحكومة
          </label>
          <input
            id="ce-gov-title"
            value={draft.government.headTitle}
            onChange={(e) =>
              setDraft({
                ...draft,
                government: { ...draft.government, headTitle: e.target.value }
              })
            }
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100"
          />
        </div>
      </div>

      <div className="border-t border-slate-800 pt-4 space-y-3">
        <h3 className="text-xs font-semibold text-slate-200">مؤشرات الاستقرار والنفوذ</h3>
        <PctInput
          id="ce-pol-stab"
          label="الاستقرار السياسي"
          value={draft.stability.politicalStability}
          onChange={(v) => setDraft({ ...draft, stability: { ...draft.stability, politicalStability: v } })}
        />
        <PctInput
          id="ce-int-stab"
          label="الاستقرار الداخلي"
          value={draft.stability.internalStability}
          onChange={(v) => setDraft({ ...draft, stability: { ...draft.stability, internalStability: v } })}
        />
        <PctInput
          id="ce-intl-inf"
          label="النفوذ الدولي"
          value={draft.stability.internationalInfluence}
          onChange={(v) => setDraft({ ...draft, stability: { ...draft.stability, internationalInfluence: v } })}
        />
      </div>
    </div>
  );
}

export function CountryEconomyMilTab({
  draft,
  setDraft,
  newResource,
  setNewResource,
  onAddResource,
  onRemoveResource
}: {
  draft: CountryProfile;
  setDraft: React.Dispatch<React.SetStateAction<CountryProfile | null>>;
  newResource: string;
  setNewResource: (val: string) => void;
  onAddResource: () => void;
  onRemoveResource: (idx: number) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-200">المؤشرات الاقتصادية والموارد</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label htmlFor="ce-gdp" className="block text-xs text-slate-300">
              الناتج المحلي (مليار $)
            </label>
            <input
              id="ce-gdp"
              dir="ltr"
              type="number"
              min={0}
              value={draft.economy.gdpBillionUsd}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  economy: { ...draft.economy, gdpBillionUsd: Math.max(0, Number(e.target.value) || 0) }
                })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs font-mono tabular-nums text-slate-100"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="ce-budget" className="block text-xs text-slate-300">
              الميزانية السنوية (مليار $)
            </label>
            <input
              id="ce-budget"
              dir="ltr"
              type="number"
              min={0}
              value={draft.economy.annualBudgetBillionUsd}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  economy: {
                    ...draft.economy,
                    annualBudgetBillionUsd: Math.max(0, Number(e.target.value) || 0)
                  }
                })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs font-mono tabular-nums text-slate-100"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="ce-currency" className="block text-xs text-slate-300">
              رمز العملة
            </label>
            <input
              id="ce-currency"
              dir="ltr"
              value={draft.economy.currencyCode ?? ''}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  economy: { ...draft.economy, currencyCode: e.target.value.toUpperCase() }
                })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs font-mono text-slate-100"
            />
          </div>
        </div>

        <PctInput
          id="ce-econ-pwr"
          label="القوة الاقتصادية"
          value={draft.economy.economicPower}
          onChange={(v) => setDraft({ ...draft, economy: { ...draft.economy, economicPower: v } })}
        />

        <div className="space-y-2">
          <label htmlFor="ce-add-resource" className="block text-xs text-slate-300">
            الموارد الاقتصادية الرئيسية
          </label>
          <div className="flex gap-2">
            <input
              id="ce-add-resource"
              value={newResource}
              onChange={(e) => setNewResource(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onAddResource();
                }
              }}
              placeholder="أضف مورداً (مثال: الغاز الطبيعي)"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100"
            />
            <button
              type="button"
              onClick={onAddResource}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 rounded-md whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة</span>
            </button>
          </div>
          <div className="space-y-1">
            {draft.economy.primaryResources.map((res, idx) => (
              <div
                key={`${res}-${idx}`}
                className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs"
              >
                <span className="text-slate-200">{res}</span>
                <button
                  type="button"
                  aria-label={`حذف المورد ${res}`}
                  onClick={() => onRemoveResource(idx)}
                  className="text-slate-400 hover:text-red-300 p-0.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800 pt-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold text-slate-200">توزيع القوة العسكرية</h3>
          <div className="flex items-center gap-2">
            <label htmlFor="ce-personnel" className="text-[11px] text-slate-400">
              الأفراد العاملون:
            </label>
            <input
              id="ce-personnel"
              dir="ltr"
              type="number"
              min={0}
              value={draft.military.activePersonnel ?? 0}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  military: { ...draft.military, activePersonnel: Math.max(0, Number(e.target.value) || 0) }
                })
              }
              className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono tabular-nums text-slate-100"
            />
          </div>
        </div>

        <PctInput
          id="ce-mil-all"
          label="القوة العسكرية الإجمالية"
          value={draft.military.overallPower}
          onChange={(v) => setDraft({ ...draft, military: { ...draft.military, overallPower: v } })}
        />
        <PctInput
          id="ce-mil-land"
          label="القوات البرية"
          value={draft.military.landForces}
          onChange={(v) => setDraft({ ...draft, military: { ...draft.military, landForces: v } })}
        />
        <PctInput
          id="ce-mil-sea"
          label="القوات البحرية"
          value={draft.military.navalForces}
          onChange={(v) => setDraft({ ...draft, military: { ...draft.military, navalForces: v } })}
        />
        <PctInput
          id="ce-mil-air"
          label="القوات الجوية"
          value={draft.military.airForces}
          onChange={(v) => setDraft({ ...draft, military: { ...draft.military, airForces: v } })}
        />
        <div className="space-y-1">
          <label htmlFor="ce-doctrine" className="block text-xs text-slate-300">
            العقيدة العسكرية
          </label>
          <input
            id="ce-doctrine"
            value={draft.military.doctrine ?? ''}
            onChange={(e) => setDraft({ ...draft, military: { ...draft.military, doctrine: e.target.value } })}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100"
          />
        </div>
      </div>
    </div>
  );
}
