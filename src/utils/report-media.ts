import type { ReportMediaItem } from '@/types/report-detail.types';

/** BE MediaType enum — PascalCase string trên JSON */
export type ReportMediaType =
  | 'Image'
  | 'Video'
  | 'Before'
  | 'Progress'
  | 'After'
  | 'Inspection';

export interface SplitReportMedia {
  /** Ảnh/video citizen gửi lúc tạo báo cáo — dùng gallery trên */
  citizen: ReportMediaItem[];
  /** Ảnh hiện trạng team chụp sau accept */
  before: ReportMediaItem[];
  /** Ảnh cập nhật tiến độ */
  progress: ReportMediaItem[];
  /** Ảnh sau khi dọn (resolve) */
  after: ReportMediaItem[];
  /** Có bất kỳ ảnh team nào */
  hasTeamMedia: boolean;
}

function normalizeType(raw?: string | null): string {
  return (raw ?? '').trim();
}

function isCitizenMedia(item: ReportMediaItem): boolean {
  const type = normalizeType(item.mediaType);
  // Legacy / thiếu type: coi như ảnh báo cáo gốc
  if (!type) return true;
  return type === 'Image' || type === 'Video' || type.toLowerCase() === 'reportimage';
}

function isType(item: ReportMediaItem, expected: ReportMediaType): boolean {
  return normalizeType(item.mediaType) === expected;
}

/** Tách media GET /reports/{id} theo mediaType — gallery vs step team */
export function splitReportMedia(media: ReportMediaItem[] | undefined | null): SplitReportMedia {
  const list = media ?? [];
  const citizen = list.filter(isCitizenMedia);
  const before = list.filter((item) => isType(item, 'Before'));
  const progress = list.filter((item) => isType(item, 'Progress'));
  const after = list.filter((item) => isType(item, 'After'));

  return {
    citizen,
    before,
    progress,
    after,
    hasTeamMedia: before.length + progress.length + after.length > 0,
  };
}
