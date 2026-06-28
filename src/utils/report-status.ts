import type { ReportWorkflowStatus } from '@/types/report-detail.types';

export interface ReportStatusMeta {
  label: string;
  textColor: string;
  bgColor: string;
  highlight?: boolean;
}

const STATUS_META: Record<string, ReportStatusMeta> = {
  Submitted: { label: 'Đã gửi — chờ xác minh', textColor: '#92400E', bgColor: '#FEF3C7' },
  Verified: { label: 'Đã xác minh', textColor: '#065F46', bgColor: '#D1FAE5' },
  Dispatched: { label: 'Đã điều phối', textColor: '#1E40AF', bgColor: '#DBEAFE' },
  Assigned: { label: 'Đã phân công', textColor: '#1E40AF', bgColor: '#DBEAFE' },
  InProgress: { label: 'Đang xử lý', textColor: '#1D4ED8', bgColor: '#DBEAFE' },
  Resolved: {
    label: 'Đã xử lý — cần bạn xác nhận',
    textColor: '#9A3412',
    bgColor: '#FFEDD5',
    highlight: true,
  },
  PenaltyIssued: {
    label: 'Đã xử phạt — cần bạn xác nhận',
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
