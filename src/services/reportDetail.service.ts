import { api } from '@/services/api';
import type { ApiEnvelope } from '@/types/api.types';
import type {
  RateReportDto,
  ReportDetail,
  ReportHistoryResponse,
  RequestReopenDto,
} from '@/types/report-detail.types';

export const reportDetailService = {
  getById: (reportId: string) => api.get<ApiEnvelope<ReportDetail>>(`/reports/${reportId}`),

  getHistory: (reportId: string) =>
    api.get<ApiEnvelope<ReportHistoryResponse>>(`/reports/${reportId}/history`),

  close: (reportId: string) => api.put<void>(`/reports/${reportId}/close`),

  /**
   * POST /reports/{id}/reopen-requests — BR-REP-015.
   * Thay cho `PUT /reopen` (deprecated, luôn trả REOPEN_USE_REQUEST_ENDPOINT).
   * Báo cáo giữ nguyên `Resolved` cho tới khi LEO duyệt. Trả về reopenRequestId.
   */
  requestReopen: (reportId: string, dto: RequestReopenDto) =>
    api.post<ApiEnvelope<string>>(`/reports/${reportId}/reopen-requests`, dto),

  /** POST /reports/{id}/rate — độc lập với close/reopen */
  rate: (reportId: string, dto: RateReportDto) =>
    api.post<void>(`/reports/${reportId}/rate`, dto),
};
