import type { ReportWorkflowStatus } from '@/types/report-detail.types';

export type MyReportStatus = ReportWorkflowStatus;

export type MyReportSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface MyReportItem {
  id: string;
  code: string;
  categoryName: string;
  severity: MyReportSeverity;
  status: MyReportStatus;
  address: string;
  createdAt: string;
  resolvedAt?: string | null;
  closedAt?: string | null;
  /** Legacy fields — optional if BE still returns them */
  categoryCode?: string;
  latitude?: number;
  longitude?: number;
  wardCode?: string;
  reporterCount?: number;
  /**
   * Ảnh đại diện — BE trả trên `GET /v1/reports/my` (kể cả `status=Duplicate`
   * sau khi media đã reassign sang primary).
   */
  imageUrl?: string | null;
  /** ID báo cáo gốc khi status = Duplicate; null nếu không bị gộp */
  mergedIntoPrimaryReportId?: string | null;
  /** Mã hiển thị báo cáo gốc (e.g. RPT-2026-0045) */
  mergedIntoPrimaryReportCode?: string | null;
}

export interface ReportsPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface MyReportsResponse {
  items: MyReportItem[];
  pagination: ReportsPagination;
}

export interface GetMyReportsParams {
  page?: number;
  pageSize?: number;
  status?: MyReportStatus;
}

export type MyReportsFilterKey = 'ALL' | 'InProgress' | 'NEEDS_CONFIRM' | 'DONE' | 'Rejected';

export const MY_REPORTS_FILTERS: { key: MyReportsFilterKey; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'InProgress', label: 'Đang xử lý' },
  { key: 'NEEDS_CONFIRM', label: 'Cần xác nhận' },
  { key: 'DONE', label: 'Đã xong' },
  { key: 'Rejected', label: 'Từ chối / Đã gộp' },
];

export function filterMyReportsByKey(items: MyReportItem[], key: MyReportsFilterKey): MyReportItem[] {
  if (key === 'ALL') return items;
  if (key === 'InProgress') {
    return items.filter((item) =>
      ['Submitted', 'Verified', 'Dispatched', 'Assigned', 'InProgress'].includes(item.status),
    );
  }
  if (key === 'NEEDS_CONFIRM') {
    return items.filter((item) => item.status === 'Resolved' || item.status === 'PenaltyIssued');
  }
  if (key === 'DONE') {
    return items.filter((item) => item.status === 'Closed' || item.status === 'ClosedNoViolation');
  }
  if (key === 'Rejected') {
    return items.filter((item) => item.status === 'Rejected' || item.status === 'Duplicate');
  }
  return items;
}

export function myReportsFilterToApiStatus(key: MyReportsFilterKey): MyReportStatus | undefined {
  if (key === 'Rejected') return 'Rejected';
  return undefined;
}
