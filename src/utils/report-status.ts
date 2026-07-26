import type { ReportWorkflowStatus } from '@/types/report-status.types';

export interface ReportStatusMeta {
  label: string;
  textColor: string;
  bgColor: string;
  highlight?: boolean;
}

/** Label citizen-facing — chỉ các mốc người dùng cần biết (không lộ LEO / đội / công ty). */
const STATUS_META: Record<string, ReportStatusMeta> = {
  Submitted: { label: 'Chờ xác minh', textColor: '#92400E', bgColor: '#FEF3C7' },
  Verified: { label: 'Đã xác minh', textColor: '#065F46', bgColor: '#D1FAE5' },
  Dispatched: { label: 'Đã xác minh', textColor: '#065F46', bgColor: '#D1FAE5' }, // legacy — gộp vào xác minh
  Assigned: { label: 'Đã xác minh', textColor: '#065F46', bgColor: '#D1FAE5' }, // legacy — gộp vào xác minh
  InProgress: { label: 'Đang xử lý', textColor: '#1D4ED8', bgColor: '#DBEAFE' },
  Resolved: {
    label: 'Hoàn thành — cần xác nhận',
    textColor: '#9A3412',
    bgColor: '#FFEDD5',
    highlight: true,
  },
  PenaltyIssued: {
    label: 'Hoàn thành — cần xác nhận',
    textColor: '#9A3412',
    bgColor: '#FFEDD5',
    highlight: true,
  },
  Closed: { label: 'Hoàn thành', textColor: '#374151', bgColor: '#F3F4F6' },
  ClosedNoViolation: { label: 'Hoàn thành', textColor: '#374151', bgColor: '#F3F4F6' },
  Rejected: { label: 'Bị từ chối', textColor: '#991B1B', bgColor: '#FEE2E2' },
  Duplicate: { label: 'Đã gộp', textColor: '#4B5563', bgColor: '#F3F4F6' },
};

/** Các mốc tiến trình cơ bản trên màn chi tiết citizen */
export type CitizenProgressPhase = 'submitted' | 'verified' | 'working' | 'done';

export function getCitizenProgress(detail: {
  status: string;
  verifiedAt?: string | null;
  startedAt?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
}): Record<
  CitizenProgressPhase,
  { done: boolean; time: string | null; pendingLabel: string }
> {
  const status = detail.status;
  const isRejected = status === 'Rejected';
  const isDuplicate = status === 'Duplicate';

  const verifiedDone =
    !isRejected &&
    (Boolean(detail.verifiedAt) ||
      ['Verified', 'Dispatched', 'Assigned', 'InProgress', 'Resolved', 'PenaltyIssued', 'Closed', 'ClosedNoViolation'].includes(
        status,
      ));

  const workingDone =
    !isRejected &&
    !isDuplicate &&
    (Boolean(detail.startedAt) ||
      status === 'InProgress' ||
      ['Resolved', 'PenaltyIssued', 'Closed', 'ClosedNoViolation'].includes(status));

  const doneDone =
    !isRejected &&
    (Boolean(detail.resolvedAt) ||
      Boolean(detail.closedAt) ||
      ['Resolved', 'PenaltyIssued', 'Closed', 'ClosedNoViolation'].includes(status));

  return {
    submitted: { done: true, time: null, pendingLabel: 'Đã gửi' },
    verified: {
      done: verifiedDone,
      time: detail.verifiedAt ?? null,
      pendingLabel: 'Chưa xác minh',
    },
    working: {
      done: workingDone,
      time: detail.startedAt ?? null,
      pendingLabel: 'Chưa bắt đầu xử lý',
    },
    done: {
      done: doneDone,
      time: detail.resolvedAt ?? detail.closedAt ?? null,
      pendingLabel: 'Chưa hoàn thành',
    },
  };
}

const FALLBACK_META: ReportStatusMeta = {
  label: 'Không rõ',
  textColor: '#6B7280',
  bgColor: '#F3F4F6',
};

export function getReportStatusMeta(status: string): ReportStatusMeta {
  return STATUS_META[status] ?? FALLBACK_META;
}

const SEVERITY_META: Record<string, ReportStatusMeta> = {
  Low: { label: 'Mức độ thấp', textColor: '#166534', bgColor: '#DCFCE7' },
  Medium: { label: 'Mức độ trung bình', textColor: '#713F12', bgColor: '#FEF9C3' },
  High: { label: 'Mức độ cao', textColor: '#9A3412', bgColor: '#FFEDD5' },
  Critical: { label: 'Nghiêm trọng', textColor: '#991B1B', bgColor: '#FEE2E2' },
};

const SEVERITY_FALLBACK: ReportStatusMeta = { label: 'Chưa rõ mức độ', textColor: '#6B7280', bgColor: '#F3F4F6' };

/** Nhận string severity từ BE (Low/Medium/High/Critical, không phân biệt hoa thường) */
export function getSeverityMeta(severity?: string | null): ReportStatusMeta {
  if (!severity) return SEVERITY_FALLBACK;
  const normalized = severity.trim();
  const key = Object.keys(SEVERITY_META).find((k) => k.toLowerCase() === normalized.toLowerCase());
  return key ? SEVERITY_META[key] : SEVERITY_FALLBACK;
}

export interface ReportFooterActions {
  showClose: boolean;
  showReopen: boolean;
  infoMessage?: string;
}

export function getReportFooterActions(
  status: ReportWorkflowStatus,
  options: { isOwner: boolean; reopenedCount: number },
): ReportFooterActions {
  if (!options.isOwner) {
    return { showClose: false, showReopen: false, infoMessage: 'Đây là báo cáo từ cộng đồng' };
  }

  switch (status) {
    case 'Resolved':
      return {
        showClose: true,
        showReopen: options.reopenedCount < 2,
        infoMessage:
          options.reopenedCount > 0 ? `Đã mở lại ${options.reopenedCount}/2 lần` : undefined,
      };
    case 'PenaltyIssued':
      return { showClose: true, showReopen: false };
    case 'Submitted':
    case 'Verified':
    case 'Dispatched':
    case 'Assigned':
    case 'InProgress':
      return { showClose: false, showReopen: false, infoMessage: 'Đang được xử lý, vui lòng chờ' };
    case 'Closed':
    case 'ClosedNoViolation':
      return { showClose: false, showReopen: false, infoMessage: 'Báo cáo đã kết thúc' };
    case 'Rejected':
      return { showClose: false, showReopen: false };
    case 'Duplicate':
      return {
        showClose: false,
        showReopen: false,
        infoMessage: 'Báo cáo đã gộp — theo dõi tiến độ ở báo cáo gốc',
      };
    default:
      return { showClose: false, showReopen: false };
  }
}
