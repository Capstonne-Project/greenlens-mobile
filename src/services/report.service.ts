import { api } from './api';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';
import type { ReportItem, CreateReportDto, ReportStatus } from '@/types/report.types';

export const reportService = {
  getAll: (page = 1, limit = 20) =>
    api.get<PaginatedResponse<ReportItem>>('/reports', { params: { page, limit } }),

  getNearby: (lat: number, lng: number, radiusKm = 5) =>
    api.get<ApiResponse<ReportItem[]>>('/reports/nearby', {
      params: { lat, lng, radius: radiusKm },
    }),

  getById: (id: string) =>
    api.get<ApiResponse<ReportItem>>(`/reports/${id}`),

  getMyReports: (page = 1) =>
    api.get<PaginatedResponse<ReportItem>>('/reports/mine', { params: { page } }),

  create: (dto: CreateReportDto) =>
    api.post<ApiResponse<ReportItem>>('/reports', dto),

  updateStatus: (id: string, status: ReportStatus) =>
    api.patch<ApiResponse<ReportItem>>(`/reports/${id}/status`, { status }),

  upvote: (id: string) =>
    api.post<ApiResponse<null>>(`/reports/${id}/upvote`),

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/reports/${id}`),
};
