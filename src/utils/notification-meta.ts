import type { Ionicons } from '@expo/vector-icons';

import type { AppNotification, NotificationType } from '@/types/notification.types';
import { isMergeNotificationCopy } from '@/utils/report-merge';
import { getReportStatusMeta } from '@/utils/report-status';

type IconName = keyof typeof Ionicons.glyphMap;

interface NotificationMeta {
  icon: IconName;
  /** Nhãn ngắn cho dòng metadata */
  categoryLabel: string;
  isReportLinked: boolean;
}

const DEFAULT_META: NotificationMeta = {
  icon: 'notifications-outline',
  categoryLabel: 'Hệ thống',
  isReportLinked: false,
};

const META_BY_TYPE: Record<string, NotificationMeta> = {
  ReportStatusChanged: {
    icon: 'document-text-outline',
    categoryLabel: 'Báo cáo',
    isReportLinked: true,
  },
  NewComment: {
    icon: 'chatbubble-ellipses-outline',
    categoryLabel: 'Bình luận',
    isReportLinked: true,
  },
  BadgeEarned: {
    icon: 'ribbon-outline',
    categoryLabel: 'Thành tích',
    isReportLinked: false,
  },
  LevelUp: {
    icon: 'trophy-outline',
    categoryLabel: 'Cấp độ',
    isReportLinked: false,
  },
  SlaBreachWarning: {
    icon: 'alert-circle-outline',
    categoryLabel: 'SLA',
    isReportLinked: true,
  },
  NearbyReport: {
    icon: 'location-outline',
    categoryLabel: 'Gần bạn',
    isReportLinked: true,
  },
  PenaltyIssued: {
    icon: 'shield-checkmark-outline',
    categoryLabel: 'Xử phạt',
    isReportLinked: true,
  },
  ContractExpiry: {
    icon: 'calendar-outline',
    categoryLabel: 'Hợp đồng',
    isReportLinked: false,
  },
  ReportOverdue: {
    icon: 'time-outline',
    categoryLabel: 'Quá hạn',
    isReportLinked: true,
  },
  ReportUnassigned: {
    icon: 'person-add-outline',
    categoryLabel: 'Phân công',
    isReportLinked: true,
  },
  ReportAutoClosed: {
    icon: 'checkmark-done-outline',
    categoryLabel: 'Đóng tự động',
    isReportLinked: true,
  },
  DuplicateReviewNeeded: {
    icon: 'copy-outline',
    categoryLabel: 'Trùng lặp',
    isReportLinked: true,
  },
  ReportAssigned: {
    icon: 'briefcase-outline',
    categoryLabel: 'Nhiệm vụ',
    isReportLinked: true,
  },
  InspectionAssigned: {
    icon: 'clipboard-outline',
    categoryLabel: 'Thanh tra',
    isReportLinked: false,
  },
  AssignmentDeclined: {
    icon: 'close-circle-outline',
    categoryLabel: 'Từ chối',
    isReportLinked: true,
  },
  StaffInvitationReceived: {
    icon: 'people-outline',
    categoryLabel: 'Lời mời',
    isReportLinked: false,
  },
  StaffInvitationAccepted: {
    icon: 'checkmark-circle-outline',
    categoryLabel: 'Lời mời',
    isReportLinked: false,
  },
  StaffInvitationDeclined: {
    icon: 'close-circle-outline',
    categoryLabel: 'Lời mời',
    isReportLinked: false,
  },
  CommunityCleanupLeaderAssigned: {
    icon: 'people-circle-outline',
    categoryLabel: 'Cộng đồng',
    isReportLinked: false,
  },
};

const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;
/** Chỉ strip mã nội bộ kiểu GL-… — giữ RPT-… để user theo dõi báo cáo gốc */
const REPORT_CODE_RE = /\bGL-[A-Z0-9-]{4,}\b/gi;

const MERGE_META: NotificationMeta = {
  icon: 'git-merge-outline',
  categoryLabel: 'Gộp báo cáo',
  isReportLinked: true,
};

export function getNotificationMeta(
  type: NotificationType | string,
  item?: Pick<AppNotification, 'title' | 'message'> | null,
): NotificationMeta {
  if (item && (type === 'ReportStatusChanged' || type === 'DuplicateReviewNeeded')) {
    if (isMergeNotificationCopy(item.title, item.message)) {
      return MERGE_META;
    }
  }
  return META_BY_TYPE[type] ?? DEFAULT_META;
}

export function formatNotificationTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;

  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Strip GUIDs / internal codes; prefer pollution category name for report notifs. */
