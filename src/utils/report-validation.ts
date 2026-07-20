export const REPORT_DESCRIPTION_MIN_LENGTH = 10;
export const REPORT_DESCRIPTION_MAX_LENGTH = 1000;

export interface FieldErrors {
  description?: string;
  categoryId?: string;
  severity?: string;
}

export function validateReportDescription(value: string): string | null {
  const normalized = value.trim();
  if (normalized.length < REPORT_DESCRIPTION_MIN_LENGTH) {
    return `Mô tả phải từ ${REPORT_DESCRIPTION_MIN_LENGTH}-${REPORT_DESCRIPTION_MAX_LENGTH} ký tự.`;
  }
  if (normalized.length > REPORT_DESCRIPTION_MAX_LENGTH) {
    return `Mô tả tối đa ${REPORT_DESCRIPTION_MAX_LENGTH} ký tự.`;
  }
  return null;
}

export function normalizeApiFieldName(field: string): keyof FieldErrors | null {
  const normalized = field.trim().toLowerCase();
  if (normalized === 'description') return 'description';
  if (normalized === 'categoryid' || normalized === 'category') return 'categoryId';
  if (normalized === 'severity') return 'severity';
  return null;
}
