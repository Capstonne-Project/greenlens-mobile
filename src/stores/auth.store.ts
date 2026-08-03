import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User, AuthTokens } from '@/types/user.types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Tăng mỗi lần setAuth/clearAuth — dùng để phát hiện refresh token trễ của phiên cũ ghi đè phiên mới. */
  sessionId: number;
  setAuth: (user: User, tokens: AuthTokens) => Promise<void>;
  clearAuth: () => Promise<void>;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user:            null,
  accessToken:     null,
  isAuthenticated: false,
  isLoading:       true,
  sessionId:       0,

  setAuth: async (user, tokens) => {
    await SecureStore.setItemAsync('accessToken', tokens.accessToken);
    await SecureStore.setItemAsync('refreshToken', tokens.refreshToken);
    set((state) => ({
      user,
      accessToken: tokens.accessToken,
      isAuthenticated: true,
      isLoading: false,
      sessionId: state.sessionId + 1,
    }));
  },

  clearAuth: async () => {
    try {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
    } finally {
      set((state) => ({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
        sessionId: state.sessionId + 1,
      }));
    }
  },

  setUser: (user) => set({ user, isAuthenticated: true }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
