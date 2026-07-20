import type { AssignmentItem, AssignmentStatus, TaskDetail } from '@/types/cleanup-assignment.types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DECLINE_WINDOW_MS = 24 * 60 * 60 * 1000;

export function isTaskUuid(value: string | undefined | null): boolean {
  if (!value) return false;
  return UUID_RE.test(value.trim());
}

/** Raw item từ BE — flat, nested `report`, hoặc company-assignment shape */
interface RawAssignmentItem {
  reportId?: string;
  pollutionReportId?: string;
  reportCode?: string;
  code?: string;
  assignmentId?: string;
  id?: string;
  assignmentStatus?: string;
  status?: string;
  categoryCode?: string;
  categoryName?: string;
  severity?: string;
  reportStatus?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  wardCode?: string;
  note?: string | null;
  assignedAt?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  slaResolveDueAt?: string | null;
  firstImageUrl?: string | null;
  progressPercent?: number;
  progressNote?: string | null;
  progressUpdatedAt?: string | null;
  canDecline?: boolean;
  canUpdateProgress?: boolean;
  canResolve?: boolean;
  report?: {
    reportId?: string;
    id?: string;
    code?: string;
    categoryName?: string;
    categoryCode?: string;
    severity?: string;
    status?: string;
    address?: string;
    wardCode?: string;
    latitude?: number;
    longitude?: number;
    slaResolveDueAt?: string | null;
    firstImageUrl?: string | null;
  };
}

export interface TaskIds {
  reportId: string;
  assignmentId: string;
}

/** Expo Router có thể trả string | string[] */
export function firstRouteParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0]?.trim() ?? '';
  return value?.trim() ?? '';
}

/**
 * BE có thể trả:
 * - `{ reportId, assignmentId }`
 * - `{ id: reportId, assignmentId }` (không có field reportId)
 * - `{ id: assignmentId, report: { id: reportId } }`
 *
 * Lưu ý: mọi API task mobile dùng `reportId`. Không tự alias `assignmentId`
 * thành `reportId` nếu BE không trả đủ dữ liệu, vì sẽ gọi sai endpoint.
 */
export function resolveTaskIds(raw: RawAssignmentItem): TaskIds {
  const report = raw.report;
  const nestedReportId = report?.reportId ?? report?.id ?? '';
  const explicitReportId = raw.reportId ?? raw.pollutionReportId ?? nestedReportId;
  const explicitAssignmentId = raw.assignmentId ?? '';
  const topId = raw.id?.trim() ?? '';

  let reportId = isTaskUuid(explicitReportId) ? explicitReportId : '';
  let assignmentId = isTaskUuid(explicitAssignmentId) ? explicitAssignmentId : '';

  if (topId && isTaskUuid(topId)) {
    if (assignmentId && topId !== assignmentId && !reportId) {
      reportId = topId;
    } else if (reportId && topId !== reportId && !assignmentId) {
      assignmentId = topId;
    } else if (!reportId && !assignmentId) {
      if (nestedReportId && topId !== nestedReportId) {
        assignmentId = topId;
      } else {
        reportId = topId;
      }
    } else if (!reportId && assignmentId && topId !== assignmentId) {
      reportId = topId;
    } else if (reportId && !assignmentId && topId !== reportId) {
      assignmentId = topId;
    }
  }

  if (!assignmentId) assignmentId = reportId;

  return { reportId, assignmentId };
}

export function deriveAssignmentFlags(
  assignmentStatus: AssignmentStatus,
  assignedAt: string | null | undefined,
  overrides?: Pick<TaskDetail, 'canDecline' | 'canUpdateProgress' | 'canResolve'>,
  hasBeforeImages = false,
): Pick<TaskDetail, 'canDecline' | 'canUpdateProgress' | 'canResolve'> {
  if (overrides) {
    return {
      canDecline: overrides.canDecline ?? false,
      canUpdateProgress: overrides.canUpdateProgress ?? false,
      canResolve: overrides.canResolve ?? false,
    };
  }

  const inProgress = assignmentStatus === 'InProgress';
  const canDecline =
    assignmentStatus === 'Assigned' &&
    !!assignedAt &&
    Date.now() - new Date(assignedAt).getTime() < DECLINE_WINDOW_MS;

  return {
    canDecline,
    canUpdateProgress: inProgress,
    canResolve: inProgress && hasBeforeImages,
  };
}

export function normalizeAssignmentItem(raw: RawAssignmentItem): AssignmentItem {
  const report = raw.report;
  const { reportId, assignmentId } = resolveTaskIds(raw);
  const reportCode = raw.reportCode ?? raw.code ?? report?.code ?? '';

  return {
    reportId,
    reportCode,
    assignmentId,
    assignmentStatus: (raw.assignmentStatus ?? raw.status ?? 'Assigned') as AssignmentItem['assignmentStatus'],
    categoryCode: raw.categoryCode ?? '',
    categoryName: raw.categoryName ?? report?.categoryName ?? '',
    severity: (raw.severity ?? report?.severity ?? 'Medium') as AssignmentItem['severity'],
    reportStatus: (raw.reportStatus ?? report?.status ?? 'InProgress') as AssignmentItem['reportStatus'],
    latitude: raw.latitude ?? report?.latitude ?? 0,
    longitude: raw.longitude ?? report?.longitude ?? 0,
    address: raw.address ?? report?.address ?? '',
    wardCode: raw.wardCode ?? report?.wardCode ?? '',
    note: raw.note ?? null,
    assignedAt: raw.assignedAt ?? '',
    startedAt: raw.startedAt ?? null,
    completedAt: raw.completedAt ?? null,
    slaResolveDueAt: raw.slaResolveDueAt ?? report?.slaResolveDueAt ?? null,
    firstImageUrl: raw.firstImageUrl ?? report?.firstImageUrl ?? null,
  };
}

export function normalizeMyTasksItems(data: unknown): AssignmentItem[] {
  if (!data || typeof data !== 'object') return [];
  const payload = data as { items?: unknown[] };
  if (!Array.isArray(payload.items)) return [];
  return payload.items.map((item) => normalizeAssignmentItem(item as RawAssignmentItem));
}

export function normalizeTaskDetail(raw: TaskDetail & { media?: TaskDetail['reportImages'] }): TaskDetail {
  if (!raw.reportImages?.length && raw.media?.length) {
    return { ...raw, reportImages: raw.media };
  }
  return raw;
}

export interface TaskRouteParams {
  id: string;
  assignmentId: string;
}

/** URL segment `[id]` = reportId (GET/detail/mutations). assignmentId chỉ giữ để key UI/local store. */
export function getTaskRouteParams(item: Pick<AssignmentItem, 'assignmentId' | 'reportId'>): TaskRouteParams {
  const reportId = isTaskUuid(item.reportId) ? item.reportId : '';
  const assignmentId = isTaskUuid(item.assignmentId) ? item.assignmentId : item.reportId;
  return {
    id: reportId,
    assignmentId,
  };
}
