import { router } from 'expo-router';
import { useEffect } from 'react';

import { useAuthStore } from '@/stores/auth.store';
import { canAccessShell, getPostLoginHref, type AppShell } from '@/shared/role-router';

/**
 * Redirect user về shell đúng role nếu deep-link vào shell khác.
 * Không chặn khi chưa đăng nhập — màn auth tự xử lý.
 */
export function useRoleGuard(expectedShell: AppShell): void {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (canAccessShell(user.role, expectedShell)) return;
    router.replace(getPostLoginHref(user.role));
  }, [expectedShell, isAuthenticated, user]);
}
