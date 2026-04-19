import { useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/stores/auth.store';
import { authService } from '@/services/auth.service';
import type { LoginDto, RegisterDto } from '@/types/user.types';

export function useAuth() {
  const { user, isAuthenticated, isLoading, setAuth, clearAuth, setUser, setLoading } = useAuthStore();

  const login = useCallback(async (dto: LoginDto) => {
    const { data } = await authService.login(dto);
    await setAuth(data.data.user, data.data.tokens);
  }, [setAuth]);

  const register = useCallback(async (dto: RegisterDto) => {
    const { data } = await authService.register(dto);
    await setAuth(data.data.user, data.data.tokens);
  }, [setAuth]);

  const logout = useCallback(async () => {
    await authService.logout().catch(() => null);
    await clearAuth();
  }, [clearAuth]);

  const restoreSession = useCallback(async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) return;
      const { data } = await authService.getMe();
      setUser(data.data);
    } catch {
      await clearAuth();
    } finally {
      setLoading(false);
    }
  }, [setUser, clearAuth, setLoading]);

  return { user, isAuthenticated, isLoading, login, register, logout, restoreSession };
}
