import {
  REOPEN_MAX_APPROVED,
  REOPEN_WINDOW_DAYS,
} from '@/types/report-detail.types';
import type {
  ReportHistoryEventType,
  ReportHistoryItem,
} from '@/types/report-detail.types';
import type { ReportWorkflowStatus } from '@/types/report-status.types';

const REOPEN_EVENT_TYPES: ReadonlySet<string> = new Set([
  'ReopenRequested',
  'ReopenApproved',
  'ReopenRejected',
]);

/** Đọc `eventType` từ `ReportHistoryItem.metadata` (JSON) — trả `null` nếu không khớp/lỗi parse. */
export function parseReopenEventType(item: ReportHistoryItem): ReportHistoryEventType | null {
  if (!item.metadata) return null;
  try {
    const parsed = JSON.parse(item.metadata) as { eventType?: string };
    return parsed.eventType && REOPEN_EVENT_TYPES.has(parsed.eventType)
      ? (parsed.eventType as ReportHistoryEventType)
      : null;
  } catch {
    return null;
  }
}

export interface ReportStatusMeta {
  label: string;
  textColor: string;
  bgColor: string;
  highlight?: boolean;
}

/**
 * Label citizen-facing — chỉ các mốc người dùng cần biết (không lộ LEO / đội / công ty).
 *
 * Mỗi giai đoạn một tông màu riêng để phân biệt được khi lướt danh sách:
 * vàng (chờ) → xanh lá (đã duyệt) → xanh dương (đang làm) → cam (cần bạn xác nhận)
 * → xám (kết thúc) → đỏ (từ chối).
 */
const STATUS_META: Record<string, ReportStatusMeta> = {
  Submitted: { label: 'Chờ xác minh', textColor: '#B45309', bgColor: '#FEF3C7' },
  Verified: { label: 'Đã xác minh', textColor: '#047857', bgColor: '#D1FAE5' },
  Dispatched: { label: 'Đã xác minh', textColor: '#047857', bgColor: '#D1FAE5' }, // legacy — gộp vào xác minh
  Assigned: { label: 'Đã xác minh', textColor: '#047857', bgColor: '#D1FAE5' }, // legacy — gộp vào xác minh
  InProgress: { label: 'Đang xử lý', textColor: '#1D4ED8', bgColor: '#DBEAFE' },
  // BR-REP-015: LEO đã duyệt yêu cầu mở lại — chờ phân công lại team. Tách biệt với
  // "Đang xử lý" để người dùng biết đây là kết quả họ vừa yêu cầu, không phải lỗi hệ thống.
  Reopened: { label: 'Đã mở lại — chờ xử lý', textColor: '#0369A1', bgColor: '#E0F2FE', highlight: true },
  Resolved: {
    label: 'Cần xác nhận',
    textColor: '#C2410C',
    bgColor: '#FFEDD5',
    highlight: true,
  },
  PenaltyIssued: {
    label: 'Cần xác nhận',
    textColor: '#C2410C',
    bgColor: '#FFEDD5',
    highlight: true,
  },
  Closed: { label: 'Hoàn thành', textColor: '#4B5563', bgColor: '#F3F4F6' },
  ClosedNoViolation: { label: 'Hoàn thành', textColor: '#4B5563', bgColor: '#F3F4F6' },
  Rejected: { label: 'Bị từ chối', textColor: '#B91C1C', bgColor: '#FEE2E2' },
  Duplicate: { label: 'Đã gộp', textColor: '#6D28D9', bgColor: '#EDE9FE' },
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
      [
        'Verified',
        'Dispatched',
        'Assigned',
        'InProgress',
        'Resolved',
        'Reopened',
        'PenaltyIssued',
        'Closed',
        'ClosedNoViolation',
      ].includes(status));

  // BR-REP-015: approve xoá `resolvedAt` (chu kỳ resolve mới) — không dựa vào field đó,
  // phải liệt kê tường minh để "Reopened" không tụt lùi về "chưa bắt đầu xử lý".
  const workingDone =
    !isRejected &&
    !isDuplicate &&
    (Boolean(detail.startedAt) ||
      status === 'InProgress' ||
      ['Resolved', 'Reopened', 'PenaltyIssued', 'Closed', 'ClosedNoViolation'].includes(status));

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
      // Reopened: đã từng "Hoàn thành" một lần nhưng đang được xử lý lại — nói rõ ra thay
      // vì "Chưa hoàn thành" chung chung, dễ đọc nhầm thành chưa từng xử lý.
      pendingLabel: status === 'Reopened' ? 'Đang xử lý lại' : 'Chưa hoàn thành',
    },
  };
}

