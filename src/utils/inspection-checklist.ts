import type { Ionicons } from '@expo/vector-icons';

import {
  SCENE_PHOTO_MINIMUM,
  type ChecklistCategory,
  type InspectionEvidenceItem,
} from '@/types/inspection.types';

export interface ChecklistCategoryMeta {
  category: ChecklistCategory;
  label: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
  required: boolean;
}

/** Checklist cố định BR-INS-033 — thứ tự này là thứ tự hiển thị. */
export const CHECKLIST_CATEGORIES: readonly ChecklistCategoryMeta[] = [
  {
    category: 'ViolationStatus',
    label: 'Tình trạng vi phạm',
    hint: 'Mô tả bắt buộc',
    icon: 'document-text-outline',
    required: true,
  },
  {
    category: 'ScenePhoto',
    label: 'Ảnh hiện trường',
    hint: `Tối thiểu ${SCENE_PHOTO_MINIMUM} ảnh`,
    icon: 'camera-outline',
    required: true,
  },
  {
    category: 'Video',
    label: 'Video',
    hint: 'Tùy chọn · ≤ 30MB',
    icon: 'videocam-outline',
    required: false,
  },
  {
    category: 'Audio',
    label: 'Ghi âm',
    hint: 'Tùy chọn · thu tại hiện trường, ≤ 10MB',
    icon: 'mic-outline',
    required: false,
  },
  {
    category: 'Other',
    label: 'Tài liệu khác',
    hint: 'Tùy chọn · ảnh tài liệu + ghi chú',
    icon: 'attach-outline',
    required: false,
  },
] as const;

export interface ChecklistCategoryState extends ChecklistCategoryMeta {
  /** Nội dung text — BE lưu ở `description` của dòng evidence không có `mediaUrl`. */
  note: string | null;
  /** Chỉ các dòng có file thật. */
  files: InspectionEvidenceItem[];
  satisfied: boolean;
}

/**
 * Ghép `checklistEvidence` phẳng của BE thành 5 category cố định.
 * BE không trả cờ `isSatisfied` — FE tự suy ra theo BR-INS-033.
 */
export function buildChecklistState(
  evidence: InspectionEvidenceItem[] | null | undefined,
): ChecklistCategoryState[] {
  const items = evidence ?? [];

  return CHECKLIST_CATEGORIES.map((meta) => {
    const inCategory = items.filter((item) => item.category === meta.category);
    const files = inCategory.filter((item) => Boolean(item.mediaUrl));
    // Dòng text = không có mediaUrl nhưng có description.
    const note =
      inCategory.find((item) => !item.mediaUrl && item.description?.trim())?.description?.trim() ??
      null;

    // Tick xanh chỉ khi thực sự đã có nội dung/file — mục tùy chọn (Video/Audio/Other)
    // không tự "đạt" khi trống, dù không bị chặn nộp biên bản (xem getMissingRequirements).
    const satisfied =
      meta.category === 'ViolationStatus'
        ? Boolean(note)
        : meta.category === 'ScenePhoto'
          ? files.length >= SCENE_PHOTO_MINIMUM
          : files.length > 0 || Boolean(note);

    return { ...meta, note, files, satisfied };
  });
}

/** Các mục bắt buộc còn thiếu — dùng để chặn submit field report. */
export function getMissingRequirements(states: ChecklistCategoryState[]): string[] {
  return states
    .filter((s) => s.required && !s.satisfied)
    .map((s) =>
      s.category === 'ScenePhoto'
        ? `Ảnh hiện trường (${s.files.length}/${SCENE_PHOTO_MINIMUM})`
        : s.label,
    );
}
