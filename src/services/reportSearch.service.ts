import { api } from './api';
import type { ApiEnvelope } from '@/types/api.types';
import type { ReportSearchParams, ReportSearchResponse } from '@/types/report-search.types';

export const reportSearchService = {
  /**
   * GET /v1/reports — danh sách báo cáo, hỗ trợ `keyword` (mã / mô tả / địa chỉ).
   * Bearer required.
   */
  search: (params: ReportSearchParams = {}) =>
    api.get<ApiEnvelope<ReportSearchResponse>>('/reports', {
      params: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
        ...(params.keyword?.trim() ? { keyword: params.keyword.trim() } : {}),
        ...(params.status ? { status: params.status } : {}),
        ...(params.categoryId ? { categoryId: params.categoryId } : {}),
        ...(params.wardCode ? { wardCode: params.wardCode } : {}),
        ...(params.severity ? { severity: params.severity } : {}),
      },
    }),
};
