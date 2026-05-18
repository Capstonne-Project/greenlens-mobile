export type AssignmentStatus = 'Assigned' | 'InProgress' | 'Completed' | 'Declined';

export type ReportStatus =
  | 'Pending'
  | 'Verified'
  | 'Assigned'
  | 'InProgress'
  | 'Resolved'
  | 'Closed'
  | 'Rejected';

export type SeverityLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface AssignmentItem {
  reportId: string;
  reportCode: string;
  assignmentId: string;
  assignmentStatus: AssignmentStatus;
  reportStatus: ReportStatus;
  categoryCode: string;
  categoryName: string;
  severity: SeverityLevel;
  latitude: number;
  longitude: number;
  address: string;
  wardCode: string;
  note: string | null;
  assignedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  slaResolveDueAt: string | null;
  firstImageUrl: string | null;
}

export interface MyAssignmentsResponse {
  items: AssignmentItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface MyAssignmentsParams {
  page?: number;
  pageSize?: number;
  assignmentStatus?: AssignmentStatus;
}

export interface AcceptAssignmentDto {
  teamId: string;
}

export interface DeclineAssignmentDto {
  teamId: string;
  reason: string;
}

export interface UploadProgressImageDto {
  teamId: string;
  imageUri: string;
  mimeType?: string;
  fileName?: string;
}

export interface UploadProgressImageResult {
  imageUrl: string;
}

export interface UpdateProgressDto {
  teamId: string;
  progressPercent: number;
  progressNote?: string;
}

export interface ResolveAssignmentDto {
  teamId: string;
  afterImageUrls: string[];
}

export interface AssignmentStats {
  newlyAssigned: number;
  today: number;
  inProgress: number;
  nearSla: number;
  escalated: number;
  pendingUpload: number;
}

// ─── Report Detail ────────────────────────────────────────────────────────────

export interface ReportMedia {
  id: string;
  mediaType: 'Image' | 'Video';
  url: string;
  mimeType: string;
  sizeBytes: number;
}

export interface ReportAssignment {
  id: string;
  teamId: string;
  teamName: string;
  teamType: string;
  status: AssignmentStatus;
  note: string | null;
  assignedAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface ReportDetail {
  id: string;
  code: string;
  reporterId: string;
  isAnonymous: boolean;
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  severity: SeverityLevel;
  severitySetBy: string;
  status: ReportStatus;
  latitude: number;
  longitude: number;
  address: string;
  wardCode: string;
  provinceCode: string;
  priorityScore: number;
  reporterCount: number;
  reopenedCount: number;
  assignedOfficerId: string | null;
  media: ReportMedia[];
  assignments: ReportAssignment[];
  description?: string | null;
  officerNote?: string | null;
  createdAt: string;
  startedAt?: string | null;
  slaVerifyDueAt?: string | null;
  slaResolveDueAt?: string | null;
}
