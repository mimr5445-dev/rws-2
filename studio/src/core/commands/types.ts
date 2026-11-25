import type { Project } from '../model/project';

/**
 * كل تغيير أمر: يعيد نموذجاً جديداً ولا يعدّل القديم (S1.5).
 * `do` و`undo` دالتان نقيتان من المشروع إلى المشروع.
 */
export interface Command {
  readonly id: string;
  do(project: Project): Project;
  undo(project: Project): Project;
}
