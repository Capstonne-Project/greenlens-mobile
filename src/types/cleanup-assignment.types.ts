export type AssignmentStatus = 'Assigned' | 'InProgress' | 'Completed' | 'Declined';

export type ReportStatus =
  | 'Submitted'
  | 'Verified'
  | 'InProgress'
  | 'Resolved'
  | 'PenaltyIssued'
  | 'Closed'
  | 'Rejected'
  | 'Duplicate';

export type SeverityLevel = 'Low' | 'Medium' | 'High' | 'Critical';

// ─── List ─────────────────────────────────────────────────────────────────────

export interface AssignmentItem {
  reportId: string;
  reportCode: string;
  assignmentId: string;
  assignmentStatus: AssignmentStatus;
  categoryCode: string;
  categoryName: string;
  severity: SeverityLevel;
  reportStatus: ReportStatus;
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

// ─── Detail ───────────────────────────────────────────────────────────────────

export interface TaskDetailImage {
  url: string;
  mimeType: string;
}

export interface TaskDetail {
  assignmentId: string;
  assignmentStatus: AssignmentStatus;
  assignedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  canDecline: boolean;
  canUpdateProgress: boolean;
  canResolve: boolean;

  reportId: string;
  reportCode: string;
  reportStatus: ReportStatus;
  categoryCode: string;
  categoryName: string;
  severity: SeverityLevel;
  description: string;
  latitude: number;
  longitude: number;
  address: string;
  wardCode: string;

  slaResolveDueAt: string | null;
  reportImages: TaskDetailImage[];

  progressPercent: number;
  progressNote: string | null;
  progressUpdatedAt: string | null;
  progressUpdatedByUserId: string | null;

  assignmentNote: string | null;
}

// ─── Progress history ─────────────────────────────────────────────────────────

export interface ProgressHistoryItem {
  reportId: string;
  reportCode: string;
  assignmentId: string;
  assignmentStatus: AssignmentStatus;
  reportStatus: ReportStatus;
  progressPercent: number;
  progressNote: string | null;
  progressUpdatedAt: string | null;
  progressUpdatedByUserId: string | null;
  assignedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface MyProgressResponse {
  items: ProgressHistoryItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// ─── Team profile ─────────────────────────────────────────────────────────────

export interface TeamMember {
  userId: string;
  fullName: string;
  email: string;
  isLeader: boolean;
}

export interface TeamProfile {
  id: string;
  name: string;
  teamType: string;
  isActive: boolean;
  members: TeamMember[];
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface AcceptAssignmentDto {
  teamId: string;
}

export interface DeclineAssignmentDto {
  teamId: string;
  reason: string;
}

export interface UpdateProgressDto {
  progressPercent: number;
  progressNote?: string;
  images?: { uri: string; mimeType?: string; fileName?: string }[];
}

export interface UpdateProgressResult {
  uploadedImageUrls: string[];
}

export interface ResolveAssignmentDto {
  afterImageUrls: string[];
}

// ─── Stats (for home dashboard) ───────────────────────────────────────────────

export interface AssignmentStats {
  newlyAssigned: number;
  today: number;
  inProgress: number;
  nearSla: number;
  escalated: number;
  pendingUpload: number;
}
