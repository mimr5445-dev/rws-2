import { ProjectSchema, collectProjectIssues, type Project } from './project';

export interface ValidationResult {
  ok: boolean;
  project: Project | null;
  messages: { path: string; message: string }[];
}

/** تحقق موحّد يُستخدم في الاستيراد وفحص الملفات والاختبارات. */
export function validateProject(raw: unknown): ValidationResult {
  const parsed = ProjectSchema.safeParse(raw);
  if (parsed.success) return { ok: true, project: parsed.data, messages: [] };

  return {
    ok: false,
    project: null,
    messages: parsed.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
}

/** تشغيل التحقق عبر الحقول على مشروع مُتحقَّق شكلياً. */
export function semanticIssues(project: Project) {
  return collectProjectIssues(project).map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}
