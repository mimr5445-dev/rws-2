// الوحدات الجوية
import { ActorPack } from '../../core/types';
import { defineUnit } from './shared';

export const STUDIO_AIR_UNITS: Record<string, ActorPack> = {
  f35_stealth: defineUnit(
    'f35_stealth',
    'مقاتلة شبح (F-35/F-22)',
    '_air',
    { speed: 235, turnRate: 3.4, scale: 56, radius: 24 },
    {
      mode: 'airstrike',
      label: 'غارة جوية',
      shortLabel: 'غارة جوية',
      category: 'air',
      accentColor: '#38bdf8',
      radius: 68
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <defs>
        <linearGradient id="f22Body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#94a3b8"/>
          <stop offset="50%" stop-color="#64748b"/>
          <stop offset="100%" stop-color="#334155"/>
        </linearGradient>
        <linearGradient id="goldCanopy" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#d97706"/>
          <stop offset="50%" stop-color="#fcd34d"/>
          <stop offset="100%" stop-color="#f59e0b"/>
        </linearGradient>
      </defs>
      <!-- Authentic F-22/F-35 diamond cropped delta planform -->
      <polygon points="90,48 70,41 56,37 37,11 26,11 31,37 19,35 12,21 5,21 9,39 12,42 12,54 9,57 5,75 12,75 19,61 31,59 26,85 37,85 56,59 70,55" fill="url(#f22Body)" stroke="#090f1a" stroke-width="2.2" stroke-linejoin="round"/>
      <!-- Leading edge & panel seams -->
      <polygon points="68,42 38,15 33,38 55,41" fill="#475569" opacity="0.45"/>
      <polygon points="68,54 38,81 33,58 55,55" fill="#1e293b" opacity="0.45"/>
      <!-- Twin canted vertical tails -->
      <polygon points="24,36 10,27 12,38 25,41" fill="#334155" stroke="#090f1a" stroke-width="1.3"/>
      <polygon points="24,60 10,69 12,58 25,55" fill="#334155" stroke="#090f1a" stroke-width="1.3"/>
      <!-- Twin thrust-vectoring exhaust nozzles & afterburner -->
      <rect x="8" y="42" width="7" height="5" rx="1" fill="#1e293b" stroke="#090f1a" stroke-width="1.1"/>
      <rect x="8" y="49" width="7" height="5" rx="1" fill="#1e293b" stroke="#090f1a" stroke-width="1.1"/>
      <circle cx="8" cy="44.5" r="2.1" fill="#f97316"/>
      <circle cx="8" cy="51.5" r="2.1" fill="#f97316"/>
      <!-- Chined Nose Radome & Gold Stealth Canopy -->
      <polygon points="72,44 88,48 72,52" fill="#475569"/>
      <ellipse cx="61" cy="48" rx="12" ry="4.2" fill="url(#goldCanopy)" stroke="#090f1a" stroke-width="1.5"/>
      <line x1="20" y1="48" x2="48" y2="48" stroke="#cbd5e1" stroke-width="1.2" opacity="0.6"/>
    </svg>`
  ),

  f16_falcon: defineUnit(
    'f16_falcon',
    'مقاتلة (F-16 فالكون)',
    '_air',
    { speed: 225, turnRate: 3.6, scale: 52, radius: 22 },
    {
      mode: 'airstrike',
      label: 'قصف تكتيكي',
      shortLabel: 'قصف جوي',
      category: 'air',
      accentColor: '#0ea5e9',
      radius: 60
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 92 92">
      <!-- Wingtip AIM-9 Sidewinder missiles -->
      <rect x="26" y="11" width="18" height="2.4" rx="1" fill="#f8fafc" stroke="#090f1a" stroke-width="0.9"/>
      <rect x="26" y="78.6" width="18" height="2.4" rx="1" fill="#f8fafc" stroke="#090f1a" stroke-width="0.9"/>
      <!-- Authentic F-16 Cropped Delta Wing & Forebody Strakes -->
      <polygon points="86,46 66,41 53,39 34,13 26,13 28,39 18,37 11,26 6,26 10,41 10,51 6,66 11,66 18,55 28,53 26,79 34,79 53,53 66,51" fill="#94a3b8" stroke="#090f1a" stroke-width="2.1" stroke-linejoin="round"/>
      <!-- Underwing fuel/ordnance pylons -->
      <rect x="33" y="25" width="12" height="3.2" rx="1.2" fill="#cbd5e1" stroke="#090f1a" stroke-width="0.9"/>
      <rect x="33" y="63.8" width="12" height="3.2" rx="1.2" fill="#cbd5e1" stroke="#090f1a" stroke-width="0.9"/>
      <!-- Single Tail Spine & Nozzle -->
      <rect x="6" y="42.5" width="7" height="7" rx="1.5" fill="#1e293b" stroke="#090f1a" stroke-width="1.2"/>
      <circle cx="6" cy="46" r="2.4" fill="#f97316"/>
      <polygon points="10,46 28,43 28,49" fill="#334155" stroke="#090f1a" stroke-width="1"/>
      <!-- Bubble Canopy & Nose -->
      <polygon points="71,43 85,46 71,49" fill="#334155"/>
      <ellipse cx="59" cy="46" rx="11.5" ry="3.8" fill="#38bdf8" stroke="#090f1a" stroke-width="1.4"/>
    </svg>`
  ),

  b2_bomber: defineUnit(
    'b2_bomber',
    'قاذفة شبح (B-2 Spirit)',
    '_air',
    { speed: 175, turnRate: 2.2, scale: 68, radius: 29 },
    {
      mode: 'airstrike',
      label: 'قصف استراتيجي',
      shortLabel: 'قصف ثقيل',
      category: 'air',
      accentColor: '#f43f5e',
      radius: 95
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <defs>
        <linearGradient id="b2Real" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#475569"/>
          <stop offset="50%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <!-- Authentic Northrop B-2 Flying Wing W-Sawtooth Trailing Edge -->
      <polygon points="82,48 37,6 22,18 35,32 21,41 33,48 21,55 35,64 22,78 37,90" fill="url(#b2Real)" stroke="#020617" stroke-width="2.5" stroke-linejoin="round"/>
      <!-- Blended Center Fuselage & Twin Recessed Engine Nacelles -->
      <polygon points="72,48 47,34 32,48 47,62" fill="#334155" opacity="0.72"/>
      <polygon points="53,37 36,28 30,34 49,40" fill="#0f172a" stroke="#475569" stroke-width="0.9"/>
      <polygon points="53,59 36,68 30,62 49,56" fill="#0f172a" stroke="#475569" stroke-width="0.9"/>
      <!-- Split 4-pane Cockpit Windshield -->
      <polygon points="69,48 62,42 57,45 62,48 57,51 62,54" fill="#38bdf8" stroke="#090f1a" stroke-width="1.2"/>
      <path d="M55 22 L41 44 M55 74 L41 52" stroke="#64748b" stroke-width="1" opacity="0.45"/>
    </svg>`
  ),

  apache_heli: defineUnit(
    'apache_heli',
    'مروحية أباتشي (AH-64)',
    '_heli',
    { speed: 148, turnRate: 3.9, scale: 56, radius: 24 },
    {
      mode: 'interceptor',
      label: 'صواريخ هيلفاير',
      shortLabel: 'هيلفاير',
      category: 'air',
      accentColor: '#fb923c',
      radius: 44
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 88">
      <!-- Tail boom & T-stabilizer -->
      <polygon points="10,41 38,39 38,49 10,47" fill="#3f4a3c" stroke="#090f1a" stroke-width="2"/>
      <rect x="8" y="32" width="5.5" height="24" rx="1.5" fill="#334155" stroke="#090f1a" stroke-width="1.5"/>
      <!-- Stub Wings + 4x Hellfire Racks & Rocket Pods -->
      <polygon points="44,18 53,20 53,68 44,70 39,61 39,27" fill="#4d5d43" stroke="#090f1a" stroke-width="2"/>
      <rect x="44" y="16" width="13" height="5" rx="1.5" fill="#1e293b" stroke="#090f1a" stroke-width="1.2"/>
      <rect x="44" y="67" width="13" height="5" rx="1.5" fill="#1e293b" stroke="#090f1a" stroke-width="1.2"/>
      <rect x="46" y="25" width="10" height="4.5" rx="1" fill="#334155" stroke="#090f1a" stroke-width="1"/>
      <rect x="46" y="58.5" width="10" height="4.5" rx="1" fill="#334155" stroke="#090f1a" stroke-width="1"/>
      <!-- Twin T700 Engine Nacelles & Slender Fuselage -->
      <ellipse cx="48" cy="38" rx="10" ry="3.5" fill="#334155" stroke="#090f1a" stroke-width="1.4"/>
      <ellipse cx="48" cy="50" rx="10" ry="3.5" fill="#334155" stroke="#090f1a" stroke-width="1.4"/>
      <path d="M32 39 C40 35 64 35 74 44 C64 53 40 53 32 49 Z" fill="#4b5563" stroke="#090f1a" stroke-width="2.2"/>
      <!-- Tandem Canopy + Nose TADS/PNVS Sensor -->
      <ellipse cx="62" cy="44" rx="8.5" ry="3.6" fill="#38bdf8" stroke="#090f1a" stroke-width="1.3"/>
      <circle cx="75" cy="44" r="3.2" fill="#1e293b" stroke="#94a3b8" stroke-width="1.1"/>
      <circle cx="44" cy="44" r="3.5" fill="#1e293b" stroke="#cbd5e1" stroke-width="1.2"/>
    </svg>`
  ),

  reaper_drone: defineUnit(
    'reaper_drone',
    'طائرة مسيّرة (MQ-9/بيرقدار)',
    '_air',
    { speed: 165, turnRate: 3.1, scale: 54, radius: 22 },
    {
      mode: 'airstrike',
      label: 'ضربة مسيّرة',
      shortLabel: 'مسيّرة',
      category: 'air',
      accentColor: '#a855f7',
      radius: 46
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <!-- High-aspect ratio long slender MALE UAV wings -->
      <polygon points="52,44 41,5 36,5 40,44 40,52 36,91 41,91 52,52" fill="#cbd5e1" stroke="#090f1a" stroke-width="2" stroke-linejoin="round"/>
      <!-- Underwing guided munitions -->
      <rect x="40" y="29" width="11" height="2.6" rx="1" fill="#334155" stroke="#090f1a" stroke-width="0.8"/>
      <rect x="40" y="64.4" width="11" height="2.6" rx="1" fill="#334155" stroke="#090f1a" stroke-width="0.8"/>
      <!-- V-Tail -->
      <polygon points="18,45 9,33 14,33 23,46 23,50 14,63 9,63 18,51" fill="#94a3b8" stroke="#090f1a" stroke-width="1.6"/>
      <!-- Slender fuselage & Bulbous SATCOM Nose -->
      <path d="M16 46 L68 44 C82 44 86 48 86 48 C86 48 82 52 68 52 L16 50 Z" fill="#e2e8f0" stroke="#090f1a" stroke-width="2"/>
      <ellipse cx="73" cy="48" rx="8" ry="3.6" fill="#94a3b8" stroke="#090f1a" stroke-width="1.1"/>
      <!-- EO/IR Sensor Ball & Rear Pusher Propeller -->
      <circle cx="62" cy="48" r="2.2" fill="#38bdf8"/>
      <rect x="13" y="42" width="2.2" height="12" rx="1" fill="#1e293b"/>
    </svg>`
  ),

  // ==========================================
  // 4. الأسطول البحري (Authentic Naval Fleet)
  // ==========================================
};
