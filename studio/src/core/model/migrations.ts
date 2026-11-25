import { ProjectSchema, SCHEMA_VERSION, type Project } from './project';

export type RawProject = Record<string, unknown>;

/**
 * الترحيل: كل مفتاح هو إصدار المصدر، وقيمته ترفعه إصداراً واحداً.
 * الإصدار 0 إصدار افتراضي قديم (بلا locale ولا variables ولا cues ولا camera)
 * وردم الفجوة فيه هو الترحيل الوحيد المتاح اليوم.
 */
export const migrations: Record<number, (raw: RawProject) => RawProject> = {
  0: (raw) => ({
    ...raw,
    schemaVersion: 1,
    locale: raw['locale'] ?? 'ar',
    variables: raw['variables'] ?? {},
    cues: raw['cues'] ?? [],
    camera: raw['camera'] ?? [],
    effects: raw['effects'] ?? [],
    triggers: raw['triggers'] ?? [],
  }),
};

export class MigrationError extends Error {
  constructor(
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'MigrationError';
  }
}

/** يرفع المشروع الخام إلى الإصدار الحالي ثم يتحقق منه. */
export function migrate(raw: unknown): Project {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new MigrationError('ملف المشروع ليس كائناً');
  }

  let current = { ...(raw as RawProject) };
  const declared = current['schemaVersion'];
  if (typeof declared !== 'number' || !Number.isInteger(declared) || declared < 0) {
    throw new MigrationError('schemaVersion مفقود أو غير صالح');
  }
  if (declared > SCHEMA_VERSION) {
    throw new MigrationError(
      `إصدار أقدم من التطبيق لا يمكنه قراءة إصدار أحدث (${declared} > ${SCHEMA_VERSION})`,
    );
  }

  let version = declared;
  while (version < SCHEMA_VERSION) {
    const step = migrations[version];
    if (!step) throw new MigrationError(`لا يوجد ترحيل من الإصدار ${version}`);
    current = step(current);
    version += 1;
  }

  const parsed = ProjectSchema.safeParse(current);
  if (!parsed.success) {
    throw new MigrationError('المشروع غير صالح بعد الترحيل', parsed.error);
  }
  return parsed.data;
}
