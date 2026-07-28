import type { ApiPagination } from '@/types/api.types';
import type { ReportStatus, ReportWorkflowStatus } from '@/types/report-status.types';

export type AssignmentStatus =
  | 'Assigned'
  | 'InProgress'
  | 'Completed'
  | 'Declined'
  | 'Escalated';

export type { ReportStatus };

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
  reportStatus: ReportWorkflowStatus;
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

/** BE trả `{ items, pagination }` (PaginationMeta) — không phải totalCount/page/pageSize phẳng. */
export interface MyAssignmentsResponse {
  items: AssignmentItem[];
  pagination: ApiPagination;
}

export interface MyAssignmentsParams {
  page?: number;
  pageSize?: number;
  assignmentStatus?: AssignmentStatus;
}

// ─── Progress stats (dashboard "Tiến độ") ──────────────────────────────────────

export interface StatusCountItem {
  status: AssignmentStatus;
  count: number;
}

export interface SeverityCountItem {
  severity: SeverityLevel;
  count: number;
}

export interface DailyCompletionItem {
  /** yyyy-MM-dd */
  date: string;
  count: number;
}

export interface MyTaskProgressStats {
  totalCount: number;
  statusCounts: StatusCountItem[];
  severityCounts: SeverityCountItem[];
  overdueCount: number;
  completionTrend: DailyCompletionItem[];
}

// ─── Detail ───────────────────────────────────────────────────────────────────

export interface TaskDetailImage {
  url: string;
  mimeType: string;
}

export interface TaskWasteTag {
  code: string;
  nameVi: string;
  nameEn?: string | null;
  iconUrl?: string | null;
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
  reportStatus: ReportWorkflowStatus;
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
  wasteTags?: TaskWasteTag[];

  progressPercent: number;
  progressNote: string | null;
  progressUpdatedAt: string | null;
  progressUpdatedByUserId: string | null;

  assignmentNote: string | null;

  /** AssignedAt + 24h — hạn từ chối khi còn Assigned */
  declineDeadlineAt?: string | null;
  /** Đã có ≥1 ảnh MediaType.Before */
  hasBeforeImages?: boolean;
  beforeImageCount?: number;
  /** Soft SLA: cập nhật tiến độ ít nhất 1 lần / 24h khi InProgress */
  progressRequiredByAt?: string | null;
}

// ─── Progress history ─────────────────────────────────────────────────────────

export interface ProgressHistoryItem {
  reportId: string;
  reportCode: string;
  assignmentId: string;
  assignmentStatus: AssignmentStatus;
  reportStatus: ReportWorkflowStatus;
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
  teamId?: string;
  reason: string;
}

/** POST /teams/my-tasks/{reportId}/escalate — reason ≥ 20 ký tự */
export interface EscalateAssignmentDto {
  teamId: string;
  reason: string;
}

export interface LocalImageUpload {
  uri: string;
  mimeType?: string;
  fileName?: string;
}

export interface UpdateProgressDto {
  progressPercent: number;
  progressNote?: string;
  images?: LocalImageUpload[];
}

export interface UpdateProgressResult {
  uploadedImageUrls: string[];
}

/** POST /reports/{reportId}/before-images — ảnh hiện trạng trước khi dọn */
export interface UploadBeforeImagesDto {
  images: LocalImageUpload[];
}

export interface UploadBeforeImagesResult {
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
