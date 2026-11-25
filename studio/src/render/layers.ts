/**
 * شجرة الطبقات الثابتة (PRODUCT_SPEC §8). تُبنى مرة واحدة، والترتيب مصدره هذا الملف.
 */
export const LAYER_ORDER = [
  'map',
  'zones',
  'structures',
  'units',
  'paths',
  'effects',
  'captions',
  'camera',
  'editorUi',
] as const;

export type LayerName = (typeof LAYER_ORDER)[number];

export function layerIndex(name: LayerName): number {
  return LAYER_ORDER.indexOf(name);
}

/** طبقات تُخفى في التصدير (عناصر المحرر). */
export const EXPORT_HIDDEN_LAYERS: readonly LayerName[] = ['editorUi'];
