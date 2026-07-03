import type { PaginatedItems } from '@/types/api.types';

export type InspectionStatus =
  | 'Draft'
  | 'PenaltyIssued'
  | 'PartiallyPaid'
  | 'Overdue'
  | 'Paid'
  | 'Closed'
  | 'ClosedNoViolation';

export type ViolationLevel = 'Minor' | 'Moderate' | 'Severe' | 'Critical';

export interface InspectionQueueItem {
  id: string;
  reportId: string;
  reportCode: string;
  status: InspectionStatus;
  address: string;
  wardCode?: string;
  violatorName: string;
  violationDescription?: string | null;
  violationLevel?: ViolationLevel | null;
  penaltyAmount?: number | null;
  isRepeatOffender: boolean;
  slaInspectionDueAt?: string | null;
  createdAt: string;
}

export type InspectionQueueResponse = PaginatedItems<InspectionQueueItem>;

export interface InspectionDetail {
  id: string;
  reportId: string;
  reportCode: string;
  status: InspectionStatus;
  assignedTeamId: string;
  assignedTeamName: string;
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
  createdByOfficerName: string;
  issuedByInspectorId?: string | null;
  issuedByInspectorName?: string | null;
  slaInspectionDueAt?: string | null;
  closedAt?: string | null;
  closedReason?: string | null;
  createdAt: string;
  canEditDetails: boolean;
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

export interface RecordPaymentDto {
  paidAmount: number;
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
