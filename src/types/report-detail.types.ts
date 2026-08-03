import type { ReportWorkflowStatus } from '@/types/report-status.types';

export type { ReportWorkflowStatus } from '@/types/report-status.types';

export type ReportDetailSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface ReportMediaItem {
  id?: string;
  url: string;
  mediaType?: string;
}

export interface ReportAssignmentItem {
  id?: string;
  teamId?: string;
  teamName: string;
  status: string;
  progressPercent: number;
  progressNote?: string | null;
  progressUpdatedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
}

/** BE trả `tagId` (GetReportById); một số payload cũ có thể dùng `id`. */
export interface ReportDetailWasteTag {
  id: string;
  tagId?: string;
  code?: string;
  nameVi: string;
}

/** POST /reports/{id}/rate — đánh giá chất lượng xử lý (1 lần / report) */
export interface ReportSatisfaction {
  isSatisfied: boolean;
  rating?: number | null;
  comment?: string | null;
  ratedAt?: string | null;
}

export interface RateReportDto {
  isSatisfied: boolean;
  rating?: number;
  comment?: string;
}

/**
 * Ref báo cáo đã gộp — BE trả trên primary `GET /v1/reports/{id}.mergedReports[]`.
 * `imageUrl` là thumb projection (vẫn có sau ReassignToReport).
 */
export interface MergedReportRef {
  id: string;
  code?: string | null;
  categoryName?: string | null;
  address?: string | null;
  createdAt?: string | null;
  imageUrl?: string | null;
  status?: ReportWorkflowStatus | string | null;
}

export interface ReportDetail {
  id: string;
  code: string;
  reporterId: string | null;
  /** Null khi báo cáo ẩn danh hoặc người gửi đã xóa tài khoản */
  reporterName?: string | null;
  reporterAvatarUrl?: string | null;
  status: ReportWorkflowStatus;
  categoryName: string;
  categoryCode?: string;
  severity: ReportDetailSeverity;
  description: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  reporterCount: number;
  reopenedCount: number;
  media: ReportMediaItem[];
  assignments: ReportAssignmentItem[];
  wasteTags: ReportDetailWasteTag[];
  createdAt: string;
  verifiedAt?: string | null;
  startedAt?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  slaVerifyDueAt?: string | null;
  slaResolveDueAt?: string | null;

  /**
   * Thumb đại diện (P1) — có thể còn trên Duplicate sau reassign media.
   * Ưu tiên dùng khi `media[]` rỗng.
   */
  imageUrl?: string | null;

  /** Có sẵn khi reporter đã đánh giá (Phần B2 handoff) */
  satisfaction?: ReportSatisfaction | null;
  hasCurrentUserRated?: boolean;

  /** Khi báo cáo này bị gộp vào primary (Duplicate) */
  mergedIntoPrimaryReportId?: string | null;
  mergedIntoPrimaryReportCode?: string | null;
  /** Báo cáo đã gộp vào primary — gồm `imageUrl` thumb sau merge */
  mergedReports?: MergedReportRef[] | null;
}

export interface ReportHistoryItem {
  fromStatus: string | null;
  toStatus: string;
  changedByName: string | null;
  reason: string | null;
  createdAt: string;
}

export interface ReportHistoryResponse {
  items: ReportHistoryItem[];
}

export type ReportDetailSource = 'tab' | 'map';
