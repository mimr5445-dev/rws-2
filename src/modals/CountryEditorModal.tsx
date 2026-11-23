import React, { useEffect, useMemo, useState } from 'react';
import { Save, X } from 'lucide-react';
import {
  CountryFlagAsset,
  CountryProfile,
  CountryRelationItem,
  CountryRelationType,
  makeCountryIdFromIso3,
  normalizeIso3,
  validateCountryProfile
} from '../countries/countryTypes';
import { CountryFlagView } from '../panels/CountryFlagView';
import { CountryDiplomacyMediaTab } from './countryEditor/CountryDiplomacyMediaTab';
import { EditorTab, cloneDraft } from './countryEditor/CountryEditorShared';
import { CountryIdentityTab } from './countryEditor/CountryIdentityTab';
import { CountryEconomyMilTab, CountryLeadershipTab } from './countryEditor/CountryLeadershipEconomyTabs';

interface CountryEditorModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialDraft: CountryProfile | null;
  knownCountries: CountryProfile[];
  regionIsoOptions: Array<{ iso3: string; label: string }>;
  onClose: () => void;
  onSave: (profile: CountryProfile) => Promise<void>;
}

export function CountryEditorModal({
  open,
  mode,
  initialDraft,
  knownCountries,
  regionIsoOptions,
  onClose,
  onSave
}: CountryEditorModalProps) {
  const [tab, setTab] = useState<EditorTab>('identity');
  const [draft, setDraft] = useState<CountryProfile | null>(null);
  const [newResource, setNewResource] = useState('');
  const [relKind, setRelKind] = useState<'alliances' | 'rivalries'>('alliances');
  const [relTargetIso3, setRelTargetIso3] = useState('');
  const [relName, setRelName] = useState('');
  const [relType, setRelType] = useState<CountryRelationType>('alliance');
  const [relNotes, setRelNotes] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && initialDraft) {
      setDraft(cloneDraft(initialDraft));
      setTab('identity');
      setErrors([]);
      setNewResource('');
      setRelTargetIso3('');
      setRelName('');
      setRelNotes('');
      setSaving(false);
    }
  }, [open, initialDraft]);

  const knownCountryMap = useMemo(() => {
    const m = new Map<string, CountryProfile>();
    for (const c of knownCountries) m.set(c.iso3, c);
    return m;
  }, [knownCountries]);

  if (!open || !draft) return null;

  const updateFlag = (patch: Partial<CountryFlagAsset>) => {
    setDraft((prev) => (prev ? { ...prev, flag: { ...prev.flag, ...patch } } : prev));
  };

  const handleFlagImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      if (!url) return;
      if (file.type === 'image/svg+xml' && url.startsWith('data:image/svg+xml')) {
        void file.text().then((txt) => updateFlag({ mode: 'svg', svg: txt }));
      } else {
        updateFlag({ mode: 'image', imageUrl: url });
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePortraitImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      if (!url) return;
      setDraft((prev) =>
        prev
          ? {
              ...prev,
              leader: {
                ...prev.leader,
                portraitUrl: url,
                portraitSvg: undefined
              }
            }
          : prev
      );
    };
    reader.readAsDataURL(file);
  };

  const handleAddResource = () => {
    const clean = newResource.trim();
    if (!clean) return;
    setDraft((prev) => {
      if (!prev) return prev;
      if (prev.economy.primaryResources.includes(clean)) return prev;
      return {
        ...prev,
        economy: {
          ...prev.economy,
          primaryResources: [...prev.economy.primaryResources, clean]
        }
      };
    });
    setNewResource('');
  };

  const handleRemoveResource = (idx: number) => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            economy: {
              ...prev.economy,
              primaryResources: prev.economy.primaryResources.filter((_, i) => i !== idx)
            }
          }
        : prev
    );
  };

  const handleAddRelation = () => {
    const iso = relTargetIso3.trim() ? normalizeIso3(relTargetIso3) : undefined;
    const matched = iso ? knownCountryMap.get(iso) : undefined;
    const finalName = relName.trim() || matched?.nameAr || '';
    if (!finalName) {
      setErrors(['أدخل اسم الدولة أو الطرف قبل إضافة العلاقة الدبلوماسية']);
      return;
    }
    const item: CountryRelationItem = {
      targetIso3: iso,
      name: finalName,
      type: relType,
      notes: relNotes.trim() || undefined
    };
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        diplomacy: {
          ...prev.diplomacy,
          [relKind]: [...prev.diplomacy[relKind], item]
        }
      };
    });
    setRelTargetIso3('');
    setRelName('');
    setRelNotes('');
    setErrors([]);
  };

  const handleRemoveRelation = (kind: 'alliances' | 'rivalries', idx: number) => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            diplomacy: {
              ...prev.diplomacy,
              [kind]: prev.diplomacy[kind].filter((_, i) => i !== idx)
            }
          }
        : prev
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prepared: CountryProfile = {
      ...draft,
      iso3: normalizeIso3(draft.iso3),
      id: mode === 'create' ? makeCountryIdFromIso3(draft.iso3) : draft.id
    };
    const res = validateCountryProfile(prepared, 'ملف الدولة');
    if (res.errors.length > 0 || !res.profile) {
      setErrors(res.errors);
      return;
    }
    setErrors([]);
    setSaving(true);
    try {
      await onSave(res.profile);
      onClose();
    } catch (err) {
      setErrors([(err as Error).message]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="countryEditorTitle"
      data-testid="country-editor-modal"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="w-full max-w-3xl max-h-[92vh] bg-slate-950 border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-900 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <CountryFlagView flag={draft.flag} alt={draft.nameAr || 'علم الدولة'} size="md" />
            <div className="min-w-0">
              <h2 id="countryEditorTitle" className="text-sm sm:text-base font-bold text-slate-100 truncate">
                {mode === 'create' ? 'إنشاء ملف دولة جديدة' : `تعديل ملف: ${draft.nameAr}`}
              </h2>
              <p className="text-[11px] text-slate-400">
                سيتم حفظ التعديلات محليًا في قاعدة بيانات المتصفح (IndexedDB) وتنعكس فورًا على الخريطة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق محرر الدولة"
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/50 flex flex-wrap gap-1.5 shrink-0">
          {(
            [
              ['identity', 'الهوية والعلم والخريطة'],
              ['leadership', 'القيادة والاستقرار'],
              ['economy_mil', 'الاقتصاد والقوات المسلحة'],
              ['diplomacy_media', 'الدبلوماسية والإعلام']
            ] as Array<[EditorTab, string]>
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border whitespace-nowrap transition-colors ${
                tab === id
                  ? 'bg-sky-600 text-white border-sky-400'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {errors.length > 0 && (
            <div
              role="alert"
              className="bg-red-950/60 border border-red-500/70 rounded-lg p-3 text-xs text-red-100 space-y-1"
            >
              {errors.map((err, i) => (
                <div key={i}>• {err}</div>
              ))}
            </div>
          )}

          {tab === 'identity' && (
            <CountryIdentityTab
              mode={mode}
              draft={draft}
              setDraft={setDraft}
              regionIsoOptions={regionIsoOptions}
              onUpdateFlag={updateFlag}
              onFlagImageUpload={handleFlagImageUpload}
            />
          )}

          {tab === 'leadership' && (
            <CountryLeadershipTab
              draft={draft}
              setDraft={setDraft}
              onPortraitImageUpload={handlePortraitImageUpload}
            />
          )}

          {tab === 'economy_mil' && (
            <CountryEconomyMilTab
              draft={draft}
              setDraft={setDraft}
              newResource={newResource}
              setNewResource={setNewResource}
              onAddResource={handleAddResource}
              onRemoveResource={handleRemoveResource}
            />
          )}

          {tab === 'diplomacy_media' && (
            <CountryDiplomacyMediaTab
              draft={draft}
              setDraft={setDraft}
              knownCountries={knownCountries}
              knownCountryMap={knownCountryMap}
              relKind={relKind}
              setRelKind={setRelKind}
              relTargetIso3={relTargetIso3}
              setRelTargetIso3={setRelTargetIso3}
              relName={relName}
              setRelName={setRelName}
              relType={relType}
              setRelType={setRelType}
              relNotes={relNotes}
              setRelNotes={setRelNotes}
              onAddRelation={handleAddRelation}
              onRemoveRelation={handleRemoveRelation}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md whitespace-nowrap"
          >
            إلغاء
          </button>

          <button
            type="submit"
            id="saveCountryModalBtn"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white border border-emerald-400 rounded-md whitespace-nowrap"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'جاري الحفظ...' : mode === 'create' ? 'إنشاء وحفظ الدولة' : 'حفظ التعديلات'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