const FALLBACK_META: ReportStatusMeta = {
  label: 'Không rõ',
  textColor: '#6B7280',
  bgColor: '#F3F4F6',
};

/**
 * BR-REP-015: khi `Resolved` có yêu cầu mở lại đang chờ LEO duyệt, không hiện "Cần xác nhận"
 * — báo cáo đang chờ xử lý yêu cầu của người dùng, không phải chờ người dùng xác nhận.
 */
const PENDING_REOPEN_META: ReportStatusMeta = {
  label: 'Đang chờ duyệt mở lại',
  textColor: '#0369A1',
  bgColor: '#E0F2FE',
  highlight: true,
};

export function getReportStatusMeta(status: string, hasPendingReopenRequest?: boolean): ReportStatusMeta {
  if (status === 'Resolved' && hasPendingReopenRequest) return PENDING_REOPEN_META;
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

export interface ReportFooterOptions {
  isOwner: boolean;
  reopenedCount: number;
  /** Đang có yêu cầu mở lại chờ LEO duyệt — BE chặn gửi thêm (PENDING_REOPEN_REQUEST_EXISTS) */
  hasPendingReopenRequest?: boolean;
  /** Mốc tính cửa sổ 7 ngày được phép yêu cầu mở lại */
  resolvedAt?: string | null;
}

/** BR-REP-015: quá 7 ngày kể từ khi giải quyết thì không còn được yêu cầu mở lại. */
function isReopenWindowExpired(resolvedAt?: string | null): boolean {
  if (!resolvedAt) return false;
  const resolvedTime = new Date(resolvedAt).getTime();
  if (Number.isNaN(resolvedTime)) return false;
  const elapsedDays = (Date.now() - resolvedTime) / (24 * 60 * 60 * 1000);
  return elapsedDays > REOPEN_WINDOW_DAYS;
}

export function getReportFooterActions(
  status: ReportWorkflowStatus,
  options: ReportFooterOptions,
): ReportFooterActions {
  if (!options.isOwner) {
    return { showClose: false, showReopen: false, infoMessage: 'Đây là báo cáo từ cộng đồng' };
  }

  switch (status) {
    case 'Resolved': {
      if (options.hasPendingReopenRequest) {
        return {
          showClose: false,
          showReopen: false,
          infoMessage: 'Yêu cầu mở lại đang chờ cán bộ xem xét',
        };
      }

      const usedUpReopens = options.reopenedCount >= REOPEN_MAX_APPROVED;
      const windowExpired = isReopenWindowExpired(options.resolvedAt);

      let infoMessage: string | undefined;
      if (usedUpReopens) {
        infoMessage = `Đã dùng hết ${REOPEN_MAX_APPROVED}/${REOPEN_MAX_APPROVED} lần mở lại`;
      } else if (windowExpired) {
        infoMessage = `Đã quá ${REOPEN_WINDOW_DAYS} ngày — không thể yêu cầu mở lại`;
      }

      return {
        showClose: true,
        showReopen: !usedUpReopens && !windowExpired,
        infoMessage,
      };
    }
    case 'PenaltyIssued':
      return { showClose: true, showReopen: false };
    case 'Submitted':
    case 'Verified':
    case 'Dispatched':
    case 'Assigned':
    case 'InProgress':
      return { showClose: false, showReopen: false, infoMessage: 'Đang được xử lý, vui lòng chờ' };
    case 'Reopened':
      // BR-REP-015: yêu cầu đã được LEO duyệt, đang chờ phân công lại đội xử lý.
      return {
        showClose: false,
        showReopen: false,
        infoMessage: 'Yêu cầu mở lại đã được chấp nhận — đang chờ phân công đội xử lý',
      };
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
