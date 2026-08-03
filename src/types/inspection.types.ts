import type { PaginatedItems } from '@/types/api.types';

export type InspectionStatus =
  | 'Draft'
  /** BR-INS-033 — sau `POST /accept`, trước khi submit field report */
  | 'InProgress'
  | 'PenaltyIssued'
  | 'PartiallyPaid'
  | 'Overdue'
  | 'Paid'
  | 'Closed'
  | 'ClosedNoViolation';

export type ViolationLevel = 'Minor' | 'Moderate' | 'Severe' | 'Critical';

/** Checklist cố định BR-INS-033 — không cho FE tự thêm category. */
export type ChecklistCategory =
  | 'ViolationStatus'
  | 'ScenePhoto'
  | 'Video'
  | 'Audio'
  | 'Other';

/** Category upload qua `POST /evidence` (ViolationStatus đi qua `PUT /checklist`). */
export type EvidenceCategory = Extract<ChecklistCategory, 'ScenePhoto' | 'Video' | 'Audio' | 'Other'>;

export interface InspectionQueueItem {
  id: string;
  reportId: string;
  reportCode: string;
  status: InspectionStatus;
  address?: string | null;
  wardCode?: string | null;
  violatorName?: string | null;
  violationDescription?: string | null;
  violationLevel?: ViolationLevel | null;
  penaltyAmount?: number | null;
  isRepeatOffender: boolean;
  slaInspectionDueAt?: string | null;
  createdAt: string;
  /** Toạ độ hiện trường (từ Report) — cho map view. */
  latitude: number;
  longitude: number;
}

export type InspectionQueueResponse = PaginatedItems<InspectionQueueItem>;

/**
 * Một dòng `checklistEvidence` — BE lưu cả text lẫn file cùng bảng.
 * `ViolationStatus`/`Other` dạng text: `mediaUrl` null, nội dung nằm ở `description`.
 */
export interface InspectionEvidenceItem {
  id: string;
  category: ChecklistCategory;
  mediaUrl?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  description?: string | null;
  durationSeconds?: number | null;
  uploadedAt: string;
}

/** Một lần nộp phạt — BR-INS-020. */
export interface PenaltyPayment {
  id: string;
  amount: number;
  paidAt: string;
  evidenceUrl?: string | null;
  note?: string | null;
  recordedByUserId: string;
  recordedByUserName?: string | null;
  createdAt: string;
}

/** `GET /inspections/{id}/payments` — BR-INS-020. */
export interface PaymentHistoryResponse {
  inspectionId: string;
  penaltyAmount?: number | null;
  paidAmount?: number | null;
  remainingAmount: number;
  payments: PenaltyPayment[];
}

export type ViolatorType = 'Individual' | 'Organization';

export interface ViolatingEntityEmbedded {
  id: string;
  name: string;
  type: ViolatorType;
  address?: string | null;
  taxCode?: string | null;
  identityNumber?: string | null;
  phoneNumber?: string | null;
}

export interface InspectionDetail {
  id: string;
  reportId: string;
  reportCode: string;
  status: InspectionStatus;
  /** Null khi LEO chưa gán đoàn. */
  assignedTeamId?: string | null;
  assignedTeamName?: string | null;
  violationDescription?: string | null;
  violatorName?: string | null;
  violatorAddress?: string | null;
  violatorIdentity?: string | null;
  violationLevel?: ViolationLevel | null;
  penaltyAmount?: number | null;
  penaltyDecisionNumber?: string | null;
  penaltyIssuedAt?: string | null;
  penaltyDueDate?: string | null;
  paidAmount?: number | null;
  additionalPenaltyMeasures?: string | null;
  isRepeatOffender: boolean;
  createdByOfficerId: string;
  createdByOfficerName?: string | null;
  issuedByInspectorId?: string | null;
  issuedByInspectorName?: string | null;
  slaInspectionDueAt?: string | null;
  closedAt?: string | null;
  closedReason?: string | null;
  createdAt: string;

