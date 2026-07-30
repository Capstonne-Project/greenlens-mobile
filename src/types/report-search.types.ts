import type { ReportWorkflowStatus } from '@/types/report-status.types';

export interface ReportSearchParams {
  page?: number;
  pageSize?: number;
  /** Tìm theo mã báo cáo, mô tả, hoặc địa chỉ — không phân biệt hoa/thường */
  keyword?: string;
  status?: ReportWorkflowStatus;
  categoryId?: string;
  wardCode?: string;
  severity?: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface ReportSearchItem {
  id: string;
  code: string;
  categoryCode: string;
  categoryName: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: ReportWorkflowStatus;
  latitude: number;
  longitude: number;
  address: string | null;
  wardCode: string | null;
  reporterCount: number;
  createdAt: string;
  resolvedAt: string | null;
}

export interface ReportSearchResponse {
  items: ReportSearchItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
