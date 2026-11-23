// الوحدات البرية: المشاة والآليات والمنشآت الميدانية
import { ActorPack } from '../../core/types';
import { defineUnit } from './shared';

export const STUDIO_LAND_UNITS: Record<string, ActorPack> = {
  // ==========================================
  // 1. المشاة والقيادة (Infantry & Personnel)
  // ==========================================
  infantry_squad: defineUnit(
    'infantry_squad',
    'فرقة مشاة',
    '_person',
    { speed: 64, scale: 40, radius: 16 },
    {
      mode: 'bullet',
      label: 'إطلاق رصاص',
      shortLabel: 'رصاص',
      category: 'infantry',
      accentColor: '#f59e0b',
      radius: 16
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
      <defs>
        <linearGradient id="vestG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#65a30d"/>
          <stop offset="100%" stop-color="#365314"/>
        </linearGradient>
        <linearGradient id="helmG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#84cc16"/>
          <stop offset="100%" stop-color="#3f6212"/>
        </linearGradient>
      </defs>
      <!-- Shadow base -->
      <ellipse cx="40" cy="64" rx="26" ry="8" fill="#090f1a" opacity="0.45"/>
      <!-- Left rifleman -->
      <g stroke="#090f1a" stroke-width="2" stroke-linejoin="round">
        <rect x="13" y="42" width="16" height="17" rx="5" fill="url(#vestG)"/>
        <circle cx="21" cy="34" r="7.5" fill="url(#helmG)"/>
        <path d="M14.5 34 C16 29 26 29 27.5 34 Z" fill="#4d7c0f"/>
        <rect x="23" y="45" width="16" height="3.2" rx="1" fill="#1e293b" transform="rotate(-18 23 45)"/>
      </g>
      <!-- Right rifleman -->
      <g stroke="#090f1a" stroke-width="2" stroke-linejoin="round">
        <rect x="51" y="42" width="16" height="17" rx="5" fill="url(#vestG)"/>
        <circle cx="59" cy="34" r="7.5" fill="url(#helmG)"/>
        <path d="M52.5 34 C54 29 64 29 65.5 34 Z" fill="#4d7c0f"/>
        <rect x="46" y="45" width="16" height="3.2" rx="1" fill="#1e293b" transform="rotate(-18 46 45)"/>
      </g>
      <!-- Point Squad Leader (front center) -->
      <g stroke="#090f1a" stroke-width="2.2" stroke-linejoin="round">
        <rect x="30" y="29" width="20" height="22" rx="6" fill="url(#vestG)"/>
        <rect x="34" y="34" width="12" height="10" rx="2" fill="#4d7c0f" stroke-width="1.2"/>
        <circle cx="40" cy="20" r="8.8" fill="#f3d1a4"/>
        <!-- Tactical Helmet + Goggles -->
        <path d="M30.5 21 C30.5 11.5 49.5 11.5 49.5 21 C46 18.5 34 18.5 30.5 21 Z" fill="url(#helmG)"/>
        <rect x="33" y="15" width="14" height="3.8" rx="1.5" fill="#0f172a"/>
        <rect x="34.5" y="16" width="4.5" height="2" rx="0.5" fill="#38bdf8" stroke="none"/>
        <rect x="41" y="16" width="4.5" height="2" rx="0.5" fill="#38bdf8" stroke="none"/>
        <!-- Assault Rifle -->
        <rect x="43" y="34" width="22" height="4" rx="1.2" fill="#0f172a" transform="rotate(-20 43 34)"/>
        <rect x="55" y="29" width="7" height="2.2" fill="#64748b" stroke="none" transform="rotate(-20 43 34)"/>
      </g>
    </svg>`
  ),

  special_forces: defineUnit(
    'special_forces',
    'قوات خاصة',
    '_person',
    { speed: 74, scale: 40, radius: 16 },
    {
      mode: 'bullet',
      label: 'رشق دقيق',
      shortLabel: 'قنص/رشق',
      category: 'infantry',
      accentColor: '#38bdf8',
      radius: 15
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
      <ellipse cx="40" cy="64" rx="22" ry="7.5" fill="#090f1a" opacity="0.5"/>
      <g stroke="#090f1a" stroke-width="2" stroke-linejoin="round">
        <!-- Rear Operator -->
        <rect x="16" y="38" width="18" height="20" rx="5" fill="#1e293b"/>
        <circle cx="25" cy="28" r="8" fill="#334155"/>
        <rect x="20" y="22" width="10" height="4" rx="1.5" fill="#0284c7"/>
        <line x1="27" y1="43" x2="44" y2="35" stroke="#0f172a" stroke-width="3.6" stroke-linecap="round"/>
        <!-- Lead Operator with Quad-NVG & Suppressed Carbine -->
        <rect x="36" y="30" width="22" height="24" rx="6" fill="#0f172a"/>
        <rect x="41" y="35" width="12" height="12" rx="2" fill="#334155" stroke-width="1.3"/>
        <circle cx="47" cy="20" r="8.8" fill="#1e293b"/>
        <path d="M38 19 C39 10 55 10 56 19 Z" fill="#334155"/>
        <!-- Quad NVG lenses -->
        <circle cx="42" cy="17" r="2.2" fill="#22d3ee"/>
        <circle cx="46" cy="16.5" r="2.2" fill="#22d3ee"/>
        <circle cx="50" cy="16.5" r="2.2" fill="#22d3ee"/>
        <circle cx="54" cy="17" r="2.2" fill="#22d3ee"/>
        <!-- Suppressed rifle -->
        <rect x="48" y="35" width="22" height="4" rx="1.2" fill="#334155" transform="rotate(-14 48 35)"/>
        <rect x="65" y="34.5" width="9" height="4.8" rx="1.5" fill="#475569" transform="rotate(-14 48 35)"/>
      </g>
    </svg>`
  ),

  diplomat_envoy: defineUnit(
    'diplomat_envoy',
    'وفد دبلوماسي',
    '_person',
    { speed: 58, scale: 38, radius: 15 },
    {
      mode: 'scan',
      label: 'بيان / إشارة',
      shortLabel: 'بيان',
      category: 'infantry',
      accentColor: '#a855f7',
      radius: 90
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
      <defs>
        <linearGradient id="envoySuit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#020617"/>
        </linearGradient>
      </defs>
      <ellipse cx="40" cy="66" rx="20" ry="7" fill="#090f1a" opacity="0.45"/>
      <circle cx="40" cy="22" r="10.5" fill="#f3d1a4" stroke="#090f1a" stroke-width="2.4"/>
      <path d="M30 19 C32 10 48 10 50 19 C45 16 35 16 30 19 Z" fill="#1e293b"/>
      <path d="M20 62 C20 40 27 34 40 34 C53 34 60 40 60 62 Z" fill="url(#envoySuit)" stroke="#090f1a" stroke-width="2.4" stroke-linejoin="round"/>
      <polygon points="34,34 40,48 46,34" fill="#f8fafc"/>
      <polygon points="38.2,35 40,49 41.8,35" fill="#dc2626"/>
      <rect x="52" y="48" width="15" height="11" rx="2" fill="#92400e" stroke="#090f1a" stroke-width="2"/>
      <rect x="57" y="45" width="5" height="3" fill="none" stroke="#f59e0b" stroke-width="1.5"/>
    </svg>`
  ),

  // ==========================================
  // 2. المدرعات والمدفعية والصواريخ (Armor & Artillery)
  // ==========================================
  mbt_tank: defineUnit(
    'mbt_tank',
    'دبابة قتال (أبرامز)',
    '_vehicle',
    { speed: 82, turnRate: 2.6, scale: 50, radius: 22 },
    {
      mode: 'shell',
      label: 'قذيفة مدفع',
      shortLabel: 'قذيفة',
      category: 'armor',
      accentColor: '#f97316',
      radius: 36
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 80">
      <defs>
        <linearGradient id="abramsHull" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#a89060"/>
          <stop offset="55%" stop-color="#c2a974"/>
          <stop offset="100%" stop-color="#8c7548"/>
        </linearGradient>
        <linearGradient id="abramsTurret" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#d6be8a"/>
          <stop offset="100%" stop-color="#967f52"/>
        </linearGradient>
      </defs>
      <!-- Heavy Armored Tracks & Skirts -->
      <rect x="10" y="12" width="60" height="12" rx="3" fill="#1e293b" stroke="#090f1a" stroke-width="2.2"/>
      <rect x="10" y="56" width="60" height="12" rx="3" fill="#1e293b" stroke="#090f1a" stroke-width="2.2"/>
      <path d="M16 12 V24 M24 12 V24 M32 12 V24 M40 12 V24 M48 12 V24 M56 12 V24 M64 12 V24 M16 56 V68 M24 56 V68 M32 56 V68 M40 56 V68 M48 56 V68 M56 56 V68 M64 56 V68" stroke="#0f172a" stroke-width="1.6"/>
      <!-- Side Armor Skirts -->
      <rect x="12" y="16" width="57" height="7" rx="1.5" fill="#9c8556" stroke="#090f1a" stroke-width="1.4"/>
      <rect x="12" y="57" width="57" height="7" rx="1.5" fill="#9c8556" stroke="#090f1a" stroke-width="1.4"/>
      <!-- Main Hull & Rear Turbine Grilles -->
      <rect x="13" y="21" width="55" height="38" rx="3" fill="url(#abramsHull)" stroke="#090f1a" stroke-width="2.2"/>
      <rect x="15" y="25" width="14" height="30" rx="2" fill="#44403c" stroke="#090f1a" stroke-width="1.2"/>
      <path d="M18 27 V53 M21 27 V53 M24 27 V53 M27 27 V53" stroke="#78716c" stroke-width="1.2"/>
      <!-- Sloped Front Glacis & Headlights -->
      <polygon points="56,22 68,25 68,55 56,58" fill="#b39b66" stroke="#090f1a" stroke-width="1.4"/>
      <rect x="65" y="23" width="3" height="4.5" fill="#fef08a"/>
      <rect x="65" y="52.5" width="3" height="4.5" fill="#fef08a"/>
      <!-- 120mm M256 Smoothbore Cannon -->
      <rect x="48" y="37.8" width="44" height="4.4" rx="1" fill="#9c8556" stroke="#090f1a" stroke-width="1.6"/>
      <rect x="62" y="36.3" width="9" height="7.4" rx="1.8" fill="#b39b66" stroke="#090f1a" stroke-width="1.4"/>
      <rect x="88" y="37" width="4" height="6" rx="1" fill="#334155" stroke="#090f1a" stroke-width="1.2"/>
      <!-- Angular Wedge Turret -->
      <polygon points="18,26 42,22 57,31 57,49 42,58 18,54" fill="url(#abramsTurret)" stroke="#090f1a" stroke-width="2.2" stroke-linejoin="round"/>
      <!-- Bustle Rack, Cupola, CROWS & Thermal Optics -->
      <rect x="18" y="29" width="8" height="22" fill="#57534e" stroke="#090f1a" stroke-width="1.2"/>
      <circle cx="38" cy="33" r="4.8" fill="#8c7548" stroke="#090f1a" stroke-width="1.5"/>
      <circle cx="38" cy="47" r="4.2" fill="#8c7548" stroke="#090f1a" stroke-width="1.5"/>
      <rect x="46" y="29" width="5" height="4" rx="1" fill="#38bdf8" stroke="#090f1a" stroke-width="1"/>
      <line x1="22" y1="29" x2="10" y2="23" stroke="#090f1a" stroke-width="1.3"/>
    </svg>`
  ),

  ifv_bradley: defineUnit(
    'ifv_bradley',
    'مدرعة قتالية (برادلي)',
    '_vehicle',
    { speed: 96, turnRate: 3.1, scale: 46, radius: 20 },
    {
      mode: 'bullet',
      label: 'مدفع رشاش 25مم',
      shortLabel: 'رشاش',
      category: 'armor',
      accentColor: '#eab308',
      radius: 18
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 76">
      <defs>
        <linearGradient id="ifvBody" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#4d5d43"/>
          <stop offset="100%" stop-color="#6b7e5c"/>
        </linearGradient>
      </defs>
      <rect x="11" y="13" width="58" height="10" rx="2.5" fill="#1e293b" stroke="#090f1a" stroke-width="2"/>
      <rect x="11" y="53" width="58" height="10" rx="2.5" fill="#1e293b" stroke="#090f1a" stroke-width="2"/>
      <rect x="12" y="19" width="56" height="38" rx="4" fill="url(#ifvBody)" stroke="#090f1a" stroke-width="2.2"/>
      <!-- Rear Troop Hatch & Side ERA tiles -->
      <rect x="14" y="25" width="12" height="26" rx="2" fill="#3b4733" stroke="#090f1a" stroke-width="1.3"/>
      <rect x="28" y="20" width="32" height="3" fill="#7c906d" stroke="#090f1a" stroke-width="0.9"/>
      <rect x="28" y="53" width="32" height="3" fill="#7c906d" stroke="#090f1a" stroke-width="0.9"/>
      <!-- 25mm Bushmaster Autocannon -->
      <rect x="46" y="36.5" width="36" height="3" rx="1" fill="#334155" stroke="#090f1a" stroke-width="1.3"/>
      <!-- Turret + Twin TOW Launcher Box -->
      <polygon points="30,27 49,26 55,34 55,42 49,50 30,49" fill="#5e7050" stroke="#090f1a" stroke-width="2"/>
      <rect x="33" y="22" width="14" height="6" rx="1.5" fill="#3f4c36" stroke="#090f1a" stroke-width="1.4"/>
      <circle cx="40" cy="38" r="4.5" fill="#46543c" stroke="#090f1a" stroke-width="1.4"/>
      <rect x="48" y="31" width="4" height="3" fill="#38bdf8"/>
    </svg>`
  ),

  spg_artillery: defineUnit(
    'spg_artillery',
    'مدفعية ذاتية (155مم)',
    '_vehicle',
    { speed: 68, turnRate: 2.2, scale: 52, radius: 22 },
    {
      mode: 'artillery',
      label: 'قصف مدفعي',
      shortLabel: 'مدفعية',
      category: 'armor',
      accentColor: '#fb923c',
      radius: 58
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 104 80">
      <rect x="10" y="14" width="58" height="10" rx="2.5" fill="#1e293b" stroke="#090f1a" stroke-width="2"/>
      <rect x="10" y="56" width="58" height="10" rx="2.5" fill="#1e293b" stroke="#090f1a" stroke-width="2"/>
      <!-- Hull + Rear Recoil Spades -->
      <rect x="6" y="24" width="7" height="10" rx="1" fill="#334155" stroke="#090f1a" stroke-width="1.4"/>
      <rect x="6" y="46" width="7" height="10" rx="1" fill="#334155" stroke="#090f1a" stroke-width="1.4"/>
      <rect x="12" y="20" width="56" height="40" rx="3.5" fill="#5c6b50" stroke="#090f1a" stroke-width="2.2"/>
      <!-- Driver Cab + Engine Grilles -->
      <rect x="52" y="23" width="13" height="13" rx="2" fill="#475569" stroke="#090f1a" stroke-width="1.3"/>
      <rect x="58" y="25" width="4" height="9" fill="#38bdf8"/>
      <!-- Long 155mm Howitzer Barrel & Muzzle Brake -->
      <rect x="44" y="37.5" width="52" height="5" rx="1" fill="#475569" stroke="#090f1a" stroke-width="1.6"/>
      <rect x="92" y="35.5" width="7" height="9" rx="1.5" fill="#334155" stroke="#090f1a" stroke-width="1.4"/>
      <!-- Large Rear Howitzer Turret -->
      <rect x="15" y="24" width="32" height="32" rx="4" fill="#708261" stroke="#090f1a" stroke-width="2.2"/>
      <rect x="17" y="29" width="8" height="22" fill="#46523d" stroke="#090f1a" stroke-width="1.2"/>
      <circle cx="33" cy="34" r="4" fill="#3f4a37" stroke="#090f1a" stroke-width="1.3"/>
      <circle cx="33" cy="46" r="4" fill="#3f4a37" stroke="#090f1a" stroke-width="1.3"/>
    </svg>`
  ),

  sam_patriot: defineUnit(
    'sam_patriot',
    'دفاع جوي (باتريوت)',
    '_vehicle',
    { speed: 66, turnRate: 2.1, scale: 52, radius: 22 },
    {
      mode: 'interceptor',
      label: 'صاروخ اعتراضي',
      shortLabel: 'اعتراض',
      category: 'armor',
      accentColor: '#38bdf8',
      radius: 42
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 72">
      <!-- Wheels -->
      <g fill="#0f172a" stroke="#020617" stroke-width="1.2">
        <rect x="12" y="10" width="12" height="5" rx="1.5"/><rect x="34" y="10" width="12" height="5" rx="1.5"/><rect x="66" y="10" width="12" height="5" rx="1.5"/>
        <rect x="12" y="57" width="12" height="5" rx="1.5"/><rect x="34" y="57" width="12" height="5" rx="1.5"/><rect x="66" y="57" width="12" height="5" rx="1.5"/>
      </g>
      <!-- Tractor & Semi-trailer -->
      <rect x="60" y="15" width="24" height="42" rx="4" fill="#64748b" stroke="#090f1a" stroke-width="2"/>
      <rect x="76" y="19" width="5" height="34" rx="1" fill="#38bdf8" stroke="#090f1a" stroke-width="1.1"/>
      <rect x="9" y="16" width="49" height="40" rx="3" fill="#475569" stroke="#090f1a" stroke-width="2"/>
      <!-- 4 Patriot Interceptor Canisters -->
      <rect x="14" y="19" width="38" height="7" rx="1.5" fill="#94a3b8" stroke="#090f1a" stroke-width="1.4"/>
      <rect x="14" y="28" width="38" height="7" rx="1.5" fill="#cbd5e1" stroke="#090f1a" stroke-width="1.4"/>
      <rect x="14" y="37" width="38" height="7" rx="1.5" fill="#cbd5e1" stroke="#090f1a" stroke-width="1.4"/>
      <rect x="14" y="46" width="38" height="7" rx="1.5" fill="#94a3b8" stroke="#090f1a" stroke-width="1.4"/>
      <!-- Nose Caps & Phased Array Radar -->
      <line x1="48" y1="19" x2="48" y2="53" stroke="#38bdf8" stroke-width="2"/>
      <rect x="52" y="27" width="8" height="18" rx="2" fill="#0284c7" stroke="#090f1a" stroke-width="1.3"/>
    </svg>`
  ),

  ballistic_tel: defineUnit(
    'ballistic_tel',
    'راجمة صواريخ بالستية',
    '_vehicle',
    { speed: 62, turnRate: 2.0, scale: 58, radius: 25 },
    {
      mode: 'missile',
      label: 'إطلاق صاروخ بالستي',
      shortLabel: 'صاروخ بالستي',
      category: 'armor',
      accentColor: '#ef4444',
      radius: 82
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 104 68">
      <defs>
        <linearGradient id="telHullG" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#374151"/>
          <stop offset="100%" stop-color="#4b5563"/>
        </linearGradient>
        <linearGradient id="icbmBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f8fafc"/>
          <stop offset="55%" stop-color="#cbd5e1"/>
          <stop offset="100%" stop-color="#64748b"/>
        </linearGradient>
      </defs>
      <!-- 8x8 Heavy Off-road Tires -->
      <g fill="#0f172a" stroke="#020617" stroke-width="1.3">
        <rect x="10" y="9" width="13" height="6" rx="1.5"/><rect x="29" y="9" width="13" height="6" rx="1.5"/>
        <rect x="49" y="9" width="13" height="6" rx="1.5"/><rect x="70" y="9" width="13" height="6" rx="1.5"/>
        <rect x="10" y="53" width="13" height="6" rx="1.5"/><rect x="29" y="53" width="13" height="6" rx="1.5"/>
        <rect x="49" y="53" width="13" height="6" rx="1.5"/><rect x="70" y="53" width="13" height="6" rx="1.5"/>
      </g>
      <!-- 8x8 Chassis -->
      <rect x="8" y="14" width="84" height="40" rx="4" fill="url(#telHullG)" stroke="#090f1a" stroke-width="2.3"/>
      <!-- Twin Armored Forward Cab -->
      <rect x="70" y="16" width="20" height="14" rx="2.5" fill="#525f50" stroke="#090f1a" stroke-width="1.6"/>
      <rect x="70" y="38" width="20" height="14" rx="2.5" fill="#525f50" stroke="#090f1a" stroke-width="1.6"/>
      <rect x="82" y="18" width="4.5" height="10" rx="1" fill="#38bdf8"/>
      <rect x="82" y="40" width="4.5" height="10" rx="1" fill="#38bdf8"/>
      <!-- Launch Cradle -->
      <rect x="12" y="22" width="58" height="24" rx="3" fill="#1e293b" stroke="#090f1a" stroke-width="1.6"/>
      <!-- Ballistic Missile -->
      <polygon points="9,21 19,25 19,43 9,47 13,34" fill="#475569" stroke="#090f1a" stroke-width="1.4"/>
      <rect x="15" y="26" width="58" height="16" rx="2.5" fill="url(#icbmBody)" stroke="#090f1a" stroke-width="1.8"/>
      <rect x="36" y="26" width="4.5" height="16" fill="#334155"/>
      <rect x="57" y="26" width="3.5" height="16" fill="#dc2626"/>
      <path d="M73 26 L94 34 L73 42 Z" fill="#dc2626" stroke="#090f1a" stroke-width="1.7" stroke-linejoin="round"/>
      <line x1="23" y1="34" x2="70" y2="34" stroke="#94a3b8" stroke-width="1.2" opacity="0.65"/>
    </svg>`
  ),

  supply_convoy: defineUnit(
    'supply_convoy',
    'قافلة إمداد',
    '_vehicle',
    { speed: 92, turnRate: 2.9, scale: 46, radius: 19 },
    {
      mode: 'scan',
      label: 'نقطة إمداد',
      shortLabel: 'إمداد',
      category: 'armor',
      accentColor: '#10b981',
      radius: 75
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 64">
      <g fill="#0f172a" stroke="#020617" stroke-width="1.2">
        <rect x="14" y="10" width="11" height="5" rx="1.5"/><rect x="33" y="10" width="11" height="5" rx="1.5"/><rect x="59" y="10" width="11" height="5" rx="1.5"/>
        <rect x="14" y="49" width="11" height="5" rx="1.5"/><rect x="33" y="49" width="11" height="5" rx="1.5"/><rect x="59" y="49" width="11" height="5" rx="1.5"/>
      </g>
      <!-- Armored Cab -->
      <rect x="54" y="15" width="22" height="34" rx="4" fill="#8b7355" stroke="#090f1a" stroke-width="2"/>
      <rect x="68" y="19" width="5" height="26" rx="1.2" fill="#38bdf8" stroke="#090f1a" stroke-width="1"/>
      <!-- Canvas Cargo Bed -->
      <rect x="10" y="14" width="43" height="36" rx="3" fill="#a38a68" stroke="#090f1a" stroke-width="2.2"/>
      <path d="M18 14 V50 M27 14 V50 M36 14 V50 M45 14 V50" stroke="#756146" stroke-width="1.8"/>
      <rect x="24" y="25" width="14" height="14" rx="2" fill="#10b981" stroke="#090f1a" stroke-width="1.3"/>
      <path d="M31 28 V36 M27 32 H35" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
    </svg>`
  ),

  tactical_pickup: defineUnit(
    'tactical_pickup',
    'مركبة عسكرية تكتيكية',
    '_vehicle',
    { speed: 108, turnRate: 3.4, scale: 54, radius: 20 },
    {
      mode: 'bullet',
      label: 'رشاش تكتيكي',
      shortLabel: 'رشاش',
      category: 'armor',
      accentColor: '#f59e0b',
      radius: 18
    },
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <defs>
    <linearGradient id="bodyBeige" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#E6D5B8"/>
      <stop offset="50%" stop-color="#D7C29E"/>
      <stop offset="100%" stop-color="#BFA780"/>
    </linearGradient>
    <linearGradient id="hoodWhite" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#E5E7EB"/>
    </linearGradient>
    <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4B5563"/>
      <stop offset="45%" stop-color="#1F2937"/>
      <stop offset="100%" stop-color="#111827"/>
    </linearGradient>
    <linearGradient id="chromeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#F9FAFB"/>
      <stop offset="45%" stop-color="#D1D5DB"/>
      <stop offset="55%" stop-color="#6B7280"/>
      <stop offset="100%" stop-color="#E5E7EB"/>
    </linearGradient>
    <radialGradient id="groundShadow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.55"/>
      <stop offset="70%" stop-color="#000000" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="tireGrad" cx="50%" cy="50%" r="50%">
      <stop offset="65%" stop-color="#1F2937"/>
      <stop offset="88%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#030712"/>
    </radialGradient>
  </defs>

  <ellipse cx="415" cy="395" rx="345" ry="22" fill="url(#groundShadow)"/>

  <path d="M130,320 L660,310 L650,335 L140,345 Z" fill="#111827"/>
  <rect x="420" y="315" width="110" height="12" rx="4" fill="#374151"/>

  <g transform="translate(495, 315)">
    <ellipse cx="0" cy="0" rx="36" ry="44" fill="#111827"/>
    <ellipse cx="2" cy="0" rx="18" ry="22" fill="#4B5563"/>
  </g>

  <g transform="translate(135, 330)">
    <ellipse cx="0" cy="0" rx="46" ry="54" fill="#111827"/>
    <ellipse cx="-2" cy="0" rx="22" ry="28" fill="#374151"/>
  </g>

  <g id="cargo-bed">
    <polygon points="575,205 745,212 745,225 575,220" fill="#B89F78"/>
    <path d="M575,205 L752,212 L755,222 L750,278 L715,280 L695,258 L652,258 L632,288 L575,292 Z" fill="url(#bodyBeige)" stroke="#8C7350" stroke-width="1.2"/>
    <path d="M575,205 L754,212 L754,218 L575,212 Z" fill="#EDE0C9"/>
    <line x1="578" y1="232" x2="748" y2="236" stroke="#9E845E" stroke-width="1.5"/>
    <path d="M582,240 L745,242 L738,247 L582,245 Z" fill="#292524"/>
    <path d="M590,247 L710,248 L695,252 L590,251 Z" fill="#7F1D1D"/>
    <path d="M620,253 L680,253 L670,256 L620,256 Z" fill="#B45309"/>
    <rect x="720" y="276" width="44" height="11" rx="2" fill="#1F2937"/>
    <polygon points="712,280 726,280 724,315 710,315" fill="#111827"/>
  </g>

  <path d="M565,138 Q578,138 580,155 L592,208 L582,208 L571,155 Q569,146 562,146 Z" fill="#D7C29E" stroke="#8C7350" stroke-width="1"/>

  <g id="cabin">
    <path d="M315,136 L555,135 Q566,136 568,148 L578,295 L425,305 L285,305 L285,212 Z" fill="url(#bodyBeige)" stroke="#8C7350" stroke-width="1.2"/>
    <path d="M318,135 L554,134 Q563,135 565,142 L314,143 Z" fill="url(#hoodWhite)"/>

    <polygon points="318,146 472,146 452,206 278,206" fill="url(#glassGrad)" stroke="#111827" stroke-width="3"/>
    <polygon points="325,150 375,150 345,202 290,202" fill="#FFFFFF" opacity="0.12"/>
    <rect x="412" y="155" width="26" height="36" rx="1" fill="#F3F4F6" opacity="0.9"/>
    <rect x="355" y="160" width="28" height="14" rx="1" fill="#E5E7EB" opacity="0.85"/>
    <line x1="315" y1="205" x2="375" y2="198" stroke="#111827" stroke-width="3" stroke-linecap="round"/>
    <line x1="395" y1="205" x2="450" y2="198" stroke="#111827" stroke-width="3" stroke-linecap="round"/>

    <path d="M482,146 L554,146 L562,212 L564,292 L458,298 L458,212 Z" fill="none" stroke="#786242" stroke-width="1.5"/>
    <polygon points="486,151 548,151 555,208 468,208" fill="url(#glassGrad)" stroke="#1F2937" stroke-width="2.5"/>
    <polygon points="490,154 522,154 505,205 474,205" fill="#FFFFFF" opacity="0.14"/>

    <rect x="536" y="226" width="20" height="7" rx="2" fill="url(#chromeGrad)" stroke="#4B5563" stroke-width="0.8"/>

    <g id="side-mirror">
      <path d="M475,212 L488,212 L492,226 L478,226 Z" fill="#111827"/>
      <rect x="488" y="184" width="26" height="32" rx="4" fill="url(#chromeGrad)" stroke="#374151" stroke-width="1.2"/>
      <rect x="491" y="187" width="8" height="26" rx="2" fill="#FFFFFF" opacity="0.6"/>
    </g>

    <path d="M425,302 L568,295 L565,305 L425,313 Z" fill="url(#chromeGrad)" stroke="#4B5563" stroke-width="0.8"/>
  </g>

  <g id="front-end">
    <path d="M72,232 L278,206 L458,212 L458,298 L412,302 L385,268 L335,268 L305,308 L72,285 Z" fill="url(#bodyBeige)" stroke="#8C7350" stroke-width="1.2"/>
    <path d="M76,231 L278,206 L445,212 L422,225 L255,222 L72,236 Z" fill="url(#hoodWhite)"/>

    <path d="M72,238 L268,242 L265,280 L72,274 Z" fill="#18181B" stroke="#09090B" stroke-width="1.5"/>
    <rect x="108" y="246" width="112" height="26" rx="3" fill="#27272A" stroke="#3F3F46" stroke-width="1"/>
    <line x1="108" y1="255" x2="220" y2="256" stroke="#18181B" stroke-width="2"/>
    <line x1="108" y1="264" x2="220" y2="265" stroke="#18181B" stroke-width="2"/>
    <text x="164" y="263" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="13" fill="#E5E7EB" text-anchor="middle" letter-spacing="1.5">TOYOTA</text>

    <g transform="translate(88, 256)">
      <ellipse cx="0" cy="0" rx="13" ry="15" fill="#111827" stroke="#52525B" stroke-width="1.5"/>
      <ellipse cx="0" cy="0" rx="10" ry="12" fill="#FEF3C7"/>
      <circle cx="-2" cy="-2" r="4" fill="#FFFFFF"/>
    </g>

    <g transform="translate(242, 260)">
      <rect x="-18" y="-17" width="36" height="34" rx="4" fill="#18181B" stroke="#52525B" stroke-width="1.2"/>
      <circle cx="0" cy="0" r="14" fill="#FEF3C7" stroke="#9CA3AF" stroke-width="1.5"/>
      <circle cx="-3" cy="-3" r="5" fill="#FFFFFF"/>
    </g>

    <polygon points="274,244 306,244 304,264 272,264" fill="#EA580C" stroke="#7C2D12" stroke-width="1"/>
    <polygon points="276,246 292,246 290,256 275,256" fill="#FB923C"/>

    <rect x="424" y="246" width="11" height="6" rx="1.5" fill="#F97316"/>

    <path d="M312,244 L420,242 L412,247 L312,248 Z" fill="#292524"/>
    <path d="M438,248 L560,244 L560,252 L438,255 Z" fill="#292524"/>
    <path d="M438,256 L552,253 L535,261 L438,263 Z" fill="#7F1D1D"/>
    <path d="M442,265 L520,263 L502,272 L455,273 Z" fill="#1C1917"/>
    <path d="M445,274 L495,273 L482,279 L458,279 Z" fill="#991B1B"/>

    <g id="front-bumper">
      <path d="M52,282 L82,282 L82,318 L54,316 Q48,300 52,282 Z" fill="#1F2937"/>
      <polygon points="82,282 222,286 222,326 82,320" fill="url(#chromeGrad)" stroke="#4B5563" stroke-width="1"/>
      <rect x="115" y="294" width="54" height="14" rx="2" fill="#111827"/>
      <path d="M222,286 L325,282 L315,326 L222,326 Z" fill="#27272A"/>
      <rect x="268" y="295" width="24" height="12" rx="2" fill="#111827" stroke="#52525B" stroke-width="1"/>
      <circle cx="282" cy="301" r="3.5" fill="#FFFFFF"/>
    </g>
  </g>

  <g transform="translate(362, 326)">
    <ellipse cx="0" cy="0" rx="54" ry="62" fill="url(#tireGrad)" stroke="#09090B" stroke-width="2"/>
    <ellipse cx="4" cy="0" rx="46" ry="54" fill="none" stroke="#374151" stroke-width="1.5" stroke-dasharray="6,4"/>
    <ellipse cx="6" cy="0" rx="28" ry="34" fill="#D1D5DB" stroke="#6B7280" stroke-width="2"/>
    <ellipse cx="8" cy="0" rx="23" ry="28" fill="#E5E7EB" stroke="#9CA3AF" stroke-width="1"/>
    <circle cx="8" cy="-19" r="3" fill="#374151"/>
    <circle cx="21" cy="-10" r="3" fill="#374151"/>
    <circle cx="21" cy="10" r="3" fill="#374151"/>
    <circle cx="8" cy="19" r="3" fill="#374151"/>
    <circle cx="-5" cy="10" r="3" fill="#374151"/>
    <circle cx="-5" cy="-10" r="3" fill="#374151"/>
    <ellipse cx="9" cy="0" rx="8" ry="10" fill="#1F2937"/>
    <circle cx="11" cy="0" r="3.5" fill="#9CA3AF"/>
  </g>

  <g transform="translate(674, 306)">
    <ellipse cx="0" cy="0" rx="42" ry="50" fill="url(#tireGrad)" stroke="#09090B" stroke-width="2"/>
    <ellipse cx="3" cy="0" rx="35" ry="43" fill="none" stroke="#374151" stroke-width="1.2" stroke-dasharray="5,3"/>
    <ellipse cx="5" cy="0" rx="22" ry="27" fill="#D1D5DB" stroke="#6B7280" stroke-width="1.8"/>
    <ellipse cx="6" cy="0" rx="18" ry="22" fill="#E5E7EB"/>
    <circle cx="6" cy="-15" r="2.3" fill="#374151"/>
    <circle cx="16" cy="-8" r="2.3" fill="#374151"/>
    <circle cx="16" cy="8" r="2.3" fill="#374151"/>
    <circle cx="6" cy="15" r="2.3" fill="#374151"/>
    <circle cx="-4" cy="8" r="2.3" fill="#374151"/>
    <circle cx="-4" cy="-8" r="2.3" fill="#374151"/>
    <ellipse cx="7" cy="0" rx="6" ry="8" fill="#1F2937"/>
  </g>
</svg>`
  ),

  // ==========================================
  // 3. الطائرات والمسيّرات حقيقية الشكل (Real-Silhouette Aircraft)
  // ==========================================
};
