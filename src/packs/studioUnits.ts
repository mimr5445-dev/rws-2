import { ActorPack } from '../core/types';
import { STUDIO_TEMPLATES } from './units/shared';
import { STUDIO_LAND_UNITS } from './units/land';
import { STUDIO_AIR_UNITS } from './units/air';
import { STUDIO_SEA_UNITS } from './units/sea';
import { STUDIO_INFRA_UNITS } from './units/infrastructure';

export { STUDIO_TEMPLATES };

export const STUDIO_ACTORS: Record<string, ActorPack> = {
  ...STUDIO_LAND_UNITS,
  ...STUDIO_AIR_UNITS,
  ...STUDIO_SEA_UNITS,
  ...STUDIO_INFRA_UNITS
};
