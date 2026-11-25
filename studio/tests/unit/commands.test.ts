import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { History } from '@/core/commands';
import {
  addEffect,
  addEntity,
  moveEntity,
  removeEffect,
  removeEntity,
  setEntityScale,
} from '@/core/commands/builtins';
import { hashProject } from '@/core/hash';
import { migrate, type Project } from '@/core/model';

const fixture = (): Project =>
  migrate(
    JSON.parse(readFileSync(path.resolve(process.cwd(), 'fixtures/bench.project.json'), 'utf8')),
  );

const buildSequence = (project: Project) => {
  const history = new History(project, 50);
  const base = project.entities.slice(0, 6);
  base.forEach((entity, index) => {
    history.execute(
      moveEntity(entity.id, entity.position, {
        lon: entity.position.lon + index + 0.5,
        lat: entity.position.lat - 0.25,
      }),
    );
  });
  base.forEach((entity) => history.execute(setEntityScale(entity.id, entity.scale, 1.5)));
  base.forEach((entity) => history.execute(setEntityScale(entity.id, 1.5, 2)));
  history.execute(
    addEntity({
      id: 'u1a',
      kind: 'marker',
      assetId: 'symbol.flag',
      side: 'a',
      position: { lon: 31, lat: 29 },
      scale: 1,
    }),
  );
  history.execute(
    addEffect({
      id: 'boom.99',
      kind: 'shockwave',
      at: { tick: 700 },
      position: { lon: 31, lat: 29 },
      intensity: 0.9,
    }),
  );
  return history;
};

describe('الأوامر وسجل التراجع (S1.5)', () => {
  it('عشرون أمراً ثم تراجع كامل يعيد البصمة الأولى', async () => {
    const project = fixture();
    const initialHash = await hashProject(project);
    const history = buildSequence(project);

    expect(history.undoDepth).toBe(20);
    const afterCommands = await hashProject(history.project);
    expect(afterCommands).not.toBe(initialHash);

    for (let index = 0; index < 20; index += 1) history.undo();
    expect(history.canUndo).toBe(false);
    expect(await hashProject(history.project)).toBe(initialHash);
  });

  it('إعادة التنفيذ بعد التراجع تعيد بصمة ما بعد الأوامر', async () => {
    const project = fixture();
    const history = buildSequence(project);
    const expected = await hashProject(history.project);

    for (let index = 0; index < 20; index += 1) history.undo();
    for (let index = 0; index < 20; index += 1) history.redo();

    expect(history.canRedo).toBe(false);
    expect(await hashProject(history.project)).toBe(expected);
  });

  it('الأوامر لا تعدّل النموذج القديم (immutable)', async () => {
    const project = fixture();
    const before = await hashProject(project);
    const command = moveEntity(project.entities[0]!.id, project.entities[0]!.position, {
      lon: 0,
      lat: 0,
    });
    const next = command.do(project);
    expect(next).not.toBe(project);
    expect(await hashProject(project)).toBe(before);
    expect(await hashProject(command.undo(next))).toBe(before);
  });

  it('حذف كيان ثم التراجع عنه يعيد البصمة نفسها', async () => {
    const project = fixture();
    const base = await hashProject(project);
    const history = new History(project);
    const last = project.entities.at(-1)!;
    history.execute(removeEntity(last));
    expect(await hashProject(history.project)).not.toBe(base);
    history.undo();
    expect(await hashProject(history.project)).toBe(base);
  });

  it('السجل محدود ولا ينمو بلا حد', () => {
    const project = fixture();
    const history = new History(project, 5);
    for (let index = 0; index < 12; index += 1) {
      history.execute(setEntityScale(project.entities[0]!.id, 1, 1 + (index + 1) / 100));
    }
    expect(history.undoDepth).toBe(5);
  });

  it('رفض أمر لا ينتج نموذجاً جديداً أو معرّفاً مكرراً', () => {
    const project = fixture();
    const history = new History(project);
    expect(() => history.execute({ id: 'noop', do: (p) => p, undo: (p) => p })).toThrow();
    const existing = project.entities[0]!;
    expect(() => history.execute(addEntity(existing))).toThrow(/مكرر/);
  });
});

describe('حدود الأوامر', () => {
  it('رفض تعديل كيان غير موجود', () => {
    const project = fixture();
    expect(() => moveEntity('ghost', { lon: 0, lat: 0 }, { lon: 1, lat: 1 }).do(project)).toThrow(
      /غير موجود/,
    );
    expect(() => setEntityScale('ghost', 1, 2).do(project)).toThrow(/غير موجود/);
  });

  it('إضافة مؤثر ثم التراجع عنه والتحقق من عدم التأثير', async () => {
    const project = fixture();
    const base = await hashProject(project);
    const history = new History(project);
    const effect = {
      id: 'boom.extra',
      kind: 'flash' as const,
      at: { tick: 300 },
      position: { lon: 30, lat: 30 },
      intensity: 0.5,
    };
    history.execute(addEffect(effect));
    expect(history.project.effects).toHaveLength(project.effects.length + 1);
    history.undo();
    expect(await hashProject(history.project)).toBe(base);
    expect(() => removeEffect(effect).do(history.project)).not.toThrow();
  });
});
