import type { ReportWorkflowStatus } from '@/types/report-status.types';

export interface ReportStatusMeta {
  label: string;
  textColor: string;
  bgColor: string;
  highlight?: boolean;
}

const STATUS_META: Record<string, ReportStatusMeta> = {
  Submitted: { label: 'Đã gửi — chờ xác minh', textColor: '#92400E', bgColor: '#FEF3C7' },
  Verified: { label: 'Đã xác minh', textColor: '#065F46', bgColor: '#D1FAE5' },
  Dispatched: { label: 'Đã điều phối', textColor: '#1E40AF', bgColor: '#DBEAFE' }, // legacy v2
  Assigned: { label: 'Đã phân công', textColor: '#1E40AF', bgColor: '#DBEAFE' }, // legacy v2
  InProgress: { label: 'Đang xử lý', textColor: '#1D4ED8', bgColor: '#DBEAFE' },
  Resolved: {
    label: 'Đã xử lý — cần bạn xác nhận',
    textColor: '#9A3412',
    bgColor: '#FFEDD5',
    highlight: true,
  },
  PenaltyIssued: {
    label: 'Đã xử lý — cần bạn xác nhận', // legacy v2 — inspection sub-process, hiển thị như Resolved
    textColor: '#9A3412',
    bgColor: '#FFEDD5',
    highlight: true,
  },
  Closed: { label: 'Đã đóng', textColor: '#374151', bgColor: '#F3F4F6' },
  ClosedNoViolation: { label: 'Đã đóng (không vi phạm)', textColor: '#374151', bgColor: '#F3F4F6' },
  Rejected: { label: 'Bị từ chối', textColor: '#991B1B', bgColor: '#FEE2E2' },
  Duplicate: { label: 'Trùng báo cáo', textColor: '#6B7280', bgColor: '#F3F4F6' },
};

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
    case 'Duplicate':
      return { showClose: false, showReopen: false };
    default:
      return { showClose: false, showReopen: false };
  }
}
