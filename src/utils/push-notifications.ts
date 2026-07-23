import { Platform } from 'react-native';

import { notificationService } from '@/services/notification.service';

type NotificationsModule = typeof import('expo-notifications');

let notificationsModule: NotificationsModule | null = null;
let handlerConfigured = false;

async function getNotifications(): Promise<NotificationsModule | null> {
  if (Platform.OS === 'web') return null;
  if (notificationsModule) return notificationsModule;

  try {
    notificationsModule = await import('expo-notifications');

    if (!handlerConfigured) {
      notificationsModule.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
      handlerConfigured = true;
    }

    return notificationsModule;
  } catch (error) {
    if (__DEV__) {
      console.warn('[push] expo-notifications unavailable', error);
    }
    return null;
  }
}

/** Request OS permission + Android channel. Returns false if denied. */
export async function ensurePushPermission(): Promise<boolean> {
  const Notifications = await getNotifications();
  if (!Notifications) return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'GreenLens',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10B981',
    });
  }

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  return status === 'granted';
}

/**
 * Native FCM (Android) / APNs (iOS) token — matches BE `PUT /notifications/device-token`.
 * Silently no-ops when the native module is unavailable.
 */
export async function registerDevicePushToken(): Promise<string | null> {
  try {
    const Notifications = await getNotifications();
    if (!Notifications) return null;

    const granted = await ensurePushPermission();
    if (!granted) return null;

    const tokenResult = await Notifications.getDevicePushTokenAsync();
    const token = typeof tokenResult.data === 'string' ? tokenResult.data : null;
    if (!token) return null;

    await notificationService.updateDeviceToken(token);
    return token;
  } catch (error) {
    if (__DEV__) {
      console.warn('[push] registerDevicePushToken failed', error);
    }
    return null;
  }
}

export async function clearDevicePushToken(): Promise<void> {
  try {
    await notificationService.updateDeviceToken(null);
  } catch {
    // Best-effort on logout
  }
}

export function parsePushData(
  data: Record<string, unknown> | undefined,
): { type?: string; referenceId?: string; notificationId?: string } {
  if (!data) return {};

  const type = typeof data.type === 'string' ? data.type : undefined;
  const referenceId =
    typeof data.referenceId === 'string'
      ? data.referenceId
      : typeof data.reference_id === 'string'
        ? data.reference_id
        : undefined;
  const notificationId =
    typeof data.notificationId === 'string'
      ? data.notificationId
      : typeof data.id === 'string'
        ? data.id
        : undefined;

  return { type, referenceId, notificationId };
}