export function formatNotificationDisplay(item: AppNotification): {
  title: string;
  message: string;
} {
  const category = item.categoryName?.trim();
  const meta = getNotificationMeta(item.type, item);
  const isMerge = isMergeNotificationCopy(item.title, item.message);

  let title = (item.title ?? '').trim();
  let message = (item.message ?? '').trim();

  const replaceIds = (text: string, fallback: string) =>
    text
      .replace(/Báo cáo ô nhiễm\s+[0-9a-f-]{8,}/gi, fallback)
      .replace(/báo cáo\s+[0-9a-f-]{8,}/gi, fallback)
      .replace(UUID_RE, fallback)
      .replace(REPORT_CODE_RE, fallback)
      .replace(/\s{2,}/g, ' ')
      .trim();

  if (isMerge) {
    // Giữ title "Báo cáo được gộp" + mã RPT trong message; chỉ bỏ GUID
    title = title || 'Báo cáo được gộp';
    message = message
      .replace(UUID_RE, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (category && message.length === 0) {
      message = `Báo cáo ${category} đã được gộp. Chạm để xem báo cáo gốc.`;
    }
  } else if (category && meta.isReportLinked) {
    title = category;
    message = replaceIds(message, category)
      .replace(new RegExp(`^Báo cáo\\s+${escapeRegExp(category)}\\s*`, 'i'), '')
      .replace(new RegExp(`^${escapeRegExp(category)}\\s*`, 'i'), '')
      .replace(/^của bạn\s*/i, '')
      .trim();

    if (message.length > 0) {
      message = message.charAt(0).toUpperCase() + message.slice(1);
    }
  } else if (category) {
    title = replaceIds(title, category);
    message = replaceIds(message, category);
  } else {
    title = replaceIds(title, 'Báo cáo ô nhiễm');
    message = replaceIds(message, 'báo cáo');
  }

  title = localizeStatusTokens(title);
  message = localizeStatusTokens(message);

  return { title, message };
}

/** Map BE status tokens (Resolved, Verified, …) → tiếng Việt trong nội dung noti. */
function localizeStatusTokens(text: string): string {
  if (!text) return text;

  // "trạng thái: Resolved" / "status: Verified"
  let next = text.replace(
    /(?:trạng thái|status)\s*:\s*([A-Za-z]+)/gi,
    (_full, status: string) => {
      const label = getReportStatusMeta(status).label;
      return `trạng thái: ${label}`;
    },
  );

  // Bare English status words still left in copy
  const statuses = [
    'Submitted',
    'Verified',
    'Dispatched',
    'Assigned',
    'InProgress',
    'Resolved',
    'Closed',
    'Rejected',
    'Duplicate',
    'PenaltyIssued',
    'Reopened',
  ];

  for (const status of statuses) {
    const label = getReportStatusMeta(status).label;
    next = next.replace(new RegExp(`\\b${status}\\b`, 'g'), label);
  }

  return next;
}

export interface NotificationSection {
  key: string;
  title: string;
  data: AppNotification[];
}

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function dayLabel(dayDiff: number, date: Date): string {
  if (dayDiff <= 0) return 'Hôm nay';
  if (dayDiff === 1) return 'Hôm qua';
  return date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Group notifications by calendar day: Hôm nay / Hôm qua / từng ngày */
export function groupNotificationsByDay(
  items: AppNotification[],
  now = new Date(),
): NotificationSection[] {
  const todayStart = startOfLocalDay(now);
  const buckets = new Map<string, { title: string; dayStart: number; data: AppNotification[] }>();

  for (const item of items) {
    const date = new Date(item.createdAt);
    if (Number.isNaN(date.getTime())) continue;

    const itemStart = startOfLocalDay(date);
    const dayDiff = Math.floor((todayStart - itemStart) / 86_400_000);
    const key = String(itemStart);
    const title = dayLabel(dayDiff, date);

    const existing = buckets.get(key);
    if (existing) {
      existing.data.push(item);
    } else {
      buckets.set(key, { title, dayStart: itemStart, data: [item] });
    }
  }

  return [...buckets.values()]
    .sort((a, b) => b.dayStart - a.dayStart)
    .map((b) => ({ key: String(b.dayStart), title: b.title, data: b.data }));
}

export function countNotificationsToday(items: AppNotification[], now = new Date()): number {
  const todayStart = startOfLocalDay(now);
  return items.filter((item) => {
    const date = new Date(item.createdAt);
    if (Number.isNaN(date.getTime())) return false;
    return startOfLocalDay(date) === todayStart;
  }).length;
}

/** @deprecated use groupNotificationsByDay */
export const groupNotificationsByTime = groupNotificationsByDay;
