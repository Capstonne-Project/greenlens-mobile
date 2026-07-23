import { useCallback, useEffect, useMemo, useState } from 'react';

import { notificationService } from '@/services/notification.service';
import { useNotificationStore } from '@/stores/notification.store';
import type { AppNotification } from '@/types/notification.types';

export type NotificationsReadFilter = 'all' | 'unread';

interface UseNotificationsParams {
  enabled?: boolean;
  /** `all` = mọi noti; `unread` = chỉ chưa đọc (API isRead=false) */
  filter?: NotificationsReadFilter;
}

interface UseNotificationsResult {
  items: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  errorMessage: string | null;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const PAGE_SIZE = 20;

export function useNotifications(
  enabledOrParams: boolean | UseNotificationsParams = true,
): UseNotificationsResult {
  const params =
    typeof enabledOrParams === 'boolean'
      ? { enabled: enabledOrParams, filter: 'all' as const }
      : {
          enabled: enabledOrParams.enabled ?? true,
          filter: enabledOrParams.filter ?? 'all',
        };

  const { enabled, filter } = params;
  const isReadParam = filter === 'unread' ? false : undefined;

  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const clearUnread = useNotificationStore((s) => s.clearUnread);
  const decrementUnread = useNotificationStore((s) => s.decrementUnread);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const [items, setItems] = useState<AppNotification[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (nextPage: number, mode: 'replace' | 'append' | 'refresh') => {
      if (mode === 'replace') setIsLoading(true);
      if (mode === 'refresh') setIsRefreshing(true);
      if (mode === 'append') setIsLoadingMore(true);
      setErrorMessage(null);

      try {
        const res = await notificationService.getMyNotifications({
          page: nextPage,
          pageSize: PAGE_SIZE,
          isRead: isReadParam,
        });
        const data = res.data.data;
        const nextItems = data.items ?? [];

        setItems((prev) => (mode === 'append' ? [...prev, ...nextItems] : nextItems));
        setPage(nextPage);
        setTotalCount(data.totalCount ?? nextItems.length);
        setUnreadCount(data.unreadCount ?? 0);
      } catch {
        setErrorMessage('Không tải được thông báo. Vui lòng thử lại.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [isReadParam, setUnreadCount],
  );

  const refetch = useCallback(async () => {
    await fetchPage(1, items.length > 0 ? 'refresh' : 'replace');
  }, [fetchPage, items.length]);

  const loadMore = useCallback(async () => {
    if (isLoading || isLoadingMore || isRefreshing) return;
    if (items.length >= totalCount) return;
    await fetchPage(page + 1, 'append');
  }, [fetchPage, isLoading, isLoadingMore, isRefreshing, items.length, page, totalCount]);

  const markAsRead = useCallback(
    async (id: string) => {
      const target = items.find((n) => n.id === id);
      if (!target || target.isRead) return;

      if (filter === 'unread') {
        setItems((prev) => prev.filter((n) => n.id !== id));
        setTotalCount((prev) => Math.max(0, prev - 1));
      } else {
        setItems((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n,
          ),
        );
      }
      decrementUnread();

      try {
        await notificationService.markAsRead(id);
      } catch {
        if (filter === 'unread') {
          setItems((prev) => {
            if (prev.some((n) => n.id === id)) return prev;
            return [...prev, target].sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            );
          });
          setTotalCount((prev) => prev + 1);
        } else {
          setItems((prev) =>
            prev.map((n) =>
              n.id === id ? { ...n, isRead: false, readAt: target.readAt } : n,
            ),
          );
        }
        setUnreadCount(useNotificationStore.getState().unreadCount + 1);
      }
    },
    [decrementUnread, filter, items, setUnreadCount],
  );

  const markAllRead = useCallback(async () => {
    const hadUnread = items.some((n) => !n.isRead);
    if (!hadUnread && unreadCount === 0) return;

    if (filter === 'unread') {
      setItems([]);
      setTotalCount(0);
    } else {
      setItems((prev) =>
        prev.map((n) => ({
          ...n,
          isRead: true,
          readAt: n.readAt ?? new Date().toISOString(),
        })),
      );
    }
    clearUnread();

    try {
      await notificationService.markAllRead();
    } catch {
      await fetchPage(1, 'replace');
    }
  }, [clearUnread, fetchPage, filter, items, unreadCount]);

  useEffect(() => {
    if (!enabled) return;
    setItems([]);
    setPage(1);
    setTotalCount(0);
    void fetchPage(1, 'replace');
  }, [enabled, fetchPage, filter]);

  return useMemo(
    () => ({
      items,
      unreadCount,
      isLoading,
      isRefreshing,
      isLoadingMore,
      hasMore: items.length < totalCount,
      errorMessage,
      refetch,
      loadMore,
      markAsRead,
      markAllRead,
    }),
    [
      items,
      unreadCount,
      isLoading,
      isRefreshing,
      isLoadingMore,
      totalCount,
      errorMessage,
      refetch,
      loadMore,
      markAsRead,
      markAllRead,
    ],
  );
}
