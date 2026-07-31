import { api } from './api';
import type { ApiEnvelope } from '@/types/api.types';
import type { InspectionKpiParams, InspectionTeamKpi } from '@/types/inspection-kpi.types';
import type {
  CloseInspectionDto,
  CloseNoViolationDto,
  ConfirmArrivalDto,
  InspectionDetail,
  InspectionQueueResponse,
  IssuePenaltyDto,
  PaymentHistoryResponse,
  RecordPaymentInput,
  ReportInspectionsResponse,
  UpdateChecklistDto,
  UpdateInspectionDetailsDto,
  UploadEvidenceInput,
} from '@/types/inspection.types';
// MOCK — xoá dòng import này + khối `if (USE_INSPECTION_MOCK)` bên dưới khi có BE thật.
import {
  mockAccept,
  mockClose,
  mockCloseNoViolation,
  mockConfirmArrival,
  mockGetDetail,
  mockGetKpi,
  mockGetQueue,
  mockIssuePenalty,
  mockRecordPayment,
  mockSubmitFieldReport,
  mockUpdateChecklist,
  mockUploadEvidence,
  USE_INSPECTION_MOCK,
} from '@/mocks/inspection-mock-data';

/** Bọc envelope `{ code, message, status, data }` giống response thật để hook không cần đổi. */
function asEnvelopeResponse<T>(data: T): Promise<{ data: ApiEnvelope<T> }> {
  return Promise.resolve({
    data: { code: 'MOCK_OK', message: 'mock', status: 200, data },
  });
}

/** Video evidence tới 30MB — axios default 15s quá ngắn cho mạng 4G. */
const EVIDENCE_UPLOAD_TIMEOUT_MS = 120_000;

export interface InspectionQueueParams {
  status?: string;
  page?: number;
  pageSize?: number;
}

export const inspectionService = {
  getQueue: (params?: InspectionQueueParams) => {
    if (USE_INSPECTION_MOCK) return mockGetQueue(params?.status).then(asEnvelopeResponse);
    return api.get<ApiEnvelope<InspectionQueueResponse>>('/inspections/queue', { params });
  },

  /** BR-INS-032 — KPI đoàn thanh tra. Inspector tự xem team mình (bỏ teamId). */
  getKpi: (params?: InspectionKpiParams) => {
    if (USE_INSPECTION_MOCK) return mockGetKpi().then(asEnvelopeResponse);
    return api.get<ApiEnvelope<InspectionTeamKpi>>('/inspections/kpi', { params });
  },

  getDetail: (id: string) => {
    if (USE_INSPECTION_MOCK) return mockGetDetail(id).then(asEnvelopeResponse);
    return api.get<ApiEnvelope<InspectionDetail>>(`/inspections/${id}`);
  },

  updateDetails: (id: string, dto: UpdateInspectionDetailsDto) =>
    api.put<void>(`/inspections/${id}/details`, dto),

  /** BR-INS-033 — Draft → InProgress. Thay cho `POST /check-in` (410 Gone). */
  accept: (id: string) => {
    if (USE_INSPECTION_MOCK) return mockAccept(id);
    return api.post<void>(`/inspections/${id}/accept`);
  },

  /** GPS mềm — > 200m thì `note` bắt buộc (BE từ chối nếu thiếu). */
  confirmArrival: (id: string, dto: ConfirmArrivalDto) => {
    if (USE_INSPECTION_MOCK) return mockConfirmArrival(id, dto.latitude, dto.longitude, dto.note);
    return api.post<void>(`/inspections/${id}/confirm-arrival`, dto);
  },

  /** Text checklist — ViolationStatus bắt buộc, Other tùy chọn. */
  updateChecklist: (id: string, dto: UpdateChecklistDto) => {
    if (USE_INSPECTION_MOCK) return mockUpdateChecklist(id, dto.violationStatusText, dto.otherDescription);
    return api.put<void>(`/inspections/${id}/checklist`, dto);
  },

  /**
   * File evidence — BE nhận `category`, `files[]`, `description` qua form field
   * (`[FromForm]`), KHÔNG phải query param.
   */
  uploadEvidence: (
    id: string,
    { category, uri, fileName, mimeType, description }: UploadEvidenceInput,
  ) => {
    if (USE_INSPECTION_MOCK) return mockUploadEvidence(id, category);
    const formData = new FormData();
    formData.append('category', category);
    formData.append('files', { uri, name: fileName, type: mimeType } as unknown as Blob);
    if (description) formData.append('description', description);
    return api.post<void>(`/inspections/${id}/evidence`, formData, {
      timeout: EVIDENCE_UPLOAD_TIMEOUT_MS,
    });
  },

  /** Chỉ Team Leader — mở gate cho issue-penalty / close-no-violation. Không có body. */
  submitFieldReport: (id: string) => {
    if (USE_INSPECTION_MOCK) return mockSubmitFieldReport(id);
    return api.put<void>(`/inspections/${id}/submit-field-report`);
  },

  issuePenalty: (id: string, dto: IssuePenaltyDto) => {
    if (USE_INSPECTION_MOCK) {
      return mockIssuePenalty(
        id,
        dto.violationLevel,
        dto.penaltyAmount,
        dto.decisionNumber,
        dto.paymentDueDays,
        dto.additionalMeasures,
      );
    }
    return api.put<void>(`/inspections/${id}/issue-penalty`, dto);
  },

  closeNoViolation: (id: string, dto: CloseNoViolationDto) => {
    if (USE_INSPECTION_MOCK) return mockCloseNoViolation(id, dto.reason);
    return api.put<void>(`/inspections/${id}/close-no-violation`, dto);
  },

  /** multipart/form-data — `receipt` (biên lai) bắt buộc theo BR-INS-033. */
  recordPayment: (id: string, { paidAmount, paidAt, receipt, note }: RecordPaymentInput) => {
    if (USE_INSPECTION_MOCK) return mockRecordPayment(id, paidAmount, note);
    const formData = new FormData();
    formData.append('paidAmount', String(paidAmount));
    formData.append('paidAt', paidAt);
    formData.append('receipt', {
      uri: receipt.uri,
      name: receipt.fileName,
      type: receipt.mimeType,
    } as unknown as Blob);
    if (note) formData.append('note', note);
    return api.put<void>(`/inspections/${id}/record-payment`, formData, {
      timeout: EVIDENCE_UPLOAD_TIMEOUT_MS,
    });
  },

  close: (id: string, dto?: CloseInspectionDto) => {
    if (USE_INSPECTION_MOCK) return mockClose(id, dto?.reason);
    return api.put<void>(`/inspections/${id}/close`, dto ?? {});
  },

  /** BR-INS-003 — từ chối trong 24h sau khi được gán. */
  decline: (id: string, reason: string) =>
    api.post<void>(`/inspections/${id}/decline`, { reason }),

  getPayments: (id: string) =>
    api.get<ApiEnvelope<PaymentHistoryResponse>>(`/inspections/${id}/payments`),

  getReportInspections: (reportId: string) =>
    api.get<ApiEnvelope<ReportInspectionsResponse>>(`/reports/${reportId}/inspections`),
};
