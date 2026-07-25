import type { MyReportItem } from '@/types/my-reports.types';
import type { MergedReportRef, ReportDetail } from '@/types/report-detail.types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): value is string {
  return !!value && UUID_RE.test(value.trim());
}

export function isMergedDuplicateReport(item: {
  status: string;
  mergedIntoPrimaryReportId?: string | null;
}): boolean {
  return item.status === 'Duplicate' && isUuid(item.mergedIntoPrimaryReportId);
}

export interface MyReportDetailNavTarget {
  /** Report id mở trên màn detail */
  id: string;
  /** Báo cáo của user bị gộp — dùng để hydrate section "Báo cáo đã gộp" */
  fromMergedReportId?: string;
}

/**
 * Duplicate đã gộp → mở báo cáo gốc + kèm id bài của mình.
 * Các status khác → mở chính item đó.
 */
export function resolveMyReportDetailTarget(item: MyReportItem): MyReportDetailNavTarget {
  if (isMergedDuplicateReport(item) && item.mergedIntoPrimaryReportId) {
    return {
      id: item.mergedIntoPrimaryReportId.trim(),
      fromMergedReportId: item.id,
    };
  }
  return { id: item.id };
}

/** Gom mọi id có thể fetch để hiển thị section gộp — chỉ lấy UUID hợp lệ. */
export function collectMergedReportIds(options: {
  detail?: Pick<ReportDetail, 'mergedReports'> | null;
  fromMergedReportId?: string | null;
  extraIds?: Array<string | null | undefined>;
}): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const push = (raw: string | null | undefined) => {
    if (!isUuid(raw)) return;
    const id = raw.trim();
    if (seen.has(id)) return;
    seen.add(id);
    result.push(id);
  };

  for (const ref of options.detail?.mergedReports ?? []) {
    push(ref.id);
  }
  push(options.fromMergedReportId);
  for (const id of options.extraIds ?? []) {
    push(id);
  }

  return result;
}

export function toMergedReportRef(
  detail: Pick<
    ReportDetail,
    'id' | 'code' | 'categoryName' | 'address' | 'createdAt' | 'status' | 'media'
  >,
): MergedReportRef {
  return {
    id: detail.id,
    code: detail.code,
    categoryName: detail.categoryName,
    address: detail.address,
    createdAt: detail.createdAt,
    imageUrl: detail.media?.[0]?.url ?? null,
    status: detail.status,
  };
}

export function isMergeNotificationCopy(title?: string | null, message?: string | null): boolean {
  const blob = `${title ?? ''} ${message ?? ''}`.toLowerCase();
  return (
    blob.includes('gộp') ||
    blob.includes('trùng lặp') ||
    blob.includes('duplicate') ||
    blob.includes('merged')
  );
}
