import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MigrationError, SCHEMA_VERSION, migrate } from '@/core/model';

const raw = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'fixtures/bench.project.json'), 'utf8'),
) as Record<string, unknown>;

describe('الإصدارات والترحيل (S1.2)', () => {
  it('الترحيل من إصدار قديم مزيّف ينتج مشروعاً صالحاً', () => {
    const legacy = {
      ...raw,
      schemaVersion: 0,
    } as Record<string, unknown>;
    delete legacy['locale'];
    delete legacy['variables'];
    delete legacy['cues'];
    delete legacy['camera'];

    const migrated = migrate(legacy);
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
    expect(migrated.locale).toBe('ar');
    expect(migrated.variables).toEqual({});
    expect(migrated.cues).toEqual([]);
    expect(migrated.camera).toEqual([]);
    expect(migrated.entities).toHaveLength((raw['entities'] as unknown[]).length);
    expect(migrated.effects).toHaveLength((raw['effects'] as unknown[]).length);
  });

  it('مشروع بالإصدار الحالي يمر بلا تغيير في القيم', () => {
    const migrated = migrate(raw);
    expect(migrated.id).toBe(raw['id']);
    expect(migrated.entities).toHaveLength((raw['entities'] as unknown[]).length);
  });

  it('يرفض إصداراً أحدث من التطبيق برسالة مفهومة', () => {
    expect(() => migrate({ ...raw, schemaVersion: 99 })).toThrow(MigrationError);
    expect(() => migrate({ ...raw, schemaVersion: 99 })).toThrow(/أحدث/);
  });

  it('يرفض ملفاً بلا schemaVersion أو ليس كائناً', () => {
    expect(() => migrate({})).toThrow(/schemaVersion/);
    expect(() => migrate('text')).toThrow(/ليس كائناً/);
  });

  it('يرفض مشروعاً غير صالح بعد الترحيل', () => {
    expect(() => migrate({ ...raw, schemaVersion: 0, durationTicks: -5 })).toThrow(MigrationError);
  });
});
