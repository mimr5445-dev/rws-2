import type { Project } from '../model/project';
import type { Command } from './types';

export class HistoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HistoryError';
  }
}

/**
 * سجل تراجع محدود بلقطات كاملة (المشروع صغير، والبصمة تُحسب عند الطلب).
 * الحالة الحالية دائماً في `project`، ولا تُعدَّل في مكانها.
 */
export class History {
  private current: Project;
  private past: Project[] = [];
  private future: Project[] = [];
  private readonly limit: number;
  private appliedCommands: Command[] = [];

  constructor(initial: Project, limit = 100) {
    if (limit < 1) throw new HistoryError('حد التراجع يجب أن يكون 1 فأكثر');
    this.current = initial;
    this.limit = limit;
  }

  get project(): Project {
    return this.current;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  get undoDepth(): number {
    return this.past.length;
  }

  get redoDepth(): number {
    return this.future.length;
  }

  get lastCommandId(): string | null {
    return this.appliedCommands.at(-1)?.id ?? null;
  }

  execute(command: Command): Project {
    const next = command.do(this.current);
    if (next === this.current) throw new HistoryError('الأمر لم ينتج نموذجاً جديداً');
    this.past.push(this.current);
    if (this.past.length > this.limit) this.past.shift();
    this.current = next;
    this.future = [];
    this.appliedCommands.push(command);
    return this.current;
  }

  undo(): Project {
    const previous = this.past.pop();
    if (!previous) return this.current;
    this.future.push(this.current);
    this.current = previous;
    this.appliedCommands.pop();
    return this.current;
  }

  redo(): Project {
    const next = this.future.pop();
    if (!next) return this.current;
    this.past.push(this.current);
    this.current = next;
    return this.current;
  }

  reset(project: Project): void {
    this.current = project;
    this.past = [];
    this.future = [];
    this.appliedCommands = [];
  }
}
