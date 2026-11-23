// المنشآت والقيادة والبنية التحتية
import { ActorPack } from '../../core/types';
import { defineUnit } from './shared';

export const STUDIO_INFRA_UNITS: Record<string, ActorPack> = {
  command_hq: defineUnit(
    'command_hq',
    'مركز قيادة وسيطرة',
    '_building',
    { scale: 62, radius: 27 },
    {
      mode: 'scan',
      label: 'توجيه وإنذار',
      shortLabel: 'توجيه',
      category: 'building',
      accentColor: '#38bdf8',
      radius: 105
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
      <rect x="6" y="8" width="68" height="64" rx="6" fill="#1e293b" stroke="#090f1a" stroke-width="2.6"/>
      <rect x="10" y="12" width="60" height="56" rx="4" fill="#334155" stroke="#475569" stroke-width="1.2"/>
      <!-- Fortified Bunker Roof -->
      <polygon points="16,22 40,15 64,22 64,52 16,52" fill="#475569" stroke="#090f1a" stroke-width="2"/>
      <!-- SATCOM Radome -->
      <circle cx="40" cy="34" r="11" fill="#e2e8f0" stroke="#090f1a" stroke-width="1.8"/>
      <path d="M31 34 A9 9 0 0 1 49 34" fill="none" stroke="#94a3b8" stroke-width="1.4"/>
      <circle cx="40" cy="34" r="3" fill="#0284c7"/>
      <!-- Helipad & Entrance -->
      <circle cx="24" cy="58" r="7" fill="#0f172a" stroke="#facc15" stroke-width="1.3"/>
      <path d="M22 55 V61 M26 55 V61 M22 58 H26" stroke="#facc15" stroke-width="1.4"/>
      <rect x="44" y="54" width="18" height="9" rx="1.5" fill="#1e293b" stroke="#090f1a" stroke-width="1.2"/>
      <circle cx="60" cy="21" r="2.6" fill="#22c55e"/>
    </svg>`
  ),

  airbase_runway: defineUnit(
    'airbase_runway',
    'قاعدة جوية',
    '_building',
    { scale: 68, radius: 30 },
    {
      mode: 'airstrike',
      label: 'إقلاع سرب جوي',
      shortLabel: 'دعم جوي',
      category: 'building',
      accentColor: '#38bdf8',
      radius: 70
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 84 84">
      <rect x="5" y="7" width="74" height="70" rx="5" fill="#1e293b" stroke="#090f1a" stroke-width="2.6"/>
      <rect x="8" y="10" width="68" height="64" rx="3" fill="#283548" stroke="#475569" stroke-width="1"/>
      <!-- Runway -->
      <rect x="11" y="13" width="62" height="17" rx="2" fill="#0f172a" stroke="#64748b" stroke-width="1.2"/>
      <path d="M13 15 V28 M16 15 V28 M68 15 V28 M71 15 V28" stroke="#f8fafc" stroke-width="1.5"/>
      <line x1="21" y1="21.5" x2="63" y2="21.5" stroke="#facc15" stroke-width="1.8" stroke-dasharray="6 4"/>
      <!-- Hardened Aircraft Shelters -->
      <rect x="12" y="35" width="20" height="15" rx="4" fill="#475569" stroke="#090f1a" stroke-width="1.6"/>
      <path d="M16 50 V40 C16 37 28 37 28 40 V50 Z" fill="#1e293b"/>
      <rect x="12" y="54" width="20" height="15" rx="4" fill="#475569" stroke="#090f1a" stroke-width="1.6"/>
      <path d="M16 69 V59 C16 56 28 56 28 59 V69 Z" fill="#1e293b"/>
      <!-- Radar Tower & Helipad -->
      <circle cx="46" cy="54" r="11" fill="#0f172a" stroke="#38bdf8" stroke-width="1.8" stroke-dasharray="4 2"/>
      <path d="M42 49 V59 M50 49 V59 M42 54 H50" stroke="#facc15" stroke-width="2" stroke-linecap="round"/>
      <rect x="61" y="37" width="12" height="12" rx="2" fill="#64748b" stroke="#090f1a" stroke-width="1.5"/>
      <circle cx="67" cy="43" r="3.5" fill="#38bdf8"/>
    </svg>`
  ),

  missile_silo: defineUnit(
    'missile_silo',
    'صومعة صواريخ',
    '_building',
    { scale: 56, radius: 25 },
    {
      mode: 'missile',
      label: 'إطلاق صاروخ استراتيجي',
      shortLabel: 'صاروخ',
      category: 'building',
      accentColor: '#ef4444',
      radius: 90
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 76 76">
      <rect x="8" y="8" width="60" height="60" rx="6" fill="#27272a" stroke="#090f1a" stroke-width="2.6"/>
      <polygon points="18,14 58,14 62,18 62,58 58,62 18,62 14,58 14,18" fill="#3f3f46" stroke="#52525b" stroke-width="1.4"/>
      <!-- Reinforced Concrete Blast Doors -->
      <circle cx="38" cy="38" r="19" fill="#18181b" stroke="#f59e0b" stroke-width="2.4" stroke-dasharray="6 4"/>
      <circle cx="38" cy="38" r="14" fill="#09090b" stroke="#71717a" stroke-width="1.6"/>
      <!-- Missile Warhead Tip Ready Inside Silo -->
      <circle cx="38" cy="38" r="7.5" fill="#dc2626" stroke="#f8fafc" stroke-width="1.4"/>
      <circle cx="38" cy="38" r="3" fill="#fef08a"/>
    </svg>`
  ),

  radar_defense: defineUnit(
    'radar_defense',
    'محطة رادار',
    '_building',
    { scale: 54, radius: 24 },
    {
      mode: 'scan',
      label: 'مسح راداري',
      shortLabel: 'مسح راداري',
      category: 'building',
      accentColor: '#38bdf8',
      radius: 120
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
      <rect x="8" y="8" width="56" height="56" rx="6" fill="#1e293b" stroke="#090f1a" stroke-width="2.5"/>
      <polygon points="20,14 52,14 58,20 58,52 52,58 20,58 14,52 14,20" fill="#334155" stroke="#475569" stroke-width="1.5"/>
      <circle cx="36" cy="36" r="16" fill="#0c4a6e" stroke="#38bdf8" stroke-width="2"/>
      <circle cx="36" cy="36" r="10" fill="none" stroke="#7dd3fc" stroke-width="1.1" stroke-dasharray="3 2"/>
      <polygon points="36,36 50,24 53,29" fill="#38bdf8" opacity="0.5"/>
      <line x1="36" y1="36" x2="49" y2="23" stroke="#fef08a" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="36" cy="36" r="3.5" fill="#e2e8f0" stroke="#090f1a" stroke-width="1.4"/>
    </svg>`
  ),

  oil_refinery: defineUnit(
    'oil_refinery',
    'منشأة نفطية',
    '_building',
    { scale: 62, radius: 28 },
    {
      mode: 'scan',
      label: 'تأمين المنشأة',
      shortLabel: 'تأمين',
      category: 'building',
      accentColor: '#f59e0b',
      radius: 80
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
      <rect x="6" y="8" width="68" height="64" rx="5" fill="#1e293b" stroke="#090f1a" stroke-width="2.6"/>
      <rect x="9" y="11" width="62" height="58" rx="3" fill="#273244" stroke="#475569" stroke-width="1"/>
      <path d="M14 26 H66 M14 48 H56 M26 14 V62 M46 14 V50" stroke="#94a3b8" stroke-width="2.4" fill="none"/>
      <circle cx="24" cy="25" r="10.5" fill="#e2e8f0" stroke="#334155" stroke-width="2"/>
      <circle cx="24" cy="25" r="6.5" fill="#cbd5e1" stroke="#64748b" stroke-width="1"/>
      <circle cx="24" cy="52" r="10" fill="#cbd5e1" stroke="#334155" stroke-width="2"/>
      <circle cx="24" cy="52" r="6" fill="#94a3b8" stroke="#64748b" stroke-width="1"/>
      <circle cx="46" cy="24" r="7.5" fill="#94a3b8" stroke="#0f172a" stroke-width="1.8"/>
      <circle cx="46" cy="24" r="3" fill="#334155"/>
      <rect x="39" y="38" width="16" height="14" rx="2" fill="#475569" stroke="#090f1a" stroke-width="1.6"/>
      <circle cx="62" cy="54" r="6.5" fill="#7c2d12" stroke="#090f1a" stroke-width="1.5"/>
      <circle cx="62" cy="54" r="4.2" fill="#f97316"/>
      <circle cx="62" cy="54" r="2.2" fill="#fef08a"/>
    </svg>`
  ),

  seaport_terminal: defineUnit(
    'seaport_terminal',
    'ميناء بحري استراتيجي',
    '_building',
    { scale: 64, radius: 28 },
    {
      mode: 'scan',
      label: 'حركة الميناء',
      shortLabel: 'إشارة ميناء',
      category: 'building',
      accentColor: '#0ea5e9',
      radius: 85
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
      <rect x="6" y="10" width="68" height="60" rx="4" fill="#1e293b" stroke="#090f1a" stroke-width="2.5"/>
      <!-- Concrete Pier Apron -->
      <rect x="10" y="14" width="60" height="28" rx="2" fill="#64748b" stroke="#090f1a" stroke-width="1.4"/>
      <!-- Gantry Cranes -->
      <rect x="16" y="8" width="6" height="38" rx="1" fill="#f97316" stroke="#090f1a" stroke-width="1.3"/>
      <rect x="44" y="8" width="6" height="38" rx="1" fill="#f97316" stroke="#090f1a" stroke-width="1.3"/>
      <!-- Stacked Shipping Containers -->
      <rect x="12" y="48" width="16" height="8" rx="1" fill="#dc2626" stroke="#090f1a" stroke-width="1.2"/>
      <rect x="31" y="48" width="16" height="8" rx="1" fill="#0284c7" stroke="#090f1a" stroke-width="1.2"/>
      <rect x="50" y="48" width="16" height="8" rx="1" fill="#16a34a" stroke="#090f1a" stroke-width="1.2"/>
      <rect x="16" y="58" width="16" height="8" rx="1" fill="#f59e0b" stroke="#090f1a" stroke-width="1.2"/>
      <rect x="36" y="58" width="16" height="8" rx="1" fill="#3b82f6" stroke="#090f1a" stroke-width="1.2"/>
    </svg>`
  ),

  capital_gov: defineUnit(
    'capital_gov',
    'مبنى سيادي / برلمان',
    '_building',
    { scale: 60, radius: 26 },
    {
      mode: 'scan',
      label: 'قرار سيادي',
      shortLabel: 'بيان',
      category: 'building',
      accentColor: '#eab308',
      radius: 95
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
      <rect x="10" y="14" width="60" height="52" rx="4" fill="#334155" stroke="#090f1a" stroke-width="2.4"/>
      <!-- Courtyard & Neoclassical Wings -->
      <rect x="14" y="24" width="52" height="32" rx="2" fill="#e2e8f0" stroke="#090f1a" stroke-width="1.8"/>
      <rect x="26" y="18" width="28" height="44" rx="2" fill="#f8fafc" stroke="#090f1a" stroke-width="1.8"/>
      <!-- Central Dome -->
      <circle cx="40" cy="40" r="12" fill="#cbd5e1" stroke="#090f1a" stroke-width="2"/>
      <circle cx="40" cy="40" r="7.5" fill="#f59e0b" stroke="#090f1a" stroke-width="1.4"/>
      <circle cx="40" cy="40" r="2.6" fill="#fef08a"/>
      <!-- Colonnade Steps -->
      <line x1="20" y1="60" x2="60" y2="60" stroke="#94a3b8" stroke-width="2"/>
      <line x1="23" y1="63" x2="57" y2="63" stroke="#64748b" stroke-width="2"/>
    </svg>`
  )
};
