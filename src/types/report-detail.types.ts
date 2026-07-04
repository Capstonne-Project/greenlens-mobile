import type { ReportWorkflowStatus } from '@/types/report-status.types';

export type { ReportWorkflowStatus } from '@/types/report-status.types';

export type ReportDetailSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface ReportMediaItem {
  id?: string;
  url: string;
  mediaType?: string;
}

export interface ReportAssignmentItem {
  teamName: string;
  status: string;
  progressPercent: number;
  progressNote?: string | null;
}

export interface ReportDetailWasteTag {
  id: string;
  code?: string;
  nameVi: string;
}

export interface ReportDetail {
  id: string;
  code: string;
  reporterId: string | null;
  status: ReportWorkflowStatus;
  categoryName: string;
  categoryCode?: string;
  severity: ReportDetailSeverity;
  description: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  reporterCount: number;
  reopenedCount: number;
  media: ReportMediaItem[];
  assignments: ReportAssignmentItem[];
  wasteTags: ReportDetailWasteTag[];
  createdAt: string;
  verifiedAt?: string | null;
  startedAt?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  slaVerifyDueAt?: string | null;
  slaResolveDueAt?: string | null;
}

export interface ReportHistoryItem {
  fromStatus: string | null;
  toStatus: string;
  changedByName: string | null;
  reason: string | null;
  createdAt: string;
}

export interface ReportHistoryResponse {
  items: ReportHistoryItem[];
}

export type ReportDetailSource = 'tab' | 'map';
