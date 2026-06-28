import { api } from '@/services/api';
import type { ApiEnvelope } from '@/types/api.types';
import type { ReportDetail, ReportHistoryResponse } from '@/types/report-detail.types';

export const reportDetailService = {
  getById: (reportId: string) => api.get<ApiEnvelope<ReportDetail>>(`/reports/${reportId}`),

  getHistory: (reportId: string) =>
    api.get<ApiEnvelope<ReportHistoryResponse>>(`/reports/${reportId}/history`),

  close: (reportId: string) => api.put<void>(`/reports/${reportId}/close`),

  reopen: (reportId: string) => api.put<void>(`/reports/${reportId}/reopen`),
};
