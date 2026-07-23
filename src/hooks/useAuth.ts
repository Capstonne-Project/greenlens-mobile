import { useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationStore } from '@/stores/notification.store';
import { authService } from '@/services/auth.service';
import { userService } from '@/services/user.service';
import type {
  ChangePasswordDto,
  ForgotPasswordDto,
  GoogleLoginDto,
  OtpPurpose,
  RegisterResponse,
  ResetPasswordDto,
} from '@/types/auth.types';
import type { LoginDto, RegisterDto, User } from '@/types/user.types';
import { normalizeMobileUser, type UserFromApi } from '@/utils/mobile-user';

/** Lazy — tránh kéo expo-notifications vào mọi screen import useAuth (Metro resolve error). */
async function registerPushTokenSafe(): Promise<void> {
  try {
    const { registerDevicePushToken } = await import('@/utils/push-notifications');
    await registerDevicePushToken();
  } catch {
    // Push optional on web / Expo Go without native module
  }
}

async function clearPushTokenSafe(): Promise<void> {
  try {
    const { clearDevicePushToken } = await import('@/utils/push-notifications');
    await clearDevicePushToken();
  } catch {
    // ignore
  }
}

/** Gọi sau khi có Bearer — idempotent, không chặn login nếu fail tạm thời */
async function recordDataConsent(): Promise<void> {
  try {
    await userService.acceptConsent();
  } catch {
    // Consent bắt buộc trước khi gửi báo cáo; có thể retry sau khi vào app
  }
}

export function useAuth() {
  const { user, isAuthenticated, isLoading, setAuth, clearAuth, setLoading } = useAuthStore();

  const login = useCallback(
    async (dto: LoginDto): Promise<User> => {
      const { data: envelope } = await authService.login(dto);
      const { accessToken, refreshToken, user: rawUser } = envelope.data;
      const nextUser = normalizeMobileUser(rawUser as UserFromApi);
      await setAuth(nextUser, { accessToken, refreshToken });
      await recordDataConsent();
      void registerPushTokenSafe();
      return nextUser;
    },
    [setAuth],
  );

  /** §7 — đăng ký chỉ trả userId + message; sau đó vào luồng OTP EmailVerification */
  const signUp = useCallback(async (dto: RegisterDto): Promise<RegisterResponse> => {
    const { data: envelope } = await authService.register(dto);
    return envelope.data;
  }, []);

  const loginWithGoogle = useCallback(
    async (dto: GoogleLoginDto): Promise<User> => {
      const { data: envelope } = await authService.googleLogin(dto);
      const { accessToken, refreshToken, user: rawUser } = envelope.data;
      const nextUser = normalizeMobileUser(rawUser as UserFromApi);
      await setAuth(nextUser, { accessToken, refreshToken });
      await recordDataConsent();
      void registerPushTokenSafe();
      return nextUser;
    },
    [setAuth],
  );

  const logout = useCallback(async () => {
    await clearPushTokenSafe();
    useNotificationStore.getState().clearUnread();
    await clearAuth();
  }, [clearAuth]);

  /** §4 — khôi phục phiên bằng refresh token (rotation), không dùng GET /me */
  const restoreSession = useCallback(async () => {
    setLoading(true);
    try {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (!refreshToken) return;

      const { data: envelope } = await authService.refreshToken({ refreshToken });
      const { accessToken, refreshToken: newRt, user: rawUser } = envelope.data;
      await setAuth(normalizeMobileUser(rawUser as UserFromApi), { accessToken, refreshToken: newRt });
    } catch {
      await clearAuth();
    } finally {
      setLoading(false);
    }
  }, [setAuth, clearAuth, setLoading]);

  const requestOtp = useCallback(async (email: string, purpose: OtpPurpose) => {
    const { data: envelope } = await authService.requestOtp({ email, purpose });
    return envelope.data;
  }, []);

  const verifyOtp = useCallback(async (email: string, otpCode: string, purpose: OtpPurpose) => {
    const { data: envelope } = await authService.verifyOtp({ email, otpCode, purpose });
    return envelope.data;
  }, []);

  const forgotPassword = useCallback(async (dto: ForgotPasswordDto) => {
    const { data: envelope } = await authService.forgotPassword(dto);
    return envelope.data;
  }, []);

  const resetPassword = useCallback(async (dto: ResetPasswordDto) => {
    const { data: envelope } = await authService.resetPassword(dto);
    return envelope.data;
  }, []);

  const changePassword = useCallback(
    async (dto: ChangePasswordDto) => {
      const { data: envelope } = await authService.changePassword(dto);
      return envelope.data;
    },
    [],
  );

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    signUp,
    loginWithGoogle,
    logout,
    restoreSession,
    requestOtp,
    verifyOtp,
    forgotPassword,
    resetPassword,
    changePassword,
  };
}
