import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { exchangeGoogleTokenForFirebaseIdToken } from '@/services/firebase-auth.service';
import type { User } from '@/types/user.types';
import { getAuthErrorMessage } from '@/utils/auth-errors';

/**
 * OAuth client loại "Web application" của Firebase project.
 * Native SDK vẫn cần web client ID để phát hành idToken — không phải Android/iOS client ID.
 */
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
/** Chỉ cần trên iOS — OAuth client loại "iOS" trong cùng project. */
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
/** Firebase Web API key — dùng để đổi token Google sang Firebase ID token. */
const FIREBASE_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '';

/**
 * `@react-native-google-signin` là native module — KHÔNG có trong Expo Go, import ở
 * top-level sẽ làm cả app không load được. Nạp lười để Expo Go vẫn chạy mọi màn khác,
 * chỉ riêng nút Google báo "chưa khả dụng".
 */
type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');

let cachedModule: GoogleSignInModule | null = null;
let isConfigured = false;

function loadGoogleSignIn(): GoogleSignInModule | null {
  if (cachedModule) return cachedModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedModule = require('@react-native-google-signin/google-signin') as GoogleSignInModule;
    return cachedModule;
  } catch {
    return null;
  }
}

function configureOnce(mod: GoogleSignInModule): void {
  if (isConfigured || !WEB_CLIENT_ID) return;
  mod.GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    ...(IOS_CLIENT_ID ? { iosClientId: IOS_CLIENT_ID } : {}),
    offlineAccess: false,
  });
  isConfigured = true;
}

interface UseGoogleSignInResult {
  /** False khi thiếu cấu hình trong .env — UI báo rõ thay vì để bấm rồi lỗi. */
  isAvailable: boolean;
  isSigningIn: boolean;
  errorMessage: string | null;
  clearError: () => void;
  /** Trả User khi thành công; null khi người dùng huỷ hoặc lỗi (xem `errorMessage`). */
  signIn: () => Promise<User | null>;
}

export function useGoogleSignIn(): UseGoogleSignInResult {
  const { loginWithGoogle } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tránh setState sau khi màn hình đã unmount (người dùng back giữa lúc đang mở popup).
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    const mod = loadGoogleSignIn();
    if (mod) configureOnce(mod);
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const clearError = useCallback(() => setErrorMessage(null), []);

  const signIn = useCallback(async (): Promise<User | null> => {
    if (!WEB_CLIENT_ID || !FIREBASE_API_KEY) {
      setErrorMessage('Đăng nhập Google chưa được cấu hình.');
      return null;
    }

    const mod = loadGoogleSignIn();
    if (!mod) {
      setErrorMessage(
        'Đăng nhập Google cần bản build riêng của ứng dụng (không dùng được trên Expo Go).',
      );
      return null;
    }

    setErrorMessage(null);
    setIsSigningIn(true);
    try {
      configureOnce(mod);
      const { GoogleSignin } = mod;

      // Android cần Google Play Services; iOS bỏ qua check này.
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Đăng xuất phiên cũ để luôn hiện bộ chọn tài khoản thay vì im lặng dùng account cuối.
      await GoogleSignin.signOut().catch(() => undefined);

      const response = await GoogleSignin.signIn();
      if (response.type === 'cancelled') return null;

      const googleIdToken = response.data?.idToken;
      if (!googleIdToken) {
        setErrorMessage('Không lấy được thông tin xác thực từ Google.');
        return null;
      }

      // BE verify token do Firebase phát hành, không phải token Google thô.
      const firebaseIdToken = await exchangeGoogleTokenForFirebaseIdToken(
        googleIdToken,
        FIREBASE_API_KEY,
      );

      const user = await loginWithGoogle({ idToken: firebaseIdToken });
      return isMountedRef.current ? user : null;
    } catch (error) {
      const { isErrorWithCode, statusCodes } = mod;
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) return null;
        if (error.code === statusCodes.IN_PROGRESS) return null;
        if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          setErrorMessage('Thiết bị chưa có Google Play Services. Vui lòng đăng nhập bằng email.');
          return null;
        }
        // SHA-1 chưa đăng ký hoặc sai package name. Không có trong `statusCodes` nên so khớp
        // trực tiếp: Android trả "DEVELOPER_ERROR", đôi khi là mã số 10.
        if (error.code === 'DEVELOPER_ERROR' || String(error.code) === '10') {
          setErrorMessage(
            'Cấu hình Google chưa đúng (SHA-1 hoặc package name). Xem docs/fe-google-signin-setup.md.',
          );
          return null;
        }
      }
      if (error instanceof Error && error.message === 'FIREBASE_TOKEN_EXCHANGE_FAILED') {
        setErrorMessage('Xác thực Google thất bại. Kiểm tra cấu hình Firebase.');
        return null;
      }
      setErrorMessage(getAuthErrorMessage(error, 'Đăng nhập Google thất bại. Vui lòng thử lại.'));
      return null;
    } finally {
      if (isMountedRef.current) setIsSigningIn(false);
    }
  }, [loginWithGoogle]);

  return {
    // Cần cả cấu hình lẫn native module — trên Expo Go module không tồn tại.
    isAvailable: Boolean(WEB_CLIENT_ID && FIREBASE_API_KEY && loadGoogleSignIn()),
    isSigningIn,
    errorMessage,
    clearError,
    signIn,
  };
}
