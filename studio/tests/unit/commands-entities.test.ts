import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { canonicalize, sha256Hex } from '@/core/hash';
import { ProjectSchema, type Project } from '@/core/model/project';
import type { Entity } from '@/core/model/entity';
import { History } from '@/core/commands/history';
import {
  addEntity,
  moveEntity,
  removeEntity,
  setEntityProps,
  setEntityScale,
} from '@/core/commands/builtins';

const rawScene = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'content/scenes/small-scene.project.json'), 'utf8'),
) as unknown;
const base = ProjectSchema.parse(rawScene);

const hashOf = (project: Project) => sha256Hex(canonicalize(project as unknown));

const newUnit: Entity = {
  id: 'u4',
  kind: 'unit',
  assetId: 'unit.artillery',
  side: 'b',
  position: { lon: 44.4, lat: 24.6 },
  scale: 1,
};

describe('أوامر الكيانات (S3.1)', () => {
  it('AddEntity ثم Undo يعيد البصمة الأصلية', async () => {
    const original = await hashOf(base);
    const command = addEntity(newUnit);
    const added = command.do(base);
    expect(added.entities.map((entity) => entity.id)).toEqual(['u1', 'u2', 'u3', 'm1', 'u4']);
    expect(await hashOf(added)).not.toBe(original);
    expect(await hashOf(command.undo(added))).toBe(original);
  });

  it('إضافة معرّف مكرر تُرفض', () => {
    expect(() => addEntity({ ...newUnit, id: 'u1' }).do(base)).toThrow(/مكرر/);
  });

  it('RemoveEntity ثم Undo يعيد الكيان إلى موضعه نفسه', async () => {
    const original = await hashOf(base);
    const command = removeEntity(base.entities[1]!);
    const removed = command.do(base);
    expect(removed.entities.map((entity) => entity.id)).toEqual(['u1', 'u3', 'm1']);
    expect(await hashOf(command.undo(removed))).toBe(original);
  });

  it('MoveEntity يغيّر الموقع فقط والتراجع يعيده', async () => {
    const command = moveEntity('u2', { lon: 39.1978, lat: 21.4858 }, { lon: 41.0, lat: 22.0 });
    const moved = command.do(base);
    const target = moved.entities.find((entity) => entity.id === 'u2');
    expect(target?.position).toEqual({ lon: 41.0, lat: 22.0 });
    expect(moved.tracks).toEqual(base.tracks);
    expect(await hashOf(command.undo(moved))).toBe(await hashOf(base));
  });

  it('SetEntityProps يعدّل عدة خصائص بضربة واحدة والتراجع يعيدها', async () => {
    const before = { side: 'b' as const, scale: 1, assetId: 'unit.infantry' };
    const after = { side: 'a' as const, scale: 1.5, assetId: 'unit.armor' };
    const command = setEntityProps('u2', before, after);
    const updated = command.do(base);
    const target = updated.entities.find((entity) => entity.id === 'u2');
    expect(target?.side).toBe('a');
    expect(target?.scale).toBe(1.5);
    expect(target?.assetId).toBe('unit.armor');
    expect(await hashOf(command.undo(updated))).toBe(await hashOf(base));
  });

  it('SetEntityScale يبقى متاحاً كاختصار', async () => {
    const command = setEntityScale('u3', 1, 2.5);
    const scaled = command.do(base);
    expect(scaled.entities.find((entity) => entity.id === 'u3')?.scale).toBe(2.5);
    expect(await hashOf(command.undo(scaled))).toBe(await hashOf(base));
  });

  it('سلسلة أوامر ثم تراجع كامل تُرجع بصمة المشروع الأصلية', async () => {
    const history = new History(base);
    const original = await hashOf(base);

    history.execute(addEntity(newUnit));
    history.execute(moveEntity('u4', { lon: 44.4, lat: 24.6 }, { lon: 45.5, lat: 25.5 }));
    history.execute(setEntityProps('u4', { scale: 1 }, { scale: 1.4 }));
    history.execute(removeEntity(base.entities[2]!));

    const afterAll = await hashOf(history.project);
    expect(afterAll).not.toBe(original);

    while (history.canUndo) history.undo();
    expect(await hashOf(history.project)).toBe(original);

    while (history.canRedo) history.redo();
    expect(await hashOf(history.project)).toBe(afterAll);
  });
});
