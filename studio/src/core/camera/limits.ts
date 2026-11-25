/**
 * حدود الزوم (PRODUCT_SPEC §8). في ملف مستقل بلا تبعيات كي لا يسحب المتجر
 * مخططات zod إلى حزمة المتصفح لمجرد قراءة رقمين.
 */
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;
