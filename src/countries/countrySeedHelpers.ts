import { COUNTRY_SCHEMA_VERSION, CountryProfile } from './countryTypes';

const DEMO_SOURCE_LABEL = 'بيانات تجريبية للمحاكاة (قابلة للتعديل)';
const DEMO_UPDATED_AT = '2026-01-15T00:00:00.000Z';
const DEMO_NOTE = 'قيم تجريبية مبدئية لأغراض المحاكاة والاختبار وليست بيانات رسمية حالية؛ يمكنك تعديلها وحفظها.';

export interface FlagPresetTemplate {
  id: string;
  label: string;
  svg: string;
}

export function buildTriBandFlagSvg(top: string, middle: string, bottom: string, emblemSvg = ''): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><rect width="90" height="20" y="0" fill="${top}"/><rect width="90" height="20" y="20" fill="${middle}"/><rect width="90" height="20" y="40" fill="${bottom}"/>${emblemSvg}</svg>`;
}

export function buildVerticalTriBandFlagSvg(left: string, center: string, right: string, emblemSvg = ''): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><rect width="30" height="60" x="0" fill="${left}"/><rect width="30" height="60" x="30" fill="${center}"/><rect width="30" height="60" x="60" fill="${right}"/>${emblemSvg}</svg>`;
}

export const FLAG_PRESET_TEMPLATES: FlagPresetTemplate[] = [
  {
    id: 'tricolor_h',
    label: 'ثلاثي أفقي (أخضر/أبيض/داكن)',
    svg: buildTriBandFlagSvg('#15803d', '#f8fafc', '#0f172a', '<circle cx="45" cy="30" r="6" fill="#d97706"/>')
  },
  {
    id: 'tricolor_v',
    label: 'ثلاثي عمودي (أزرق/أبيض/أحمر)',
    svg: buildVerticalTriBandFlagSvg('#1d4ed8', '#f8fafc', '#dc2626')
  },
  {
    id: 'crescent_banner',
    label: 'راية بهلال ونجمة',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><rect width="90" height="60" fill="#b91c1c"/><circle cx="38" cy="30" r="14" fill="#f8fafc"/><circle cx="42" cy="30" r="11" fill="#b91c1c"/><polygon points="56,23 58,28 63,28 59,31 60,36 56,33 52,36 53,31 49,28 54,28" fill="#f8fafc"/></svg>'
  },
  {
    id: 'nordic_cross',
    label: 'صليب استراتيجي',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><rect width="90" height="60" fill="#1e3a8a"/><rect width="90" height="12" y="24" fill="#facc15"/><rect width="12" height="60" x="26" fill="#facc15"/></svg>'
  },
  {
    id: 'emerald_chevron',
    label: 'مثلث جانبي وثلاثة أشرطة',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><rect width="90" height="20" y="0" fill="#0f172a"/><rect width="90" height="20" y="20" fill="#f8fafc"/><rect width="90" height="20" y="40" fill="#15803d"/><polygon points="0,0 34,30 0,60" fill="#b91c1c"/></svg>'
  }
];

export function createSeedCountry(
  input: Omit<CountryProfile, 'id' | 'metadata'> & { notes?: string }
): CountryProfile {
  const { notes, ...rest } = input;
  return {
    ...rest,
    id: `country_${rest.iso3.toLowerCase()}`,
    metadata: {
      dataSourceKind: 'seed_demo',
      sourceLabel: DEMO_SOURCE_LABEL,
      updatedAt: DEMO_UPDATED_AT,
      schemaVersion: COUNTRY_SCHEMA_VERSION,
      notes: notes ?? DEMO_NOTE
    }
  };
}

