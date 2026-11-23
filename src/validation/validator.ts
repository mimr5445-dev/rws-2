import { parseStrictSec } from '../engine/engine';
import { ActorPack, MapPack, ScenarioFile, ValidationIssue } from '../core/types';
import { formatYamlSyntaxErrorAr, isPlainObj } from './validatorHelpers';
import { buildLifecycleAnalyzer } from './validatorLifecycle';
import { validateTimelineSteps } from './validatorSteps';

export { formatYamlSyntaxErrorAr };

export function validateScenario(
  scenario: ScenarioFile,
  map: MapPack | undefined,
  actors: Record<string, ActorPack>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isPlainObj(scenario)) {
    issues.push({ stepIndex: -1, field: 'root', message: 'ملف السيناريو يجب أن يكون كائن YAML صالحًا' });
    return issues;
  }
  if (!isPlainObj(scenario.meta) || typeof scenario.meta.map !== 'string' || !scenario.meta.map.trim()) {
    issues.push({ stepIndex: -1, field: 'meta.map', message: 'يجب تحديد اسم الخريطة في meta.map' });
    return issues;
  }
  if (!map) {
    issues.push({ stepIndex: -1, field: 'meta.map', message: `الخريطة "${scenario.meta.map}" غير موجودة في قاعدة البيانات` });
    return issues;
  }
  if (scenario.meta.duration_hint !== undefined) {
    const hint = parseStrictSec(scenario.meta.duration_hint);
    if (hint === null || hint <= 0) {
      issues.push({ stepIndex: -1, field: 'meta.duration_hint', message: 'meta.duration_hint يجب أن يكون مدة زمنية موجبة مثل "42s"' });
    }
  }
  if (scenario.timeline !== undefined && !Array.isArray(scenario.timeline)) {
    issues.push({ stepIndex: -1, field: 'timeline', message: 'timeline يجب أن يكون قائمة من الخطوات' });
    return issues;
  }

  const timeline = scenario.timeline ?? [];
  const lifecycle = buildLifecycleAnalyzer(timeline, actors, issues);
  validateTimelineSteps(timeline, map, actors, issues, lifecycle);

  return issues;
}
