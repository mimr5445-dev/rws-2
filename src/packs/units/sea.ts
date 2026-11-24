// الوحدات البحرية
import { ActorPack } from '../../core/types';
import { defineUnit } from './shared';

export const STUDIO_SEA_UNITS: Record<string, ActorPack> = {
  arleigh_destroyer: defineUnit(
    'arleigh_destroyer',
    'مدمرة صواريخ DDG-51 آرلي بيرك',
    '_ship',
    { speed: 78, turnRate: 1.4, scale: 76, radius: 30 },
    {
      mode: 'missile',
      label: 'صاروخ كروز توماهوك',
      shortLabel: 'توماهوك',
      category: 'naval',
      accentColor: '#f97316',
      radius: 72
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 54">
      <defs>
        <linearGradient id="ddgReal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#334155"/>
          <stop offset="55%" stop-color="#475569"/>
          <stop offset="100%" stop-color="#64748b"/>
        </linearGradient>
      </defs>
      <!-- Hull -->
      <path d="M5 17 L68 10 L115 27 L68 44 L5 37 Z" fill="url(#ddgReal)" stroke="#090f1a" stroke-width="2.4" stroke-linejoin="round"/>
      <!-- Aft Flight Deck & Helipad -->
      <rect x="8" y="18.5" width="22" height="17" rx="1.5" fill="#1e293b" stroke="#475569" stroke-width="1.1"/>
      <circle cx="19" cy="27" r="5.2" fill="none" stroke="#fef08a" stroke-width="1.3" stroke-dasharray="3 2"/>
      <!-- Hangar + Exhaust Stacks + AEGIS Octagonal Bridge -->
      <rect x="32" y="16" width="15" height="22" rx="1.5" fill="#475569" stroke="#090f1a" stroke-width="1.6"/>
      <rect x="49" y="17.5" width="9" height="19" rx="1.5" fill="#334155" stroke="#090f1a" stroke-width="1.4"/>
      <circle cx="53.5" cy="22.5" r="2.2" fill="#0f172a"/><circle cx="53.5" cy="31.5" r="2.2" fill="#0f172a"/>
      <polygon points="60,15 80,17 83,27 80,37 60,39" fill="#64748b" stroke="#090f1a" stroke-width="1.7"/>
      <rect x="69" y="20" width="7" height="14" rx="1" fill="#38bdf8" opacity="0.88"/>
      <!-- Mk-41 VLS Vertical Launch Grid -->
      <rect x="85" y="19.5" width="12" height="15" rx="1" fill="#334155" stroke="#090f1a" stroke-width="1.4"/>
      <path d="M89 19.5 V34.5 M93 19.5 V34.5 M85 24.5 H97 M85 29.5 H97" stroke="#94a3b8" stroke-width="1"/>
      <!-- 5-inch Naval Gun -->
      <circle cx="102" cy="27" r="3.6" fill="#cbd5e1" stroke="#090f1a" stroke-width="1.5"/>
      <line x1="105" y1="27" x2="112" y2="27" stroke="#0f172a" stroke-width="2.4" stroke-linecap="round"/>
    </svg>`
  ),

  stealth_frigate: defineUnit(
    'stealth_frigate',
    'فرقاطة FREMM شبحية',
    '_ship',
    { speed: 86, turnRate: 1.7, scale: 62, radius: 24 },
    {
      mode: 'shell',
      label: 'مدفع بحري',
      shortLabel: 'مدفع بحري',
      category: 'naval',
      accentColor: '#38bdf8',
      radius: 36
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 48">
      <polygon points="7,17 60,11 94,24 60,37 7,31" fill="#64748b" stroke="#090f1a" stroke-width="2.2" stroke-linejoin="round"/>
      <polygon points="10,19 58,14 87,24 58,34 10,29" fill="#475569" opacity="0.7"/>
      <rect x="11" y="18" width="16" height="12" rx="1" fill="#1e293b" stroke="#334155" stroke-width="1"/>
      <circle cx="19" cy="24" r="3.8" fill="none" stroke="#fef08a" stroke-width="1.1"/>
      <polygon points="33,15.5 58,17 64,24 58,31 33,32.5" fill="#94a3b8" stroke="#090f1a" stroke-width="1.6"/>
      <rect x="46" y="19" width="7" height="10" rx="1" fill="#38bdf8"/>
      <polygon points="71,21 79,22 79,26 71,27" fill="#e2e8f0" stroke="#090f1a" stroke-width="1.3"/>
      <line x1="79" y1="24" x2="87" y2="24" stroke="#0f172a" stroke-width="2.2"/>
    </svg>`
  ),

  nimitz_carrier: defineUnit(
    'nimitz_carrier',
    'حاملة طائرات CVN-68 نيميتز',
    '_carrier',
    { speed: 52, turnRate: 0.9, scale: 106, radius: 42 },
    {
      mode: 'airstrike',
      label: 'إطلاق سرب جوي',
      shortLabel: 'سرب جوي',
      category: 'naval',
      accentColor: '#38bdf8',
      radius: 75
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 168 80">
      <defs>
        <linearGradient id="cvDeckReal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#1e293b"/>
          <stop offset="50%" stop-color="#334155"/>
          <stop offset="100%" stop-color="#475569"/>
        </linearGradient>
      </defs>
      <!-- Lower Hull Waterline -->
      <polygon points="6,21 122,12 162,25 162,53 122,69 6,60 3,40" fill="#0f172a"/>
      <!-- Angled Flight Deck -->
      <polygon points="9,23 72,14 120,9 160,26 160,51 120,64 112,69 11,58 7,40" fill="url(#cvDeckReal)" stroke="#0f172a" stroke-width="2.6" stroke-linejoin="round"/>
      <!-- Runway markings & Foul lines -->
      <line x1="17" y1="47" x2="118" y2="17" stroke="#f8fafc" stroke-width="2.2" opacity="0.88"/>
      <line x1="19" y1="52" x2="120" y2="22" stroke="#facc15" stroke-width="1.6" stroke-dasharray="6 5"/>
      <line x1="15" y1="42" x2="114" y2="13" stroke="#ef4444" stroke-width="1.3" opacity="0.85"/>
      <!-- Bow EMALS Catapults -->
      <line x1="99" y1="38" x2="154" y2="34" stroke="#94a3b8" stroke-width="2"/>
      <line x1="101" y1="45" x2="154" y2="43" stroke="#94a3b8" stroke-width="2"/>
      <!-- Parked Deck Hornets -->
      <polygon points="50,26 42,23 44,26 42,29" fill="#cbd5e1"/>
      <polygon points="64,23 56,20 58,23 56,26" fill="#cbd5e1"/>
      <polygon points="30,32 22,29 24,32 22,35" fill="#94a3b8"/>
      <!-- Starboard Island -->
      <rect x="78" y="49" width="30" height="13" rx="2" fill="#64748b" stroke="#090f1a" stroke-width="1.9"/>
      <rect x="87" y="51.5" width="12" height="5" rx="1" fill="#38bdf8"/>
      <circle cx="83" cy="55.5" r="2.8" fill="#e2e8f0" stroke="#090f1a" stroke-width="1"/>
    </svg>`
  ),

  attack_sub: defineUnit(
    'attack_sub',
    'غواصة هجومية فئة فرجينيا',
    '_sub',
    { speed: 68, turnRate: 1.8, scale: 68, radius: 23 },
    {
      mode: 'torpedo',
      label: 'إطلاق طوربيد',
      shortLabel: 'طوربيد',
      category: 'naval',
      accentColor: '#22d3ee',
      radius: 52
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 112 44">
      <defs>
        <linearGradient id="subHull" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#334155"/>
          <stop offset="50%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <!-- Tail Stabilizer Fins -->
      <polygon points="10,22 3,13 9,13 17,22" fill="#334155" stroke="#020617" stroke-width="1.4"/>
      <polygon points="10,22 3,31 9,31 17,22" fill="#334155" stroke="#020617" stroke-width="1.4"/>
      <!-- Teardrop Hydrodynamic Hull -->
      <path d="M12 22 C18 13 66 11 94 14 C105 16 108 22 108 22 C108 22 105 28 94 30 C66 33 18 31 12 22 Z" fill="url(#subHull)" stroke="#020617" stroke-width="2.2"/>
      <!-- Dorsal Spine & VLS Hatches -->
      <rect x="66" y="18" width="22" height="8" rx="2" fill="#0f172a" stroke="#475569" stroke-width="1"/>
      <circle cx="71" cy="20.5" r="1.2" fill="#475569"/><circle cx="77" cy="20.5" r="1.2" fill="#475569"/><circle cx="83" cy="20.5" r="1.2" fill="#475569"/>
      <circle cx="71" cy="23.5" r="1.2" fill="#475569"/><circle cx="77" cy="23.5" r="1.2" fill="#475569"/><circle cx="83" cy="23.5" r="1.2" fill="#475569"/>
      <!-- Conning Tower (Sail) + Diving Planes -->
      <rect x="46" y="10" width="5" height="24" rx="1.5" fill="#475569" stroke="#020617" stroke-width="1.2"/>
      <rect x="40" y="18.5" width="20" height="7" rx="3.5" fill="#475569" stroke="#020617" stroke-width="1.6"/>
      <circle cx="53" cy="22" r="1.8" fill="#38bdf8"/>
    </svg>`
  ),

  // ==========================================
  // 5. المباني والمنشآت الاستراتيجية (Strategic Buildings)
  // ==========================================
};
