import { api } from './api';
import type { ApiEnvelope } from '@/types/api.types';
import type {
  CloseInspectionDto,
  CloseNoViolationDto,
  InspectionDetail,
  InspectionQueueResponse,
  IssuePenaltyDto,
  RecordPaymentDto,
  ReportInspectionsResponse,
  UpdateInspectionDetailsDto,
} from '@/types/inspection.types';

export interface InspectionQueueParams {
  status?: string;
  page?: number;
  pageSize?: number;
}

export const inspectionService = {
  getQueue: (params?: InspectionQueueParams) =>
    api.get<ApiEnvelope<InspectionQueueResponse>>('/inspections/queue', { params }),

  getDetail: (id: string) =>
    api.get<ApiEnvelope<InspectionDetail>>(`/inspections/${id}`),

  updateDetails: (id: string, dto: UpdateInspectionDetailsDto) =>
    api.put<void>(`/inspections/${id}/details`, dto),

  issuePenalty: (id: string, dto: IssuePenaltyDto) =>
    api.put<void>(`/inspections/${id}/issue-penalty`, dto),

  closeNoViolation: (id: string, dto: CloseNoViolationDto) =>
    api.put<void>(`/inspections/${id}/close-no-violation`, dto),

  recordPayment: (id: string, dto: RecordPaymentDto) =>
    api.put<void>(`/inspections/${id}/record-payment`, dto),

  close: (id: string, dto?: CloseInspectionDto) =>
    api.put<void>(`/inspections/${id}/close`, dto ?? {}),

  getReportInspections: (reportId: string) =>
    api.get<ApiEnvelope<ReportInspectionsResponse>>(`/reports/${reportId}/inspections`),
};
