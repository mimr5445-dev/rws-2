/**
 * تحميل المشاهد الجاهزة من content/scenes والتحقق منها (S3.7).
 * zod يُحمَّل مع هذه الوحدة فقط (استيراد ديناميكي)، فلا يدخل حزمة الدخول (ADR-0012).
 */
import { ProjectSchema, type Project } from '@/core/model/project';
import { entityStatesAt, simulate, type EntityState, type SimEvent } from '@/core/sim';

export interface LoadedScene {
  readonly project: Project;
  readonly entitiesAt: (tick: number) => EntityState[];
  readonly events: readonly SimEvent[];
  readonly durationTicks: number;
}

export async function loadSmallScene(baseUrl = ''): Promise<LoadedScene> {
  const response = await fetch(`${baseUrl}/scenes/small-scene.project.json`);
  if (!response.ok) throw new Error('تعذّر تحميل المشهد الصغير');
  const raw: unknown = await response.json();
  const project = ProjectSchema.parse(raw);
  const result = simulate(project);
  return {
    project,
    entitiesAt: (tick: number) => entityStatesAt(project, tick),
    events: result.events,
    durationTicks: project.durationTicks,
  };
}
