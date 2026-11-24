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
    'دبابة M1A2 أبرامز SEPv3',
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
    '/vehicles/m1a2-abrams.png'
  ),

  ifv_bradley: defineUnit(
    'ifv_bradley',
    'مركبة قتال M2A3 برادلي',
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
    '/vehicles/m2a3-bradley.png'
  ),

  spg_artillery: defineUnit(
    'spg_artillery',
    'مدفع هاوتزر ذاتي M109A7 بالادين',
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
    '/vehicles/m109a7-paladin.png'
  ),

  sam_patriot: defineUnit(
    'sam_patriot',
    'قاذف باتريوت MIM-104',
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
    '/vehicles/patriot-launcher.png'
  ),

  ballistic_tel: defineUnit(
    'ballistic_tel',
    'قاذف إسكندر-M 9P78-1',
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
    '/vehicles/iskander-tel.png'
  ),

  supply_convoy: defineUnit(
    'supply_convoy',
    'شاحنة إمداد M1083 FMTV',
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
    '/vehicles/fmtv-m1083.png'
  ),

  tactical_pickup: defineUnit(
    'tactical_pickup',
    'تويوتا هايلوكس 4×4 تكتيكية',
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
    '/vehicles/hilux-technical.png'
  ),

  // ==========================================
  // 3. الطائرات والمسيّرات حقيقية الشكل (Real-Silhouette Aircraft)
  // ==========================================
};