  /** Đối tượng vi phạm đã liên kết (nếu LEO/Inspector đã gán). */
  violatingEntityId?: string | null;
  violatingEntity?: ViolatingEntityEmbedded | null;
  /** Lịch sử nộp phạt — mới nhất trước. */
  payments: PenaltyPayment[];

  /** Checklist workflow BR-INS-033 */
  acceptedAt?: string | null;
  acceptedByUserId?: string | null;
  arrivalConfirmedAt?: string | null;
  /** Toạ độ inspector đã báo khi confirm-arrival (không phải toạ độ hiện trường). */
  arrivalLatitude?: number | null;
  arrivalLongitude?: number | null;
  arrivalNote?: string | null;
  fieldInvestigationSubmittedAt?: string | null;
  fieldInvestigationSubmittedByUserId?: string | null;
  /** Gồm cả dòng text (ViolationStatus/Other) lẫn file — phân biệt qua `mediaUrl`. */
  checklistEvidence: InspectionEvidenceItem[];

  canEditDetails: boolean;
  /** BR-INS-033 flags */
  canAcceptTask: boolean;
  canConfirmArrival: boolean;
  canEditChecklist: boolean;
  canSubmitFieldReport: boolean;
  /** Chỉ true SAU khi submit field report — không còn gate theo Draft. */
  canIssuePenalty: boolean;
  canCloseNoViolation: boolean;
  canRecordPayment: boolean;
  canClose: boolean;
}

export interface UpdateInspectionDetailsDto {
  violationDescription?: string;
  violatorName?: string;
  violatorAddress?: string;
  violatorIdentity?: string;
}

export interface IssuePenaltyDto {
  violationLevel: ViolationLevel;
  penaltyAmount: number;
  decisionNumber: string;
  paymentDueDays: number;
  additionalMeasures?: string;
}

export interface CloseNoViolationDto {
  reason: string;
}

/**
 * GPS mềm — `note` BẮT BUỘC khi lệch > 200m so với toạ độ hiện trường.
 * Gửi kèm toạ độ thực tế của inspector để BE tự tính khoảng cách.
 */
export interface ConfirmArrivalDto {
  latitude: number;
  longitude: number;
  note?: string;
}

export const ARRIVAL_DISTANCE_THRESHOLD_M = 200;

/** `PUT /checklist` — BE nhận `violationStatusText` + `otherDescription`. */
export interface UpdateChecklistDto {
  violationStatusText: string;
  otherDescription?: string;
}

export interface UploadEvidenceInput {
  category: EvidenceCategory;
  uri: string;
  fileName: string;
  mimeType: string;
  description?: string;
}

/** Giới hạn theo doc — Video ≤ 30MB, Audio ≤ 10MB. */
export const EVIDENCE_MAX_BYTES: Partial<Record<EvidenceCategory, number>> = {
  Video: 30 * 1024 * 1024,
  Audio: 10 * 1024 * 1024,
};

/** Số ảnh hiện trường tối thiểu để checklist đạt. */
export const SCENE_PHOTO_MINIMUM = 2;

/** `PUT /record-payment` là **multipart** — `receipt` bắt buộc. */
export interface RecordPaymentInput {
  paidAmount: number;
  paidAt: string;
  receipt: {
    uri: string;
    fileName: string;
    mimeType: string;
  };
  note?: string;
}

export interface CloseInspectionDto {
  reason?: string;
}

export interface ReportInspectionLink {
  id: string;
  status: InspectionStatus;
  violatorName?: string | null;
  violationLevel?: ViolationLevel | null;
  penaltyAmount?: number | null;
  paidAmount?: number | null;
  isRepeatOffender: boolean;
  createdByOfficerId: string;
  createdByOfficerName: string;
  slaInspectionDueAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
}

export interface ReportInspectionsResponse {
  items: ReportInspectionLink[];
}
