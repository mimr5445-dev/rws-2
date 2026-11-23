import React from 'react';
import { Check, Upload } from 'lucide-react';
import { FLAG_PRESET_TEMPLATES } from '../../countries/countrySeed';
import { CountryFlagAsset, CountryProfile, normalizeIso3 } from '../../countries/countryTypes';
import { COLOR_SWATCHES } from './CountryEditorShared';

interface CountryIdentityTabProps {
  mode: 'create' | 'edit';
  draft: CountryProfile;
  setDraft: React.Dispatch<React.SetStateAction<CountryProfile | null>>;
  regionIsoOptions: Array<{ iso3: string; label: string }>;
  onUpdateFlag: (patch: Partial<CountryFlagAsset>) => void;
  onFlagImageUpload: (file: File) => void;
}

export function CountryIdentityTab({
  mode,
  draft,
  setDraft,
  regionIsoOptions,
  onUpdateFlag,
  onFlagImageUpload
}: CountryIdentityTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label htmlFor="ce-iso3" className="block text-xs text-slate-300">
            رمز ISO3 (لربط الخريطة)
          </label>
          <input
            id="ce-iso3"
            dir="ltr"
            list="world-iso-datalist"
            value={draft.iso3}
            disabled={mode === 'edit'}
            onChange={(e) => setDraft({ ...draft, iso3: normalizeIso3(e.target.value) })}
            placeholder="مثال: SAU أو JOR"
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs font-mono text-slate-100 disabled:opacity-60"
          />
          <datalist id="world-iso-datalist">
            {regionIsoOptions.map((opt) => (
              <option key={opt.iso3} value={opt.iso3}>
                {opt.label}
              </option>
            ))}
          </datalist>
        </div>

        <div className="space-y-1">
          <label htmlFor="ce-nameAr" className="block text-xs text-slate-300">
            الاسم بالعربية
          </label>
          <input
            id="ce-nameAr"
            value={draft.nameAr}
            onChange={(e) => setDraft({ ...draft, nameAr: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="ce-nameEn" className="block text-xs text-slate-300">
            الاسم بالإنجليزية
          </label>
          <input
            id="ce-nameEn"
            dir="ltr"
            value={draft.nameEn}
            onChange={(e) => setDraft({ ...draft, nameEn: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <label htmlFor="ce-capitalAr" className="block text-xs text-slate-300">
            العاصمة
          </label>
          <input
            id="ce-capitalAr"
            value={draft.capitalAr}
            onChange={(e) => setDraft({ ...draft, capitalAr: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="ce-regime" className="block text-xs text-slate-300">
            نظام الحكم
          </label>
          <input
            id="ce-regime"
            value={draft.regimeType}
            onChange={(e) => setDraft({ ...draft, regimeType: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="ce-pop" className="block text-xs text-slate-300">
            السكان
          </label>
          <input
            id="ce-pop"
            dir="ltr"
            type="number"
            min={0}
            value={draft.population}
            onChange={(e) => setDraft({ ...draft, population: Math.max(0, Number(e.target.value) || 0) })}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs font-mono tabular-nums text-slate-100"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="ce-area" className="block text-xs text-slate-300">
            المساحة (كم²)
          </label>
          <input
            id="ce-area"
            dir="ltr"
            type="number"
            min={0}
            value={draft.areaKm2}
            onChange={(e) => setDraft({ ...draft, areaKm2: Math.max(0, Number(e.target.value) || 0) })}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs font-mono tabular-nums text-slate-100"
          />
        </div>
      </div>

      {/* Map Color */}
      <div className="border-t border-slate-800 pt-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="ce-mapColor" className="text-xs font-semibold text-slate-200">
            لون الدولة على الخريطة العالمية
          </label>
          <div className="flex items-center gap-2">
            <input
              id="ce-mapColor"
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(draft.mapColor) ? draft.mapColor : '#15803d'}
              onChange={(e) => setDraft({ ...draft, mapColor: e.target.value })}
              className="w-8 h-7 rounded border border-slate-700 bg-slate-900 cursor-pointer"
            />
            <input
              type="text"
              dir="ltr"
              aria-label="كود اللون السداسي"
              value={draft.mapColor}
              onChange={(e) => setDraft({ ...draft, mapColor: e.target.value })}
              className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-100"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {COLOR_SWATCHES.map((hex) => (
            <button
              key={hex}
              type="button"
              aria-label={`اختيار اللون ${hex}`}
              onClick={() => setDraft({ ...draft, mapColor: hex })}
              className={`w-7 h-7 rounded border flex items-center justify-center transition-transform ${
                draft.mapColor.toLowerCase() === hex.toLowerCase()
                  ? 'border-white scale-105'
                  : 'border-slate-700'
              }`}
              style={{ backgroundColor: hex }}
            >
              {draft.mapColor.toLowerCase() === hex.toLowerCase() && (
                <Check className="w-3.5 h-3.5 text-white drop-shadow" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Flag Customization */}
      <div className="border-t border-slate-800 pt-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-200">تخصيص العلم</span>
          <div className="flex items-center gap-1.5">
            {(
              [
                ['svg', 'SVG / قالب'],
                ['image', 'صورة مرفوعة'],
                ['emoji', 'رمز (Emoji)']
              ] as Array<[CountryFlagAsset['mode'], string]>
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => onUpdateFlag({ mode: m })}
                className={`px-2.5 py-1 rounded text-[11px] border whitespace-nowrap ${
                  draft.flag.mode === m
                    ? 'bg-sky-600 text-white border-sky-400'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-400">قوالب جاهزة:</span>
          {FLAG_PRESET_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onUpdateFlag({ mode: 'svg', svg: tpl.svg })}
              className="px-2 py-1 text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded whitespace-nowrap"
            >
              {tpl.label}
            </button>
          ))}
          <label className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 rounded cursor-pointer whitespace-nowrap">
            <Upload className="w-3 h-3" />
            <span>رفع علم (PNG/SVG)</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFlagImageUpload(f);
              }}
            />
          </label>
        </div>

        {draft.flag.mode === 'svg' && (
          <textarea
            dir="ltr"
            rows={3}
            aria-label="كود SVG للعلم"
            value={draft.flag.svg ?? ''}
            onChange={(e) => onUpdateFlag({ svg: e.target.value })}
            placeholder='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60">...</svg>'
            className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-[11px] font-mono text-slate-200"
          />
        )}
        {draft.flag.mode === 'emoji' && (
          <input
            aria-label="رمز Emoji للعلم"
            value={draft.flag.emoji ?? ''}
            onChange={(e) => onUpdateFlag({ emoji: e.target.value })}
            placeholder="🏳️"
            className="w-32 bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-base text-center"
          />
        )}
        {draft.flag.mode === 'image' && (
          <input
            dir="ltr"
            aria-label="رابط صورة العلم أو Data URL"
            value={draft.flag.imageUrl ?? ''}
            onChange={(e) => onUpdateFlag({ imageUrl: e.target.value })}
            placeholder="https://... أو data:image/png;base64,..."
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs font-mono text-slate-200"
          />
        )}
      </div>

      {/* Summary */}
      <div className="space-y-1">
        <label htmlFor="ce-summary" className="block text-xs text-slate-300">
          الملخص الاستراتيجي للدولة
        </label>
        <textarea
          id="ce-summary"
          rows={3}
          value={draft.summary}
          onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
          className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100 leading-5"
        />
      </div>
    </div>
  );
}
