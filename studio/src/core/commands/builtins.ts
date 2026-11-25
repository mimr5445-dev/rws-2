import type { Entity } from '../model/entity';
import type { Effect } from '../model/effect';
import type { Position } from '../model/primitives';
import type { Project } from '../model/project';
import type { Command } from './types';

const requireEntity = (project: Project, entityId: string): Entity => {
  const entity = project.entities.find((item) => item.id === entityId);
  if (!entity) throw new Error(`كيان غير موجود: ${entityId}`);
  return entity;
};

const replaceEntity = (project: Project, updated: Entity): Project => ({
  ...project,
  entities: project.entities.map((entity) => (entity.id === updated.id ? updated : entity)),
});

export function addEntity(entity: Entity): Command {
  return {
    id: `addEntity:${entity.id}`,
    do: (project) => {
      if (project.entities.some((item) => item.id === entity.id)) {
        throw new Error(`معرّف مكرر: ${entity.id}`);
      }
      return { ...project, entities: [...project.entities, entity] };
    },
    undo: (project) => ({
      ...project,
      entities: project.entities.filter((item) => item.id !== entity.id),
    }),
  };
}

export function removeEntity(entity: Entity): Command {
  // نحفظ موضع الحذف كي يعيد التراجع الكيان إلى مكانه لا إلى آخر القائمة (البصمة تعتمد على الترتيب).
  let removedAt = -1;
  return {
    id: `removeEntity:${entity.id}`,
    do: (project) => {
      requireEntity(project, entity.id);
      removedAt = project.entities.findIndex((item) => item.id === entity.id);
      return { ...project, entities: project.entities.filter((item) => item.id !== entity.id) };
    },
    undo: (project) => {
      if (project.entities.some((item) => item.id === entity.id)) return project;
      const entities = [...project.entities];
      const index = removedAt < 0 ? entities.length : Math.min(removedAt, entities.length);
      entities.splice(index, 0, entity);
      return { ...project, entities };
    },
  };
}

export function moveEntity(entityId: string, from: Position, to: Position): Command {
  return {
    id: `moveEntity:${entityId}`,
    do: (project) => replaceEntity(project, { ...requireEntity(project, entityId), position: to }),
    undo: (project) =>
      replaceEntity(project, { ...requireEntity(project, entityId), position: from }),
  };
}

/**
 * تعديل خصائص كيان دفعة واحدة مع لقطة قبل/بعد (S3.1).
 * اللقطة الاثنتان تجعلان التراجع ممكناً حتى لو تغيّرت الخصائص في الوسط.
 */
export function setEntityProps(
  entityId: string,
  before: Partial<Entity>,
  after: Partial<Entity>,
): Command {
  const apply = (patch: Partial<Entity>) => (project: Project) =>
    replaceEntity(project, { ...requireEntity(project, entityId), ...patch });
  return {
    id: `setEntityProps:${entityId}:${Object.keys(after).join(',')}`,
    do: apply(after),
    undo: apply(before),
  };
}

export function setEntityScale(entityId: string, from: number, to: number): Command {
  return {
    id: `setEntityScale:${entityId}`,
    do: (project) => replaceEntity(project, { ...requireEntity(project, entityId), scale: to }),
    undo: (project) => replaceEntity(project, { ...requireEntity(project, entityId), scale: from }),
  };
}

export function addEffect(effect: Effect): Command {
  return {
    id: `addEffect:${effect.id}`,
    do: (project) => {
      if (project.effects.some((item) => item.id === effect.id)) {
        throw new Error(`معرّف مكرر: ${effect.id}`);
      }
      return { ...project, effects: [...project.effects, effect] };
    },
    undo: (project) => ({
      ...project,
      effects: project.effects.filter((item) => item.id !== effect.id),
    }),
  };
}

export function removeEffect(effect: Effect): Command {
  return {
    id: `removeEffect:${effect.id}`,
    do: (project) => ({
      ...project,
      effects: project.effects.filter((item) => item.id !== effect.id),
    }),
    undo: (project) => ({ ...project, effects: [...project.effects, effect] }),
  };
}
