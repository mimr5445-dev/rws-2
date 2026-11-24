// الوحدات الجوية
import { ActorPack } from '../../core/types';
import { defineUnit } from './shared';

export const STUDIO_AIR_UNITS: Record<string, ActorPack> = {
  f35_stealth: defineUnit(
    'f35_stealth',
    'مقاتلة شبحية F-35A لايتنينغ II',
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
    '/vehicles/f35a-lightning.png'
  ),

  f16_falcon: defineUnit(
    'f16_falcon',
    'مقاتلة F-16C فايتنغ فالكون',
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
    '/vehicles/f16c-fighting-falcon.png'
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
    '/vehicles/b2-spirit.png'
  ),

  apache_heli: defineUnit(
    'apache_heli',
    'مروحية AH-64E أباتشي غارديان',
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
    '/vehicles/ah64-apache.png'
  ),

  reaper_drone: defineUnit(
    'reaper_drone',
    'مسيّرة MQ-9 ريبر',
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
    '/vehicles/mq9-reaper.png'
  ),

  // ==========================================
  // 4. الأسطول البحري (Authentic Naval Fleet)
  // ==========================================
};
