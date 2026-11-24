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
    '/vehicles/ddg-51-arleigh-burke.png'
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
    '/vehicles/fremm-frigate.png'
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
    '/vehicles/cvn-68-nimitz.png'
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
    '/vehicles/virginia-class-submarine.png'
  )
};
