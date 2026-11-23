import { ActorPack, ActorTemplate, UnitAbilityDef } from '../../core/types';

export const STUDIO_TEMPLATES: Record<string, ActorTemplate> = {
  _person: { domain: 'land', kind: 'person', speed: 62, turnRate: 8, scale: 36, radius: 14 },
  _vehicle: { domain: 'land', kind: 'vehicle', speed: 94, turnRate: 2.8, scale: 46, radius: 20 },
  _ship: { domain: 'sea', kind: 'ship', speed: 78, turnRate: 1.5, scale: 62, radius: 24 },
  _carrier: { domain: 'sea', kind: 'ship', speed: 52, turnRate: 0.95, scale: 98, radius: 38 },
  _sub: { domain: 'sea', kind: 'ship', speed: 68, turnRate: 1.8, scale: 62, radius: 22 },
  _air: { domain: 'air', kind: 'air', speed: 220, turnRate: 3.2, scale: 54, radius: 23 },
  _heli: { domain: 'air', kind: 'air', speed: 145, turnRate: 3.8, scale: 52, radius: 22 },
  _building: { domain: 'land', kind: 'building', speed: 0, turnRate: 0, scale: 60, radius: 26 }
};

export function defineUnit(
  id: string,
  label: string,
  templateName: keyof typeof STUDIO_TEMPLATES,
  overrides: Partial<ActorTemplate>,
  ability: UnitAbilityDef,
  svg: string
): ActorPack {
  return {
    id,
    label,
    extends: templateName,
    ...STUDIO_TEMPLATES[templateName],
    ...overrides,
    ability,
    svg
  };
}
