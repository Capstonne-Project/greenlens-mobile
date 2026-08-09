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
  ReportInspectionsResponse,
  EvidenceUploadItem,
  UpdateChecklistDto,
  UpdateInspectionDetailsDto,
  UploadEvidenceInput,
  UploadEvidenceResult,
} from '@/types/inspection.types';
import { uploadReportImage } from '@/services/pollutionReport.service';

/** Video evidence tới 30MB — axios default 15s quá ngắn cho mạng 4G. */
const EVIDENCE_UPLOAD_TIMEOUT_MS = 120_000;

export interface InspectionQueueParams {
  status?: string;
  page?: number;
  pageSize?: number;
}

export const inspectionService = {
  getQueue: (params?: InspectionQueueParams) =>
    api.get<ApiEnvelope<InspectionQueueResponse>>('/inspections/queue', { params }),

  /** BR-INS-032 — KPI đoàn thanh tra. Inspector tự xem team mình (bỏ teamId). */
  getKpi: (params?: InspectionKpiParams) =>
    api.get<ApiEnvelope<InspectionTeamKpi>>('/inspections/kpi', { params }),

  getDetail: (id: string) => api.get<ApiEnvelope<InspectionDetail>>(`/inspections/${id}`),

  updateDetails: (id: string, dto: UpdateInspectionDetailsDto) =>
    api.put<void>(`/inspections/${id}/details`, dto),

  /** BR-INS-033 — Draft → InProgress. Thay cho `POST /check-in` (410 Gone). */
  accept: (id: string) => api.post<void>(`/inspections/${id}/accept`),

  /** GPS mềm — > 200m thì `note` bắt buộc (BE từ chối nếu thiếu). */
  confirmArrival: (id: string, dto: ConfirmArrivalDto) =>
    api.post<void>(`/inspections/${id}/confirm-arrival`, dto),

  /** Text checklist — ViolationStatus bắt buộc, Other tùy chọn. */
  updateChecklist: (id: string, dto: UpdateChecklistDto) =>
    api.put<void>(`/inspections/${id}/checklist`, dto),

  /**
   * File evidence — BE đã đổi sang JSON (`[Consumes("application/json")]`).
   * Luồng: presign (purpose=InspectionEvidence) → PUT thẳng R2 → POST publicUrl.
   * BE validate URL phải nằm trong `reports/{reportId}/inspection/{id}/{category}` nên
   * bắt buộc presign kèm `inspectionId` + `evidenceCategory`.
   */
  uploadEvidence: async (
    id: string,
    { category, files, description }: UploadEvidenceInput,
  ) => {
    const items: EvidenceUploadItem[] = [];

    // Tuần tự — mạng 4G ngoài hiện trường, tránh nghẽn khi có video 30MB.
    for (const file of files) {
      const uploaded = await uploadReportImage({
        uri: file.uri,
        fileName: file.fileName,
        mimeType: file.mimeType,
        purpose: 'InspectionEvidence',
        inspectionId: id,
        evidenceCategory: category,
      });
      items.push({
        url: uploaded.url,
        contentType: uploaded.mimeType,
        sizeBytes: uploaded.sizeBytes,
        ...(file.durationSeconds ? { durationSeconds: file.durationSeconds } : {}),
      });
    }

    return api.post<ApiEnvelope<UploadEvidenceResult>>(
      `/inspections/${id}/evidence`,
      { category, items, description: description ?? null },
      { timeout: EVIDENCE_UPLOAD_TIMEOUT_MS },
    );
  },

  /** Chỉ Team Leader — mở gate cho issue-penalty / close-no-violation. Không có body. */
  submitFieldReport: (id: string) => api.put<void>(`/inspections/${id}/submit-field-report`),

  issuePenalty: (id: string, dto: IssuePenaltyDto) =>
    api.put<void>(`/inspections/${id}/issue-penalty`, dto),

  closeNoViolation: (id: string, dto: CloseNoViolationDto) =>
    api.put<void>(`/inspections/${id}/close-no-violation`, dto),

  // record-payment: chuyển sang LEO trên web portal — Inspector không còn quyền ghi nhận nộp phạt.

  close: (id: string, dto?: CloseInspectionDto) =>
    api.put<void>(`/inspections/${id}/close`, dto ?? {}),

  /** BR-INS-003 — từ chối trong 24h sau khi được gán. */
  decline: (id: string, reason: string) =>
    api.post<void>(`/inspections/${id}/decline`, { reason }),

  getPayments: (id: string) =>
    api.get<ApiEnvelope<PaymentHistoryResponse>>(`/inspections/${id}/payments`),

  getReportInspections: (reportId: string) =>
    api.get<ApiEnvelope<ReportInspectionsResponse>>(`/reports/${reportId}/inspections`),
};
