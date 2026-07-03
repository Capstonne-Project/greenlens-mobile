/** BE v3 — 7 trạng thái chính trên Report (master plan §2) */
export type ReportStatus =
  | 'Submitted'
  | 'Verified'
  | 'InProgress'
  | 'Resolved'
  | 'Closed'
  | 'Rejected'
  | 'Duplicate';

/** Giá trị cũ BE/doc v2 — vẫn parse nếu API trả về, không dùng cho UI mới */
export type LegacyReportStatus =
  | 'Dispatched'
  | 'Assigned'
  | 'PenaltyIssued'
  | 'ClosedNoViolation';

/** Union dùng khi đọc response API */
export type ReportWorkflowStatus = ReportStatus | LegacyReportStatus;

export const REPORT_STATUS_V3: readonly ReportStatus[] = [
  'Submitted',
  'Verified',
  'InProgress',
  'Resolved',
  'Closed',
  'Rejected',
  'Duplicate',
] as const;

export function isLegacyReportStatus(status: string): status is LegacyReportStatus {
  return (
    status === 'Dispatched' ||
    status === 'Assigned' ||
    status === 'PenaltyIssued' ||
    status === 'ClosedNoViolation'
  );
}

/** Chuẩn hóa legacy → v3 để badge/filter (giữ hành vi citizen hiện có) */
export function normalizeReportStatusForDisplay(status: string): ReportStatus | LegacyReportStatus {
  if (status === 'Dispatched' || status === 'Assigned') return 'InProgress';
  if (status === 'ClosedNoViolation') return 'Closed';
  if (REPORT_STATUS_V3.includes(status as ReportStatus)) return status as ReportStatus;
  if (isLegacyReportStatus(status)) return status;
  return 'Submitted';
}
