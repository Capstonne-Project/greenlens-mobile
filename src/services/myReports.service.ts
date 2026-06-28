import { api } from '@/services/api';
import type { ApiEnvelope } from '@/types/api.types';
import type { GetMyReportsParams, MyReportsResponse } from '@/types/my-reports.types';

export const myReportsService = {
  getMyReports: (params: GetMyReportsParams = {}) =>
    api.get<ApiEnvelope<MyReportsResponse>>('/reports/my', {
      params: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
        ...(params.status ? { status: params.status } : {}),
      },
    }),
};
