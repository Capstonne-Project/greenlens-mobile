import { api } from '@/services/api';
import type { ApiEnvelope } from '@/types/api.types';
import type {
  RateReportDto,
  ReportDetail,
  ReportHistoryResponse,
} from '@/types/report-detail.types';

export const reportDetailService = {
  getById: (reportId: string) => api.get<ApiEnvelope<ReportDetail>>(`/reports/${reportId}`),

  getHistory: (reportId: string) =>
    api.get<ApiEnvelope<ReportHistoryResponse>>(`/reports/${reportId}/history`),

  close: (reportId: string) => api.put<void>(`/reports/${reportId}/close`),

  reopen: (reportId: string) => api.put<void>(`/reports/${reportId}/reopen`),

  /** POST /reports/{id}/rate — độc lập với close/reopen */
  rate: (reportId: string, dto: RateReportDto) =>
    api.post<void>(`/reports/${reportId}/rate`, dto),
};
