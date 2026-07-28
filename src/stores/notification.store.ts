import { create } from 'zustand';

interface NotificationUiState {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  decrementUnread: () => void;
  clearUnread: () => void;
  /** Bump mỗi khi SignalR bắn `ReceiveNotification` — màn list đang mở subscribe để tự refetch */
  realtimeTick: number;
  bumpRealtimeTick: () => void;
}

export const useNotificationStore = create<NotificationUiState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),
  decrementUnread: () =>
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
  clearUnread: () => set({ unreadCount: 0 }),

  realtimeTick: 0,
  bumpRealtimeTick: () => set((state) => ({ realtimeTick: state.realtimeTick + 1 })),
}));
