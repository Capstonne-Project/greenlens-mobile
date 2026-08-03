import {
  HttpTransportType,
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import * as SecureStore from 'expo-secure-store';

import { API_BASE_URL } from './api';

/** Hub được map ở app root (không có prefix /v1) — xem Program.cs `MapHub<NotificationHub>("/hubs/notifications")` */
function getHubUrl(): string {
  return `${API_BASE_URL.replace(/\/v1\/?$/, '')}/hubs/notifications`;
}

let connection: HubConnection | null = null;

/**
 * Kết nối SignalR hub thông báo realtime (server bắn `ReceiveNotification` mỗi khi
 * tạo Notification mới cho user — kể cả loại không kèm push FCM như StaffInvitationReceived).
 * Payload không được dùng trực tiếp để hiển thị (enum Type serialize dạng số qua SignalR,
 * không phải string như REST) — chỉ dùng làm tín hiệu "có noti mới" để refetch qua REST.
 */
export function connectNotificationHub(onNotification: () => void): HubConnection {
  if (connection && connection.state !== HubConnectionState.Disconnected) {
    return connection;
  }

  connection = new HubConnectionBuilder()
    .withUrl(getHubUrl(), {
      transport: HttpTransportType.WebSockets,
      skipNegotiation: true,
      accessTokenFactory: async () => (await SecureStore.getItemAsync('accessToken')) ?? '',
    })
    .withAutomaticReconnect([0, 2000, 5000, 10_000, 30_000])
    .configureLogging(__DEV__ ? LogLevel.Error : LogLevel.None)
    .build();

  connection.on('ReceiveNotification', () => onNotification());

  void connection.start().catch((error) => {
    if (__DEV__) console.warn('[notification-hub] connect failed', error);
  });

  return connection;
}

export async function disconnectNotificationHub(): Promise<void> {
  if (!connection) return;
  try {
    await connection.stop();
  } catch {
    // best-effort
  } finally {
    connection = null;
  }
}
