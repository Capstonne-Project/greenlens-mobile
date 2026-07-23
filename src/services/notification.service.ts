import { api } from './api';
import type { ApiEnvelope } from '@/types/api.types';
import type {
  GetNotificationsParams,
  NotificationPreferenceItem,
  NotificationsListResponse,
} from '@/types/notification.types';

export const notificationService = {
  getMyNotifications: (params?: GetNotificationsParams) =>
    api.get<ApiEnvelope<NotificationsListResponse>>('/notifications', { params }),

  markAsRead: (id: string) => api.put<void>(`/notifications/${id}/read`),

  markAllRead: () =>
    api.put<ApiEnvelope<{ markedCount: number }>>('/notifications/read-all'),

  getPreferences: () =>
    api.get<ApiEnvelope<NotificationPreferenceItem[]>>('/notifications/preferences'),

  updatePreferences: (preferences: NotificationPreferenceItem[]) =>
    api.put<void>('/notifications/preferences', { preferences }),

  /** Pass `null` to clear token (opt-out push). */
  updateDeviceToken: (deviceToken: string | null) =>
    api.put<void>('/notifications/device-token', { deviceToken }),
};
