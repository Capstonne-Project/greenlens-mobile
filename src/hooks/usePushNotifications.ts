import { router, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { notificationService } from '@/services/notification.service';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationStore } from '@/stores/notification.store';
import { resolveNotificationHref } from '@/utils/resolve-notification-href';
import { resolveUnreadCount } from '@/utils/notification-unread';

async function syncUnreadCount(): Promise<void> {
  try {
    const res = await notificationService.getMyNotifications({ page: 1, pageSize: 20 });
    const data = res.data.data;
    const items = data.items ?? [];
    useNotificationStore.getState().setUnreadCount(resolveUnreadCount(data, items));
  } catch {
    // Badge sync is best-effort
  }
}

/**
 * Registers FCM/APNs token when authenticated and handles notification taps
 * (foreground / background / cold start) → mark read (if id) + deep-link by role.
 *
 * Loads `expo-notifications` only on native — avoids Metro web/broken-package resolve
 * and keeps auth screens free of the native module graph.
 */
export function usePushNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);
  const handledResponseIds = useRef(new Set<string>());

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    void (async () => {
      // Always sync badge count (web + native); push registration stays native-only.
      await syncUnreadCount();
      if (cancelled || Platform.OS === 'web') return;

      try {
        const push = await import('@/utils/push-notifications');
        if (cancelled) return;
        await push.registerDevicePushToken();
      } catch (error) {
        if (__DEV__) {
          console.warn('[push] setup skipped', error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !role || Platform.OS === 'web') return;

    let responseSub: { remove: () => void } | undefined;
    let receivedSub: { remove: () => void } | undefined;
    let cancelled = false;

    void (async () => {
      try {
        const Notifications = await import('expo-notifications');
        const { parsePushData } = await import('@/utils/push-notifications');
        if (cancelled) return;

        const openFromPush = async (
          response: {
            notification: {
              request: { identifier: string; content: { data?: Record<string, unknown> } };
            };
          },
        ) => {
          const responseId = response.notification.request.identifier;
          if (handledResponseIds.current.has(responseId)) return;
          handledResponseIds.current.add(responseId);

          const data = parsePushData(response.notification.request.content.data);

          if (data.notificationId) {
            try {
              await notificationService.markAsRead(data.notificationId);
              useNotificationStore.getState().decrementUnread();
            } catch {
              // Navigation still proceeds
            }
          }

          const href = resolveNotificationHref(
            data.type ?? 'ReportStatusChanged',
            data.referenceId ?? null,
            role,
          );

          if (href) {
            router.push(href as Href);
          }
        };

        responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
          void openFromPush(response);
        });

        receivedSub = Notifications.addNotificationReceivedListener(() => {
          useNotificationStore.getState().setUnreadCount(
            useNotificationStore.getState().unreadCount + 1,
          );
        });

        const last = await Notifications.getLastNotificationResponseAsync();
        if (!cancelled && last) {
          void openFromPush(last);
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('[push] listeners skipped', error);
        }
      }
    })();

    return () => {
      cancelled = true;
      responseSub?.remove();
      receivedSub?.remove();
    };
  }, [isAuthenticated, role]);
}
