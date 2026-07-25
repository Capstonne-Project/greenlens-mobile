import type { AppNotification, NotificationsListResponse } from '@/types/notification.types';

function readFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : null;
}

/**
 * Resolve badge unread count from list payload.
 * Handles missing `unreadCount`, PascalCase, and BE returning 0 while items are unread.
 */
export function resolveUnreadCount(
  data: NotificationsListResponse | Record<string, unknown> | null | undefined,
  items: AppNotification[],
  options?: { isUnreadOnly?: boolean },
): number {
  if (!data || typeof data !== 'object') {
    return items.filter((n) => n.isRead === false).length;
  }

  const record = data as Record<string, unknown>;
  const fromField = readFiniteNumber(record.unreadCount ?? record.UnreadCount);
  const fromItems = items.filter((n) => {
    const flag = n.isRead ?? (n as unknown as { IsRead?: boolean }).IsRead;
    return flag === false;
  }).length;

  if (options?.isUnreadOnly) {
    const total = readFiniteNumber(record.totalCount ?? record.TotalCount);
    if (fromField != null && fromField > 0) return fromField;
    if (total != null) return total;
    return fromItems;
  }

  if (fromField != null && fromField > 0) return fromField;
  // BE thiếu / trả 0 nhưng page hiện có item chưa đọc → dùng count trên page (best-effort)
  if (fromItems > 0) return fromItems;
  return fromField ?? 0;
}
