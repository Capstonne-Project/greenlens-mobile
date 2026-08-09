export type ViolationReportSectionKey = 'location' | 'severity' | 'evidence' | 'note';

export interface ViolationReportSectionMeta {
  key: ViolationReportSectionKey;
  label: string;
  placeholder: string;
  required: boolean;
}

/** Thứ tự này là thứ tự hiển thị cả khi nhập lẫn khi xem lại. */
export const VIOLATION_REPORT_SECTIONS: readonly ViolationReportSectionMeta[] = [
  {
    key: 'location',
    label: 'Vị trí cụ thể',
    placeholder: 'Vị trí chính xác tại hiện trường (VD: cạnh cống thoát nước, sau chợ...)',
    required: false,
  },
  {
    key: 'severity',
    label: 'Mức độ - quy mô vi phạm',
    placeholder: 'Mức độ, quy mô vi phạm quan sát được tại hiện trường',
    required: true,
  },
  {
    key: 'evidence',
    label: 'Tang vật - hành vi vi phạm',
    placeholder: 'Tang vật thu được, hành vi vi phạm cụ thể',
    required: false,
  },
  {
    key: 'note',
    label: 'Ghi chú thêm',
    placeholder: 'Ghi chú khác (tùy chọn)',
    required: false,
  },
] as const;

export type ViolationReportValues = Record<ViolationReportSectionKey, string>;

export const EMPTY_VIOLATION_REPORT_VALUES: ViolationReportValues = {
  location: '',
  severity: '',
  evidence: '',
  note: '',
};

/** Gộp các section thành 1 string để gửi `violationStatusText` — BE chỉ nhận text thuần. */
export function serializeViolationReport(values: ViolationReportValues): string {
  return VIOLATION_REPORT_SECTIONS.filter((section) => values[section.key]?.trim())
    .map((section) => `${section.label}: ${values[section.key].trim()}`)
    .join('\n');
}

/**
 * Parse ngược string đã lưu thành từng section để hiển thị/prefill.
 * Dữ liệu cũ (nhập tự do trước khi có template) không khớp format nào →
 * đổ hết vào "Ghi chú thêm" để không mất nội dung đã ghi nhận.
 */
export function parseViolationReport(text: string | null | undefined): ViolationReportValues {
  const values: ViolationReportValues = { ...EMPTY_VIOLATION_REPORT_VALUES };
  const trimmed = text?.trim();
  if (!trimmed) return values;

  const lines = trimmed.split('\n');
  let matchedAny = false;
  let currentKey: ViolationReportSectionKey | null = null;

  for (const line of lines) {
    const section = VIOLATION_REPORT_SECTIONS.find((s) => line.startsWith(`${s.label}: `));
    if (section) {
      matchedAny = true;
      currentKey = section.key;
      values[section.key] = line.slice(`${section.label}: `.length);
    } else if (currentKey) {
      values[currentKey] += `\n${line}`;
    }
  }

  if (!matchedAny) {
    values.note = trimmed;
  }

  return values;
}
