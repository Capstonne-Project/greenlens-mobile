import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/stores/auth.store';
import type { ApiEnvelope } from '@/types/api.types';
import type { AuthSessionPayload } from '@/types/user.types';
import { normalizeMobileUser, type UserFromApi } from '@/utils/mobile-user';

/** Base URL có prefix `/v1` — xem docs/MOBILE_AUTH_INTEGRATION.md §1 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5162/v1';

const ACCEPT_LANGUAGE = 'vi-VN';

/** Endpoint không Bearer — login, refresh, OTP… */
export const apiPublic = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Accept-Language': ACCEPT_LANGUAGE,
  },
});

/** Request có access token */
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Accept-Language': ACCEPT_LANGUAGE,
  },
});

async function resolveAccessToken(): Promise<string | null> {
  const inMemory = useAuthStore.getState().accessToken;
  if (inMemory) return inMemory;
  return SecureStore.getItemAsync('accessToken');
}

api.interceptors.request.use(async (config) => {
  const token = await resolveAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // FormData: để axios tự set boundary — tránh ghi đè Authorization
  if (config.data instanceof FormData) {
    if (typeof config.headers.delete === 'function') {
      config.headers.delete('Content-Type');
    } else {
      delete config.headers['Content-Type'];
    }
    // Upload ảnh/video lên R2 thường > 15s — tăng timeout riêng cho multipart
    if (config.timeout == null || config.timeout < 60_000) {
      config.timeout = 60_000;
    }
  }

  return config;
});

/** 401 trên các route này không thử refresh (sai mật khẩu, OTP sai…) */
const PATHS_NO_REFRESH = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh-token',
  '/auth/request-otp',
  '/auth/verify-otp',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/google-login',
  '/auth/change-password',
];

function isNoRefreshPath(url?: string): boolean {
  if (!url) return false;
  return PATHS_NO_REFRESH.some((p) => url.includes(p));
}

let refreshPromise: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const rt = await SecureStore.getItemAsync('refreshToken');
  if (!rt) return null;
  try {
    const res = await apiPublic.post<ApiEnvelope<AuthSessionPayload>>('/auth/refresh-token', {
      refreshToken: rt,
    });
    const p = res.data.data;
    await useAuthStore.getState().setAuth(normalizeMobileUser(p.user as UserFromApi), {
      accessToken: p.accessToken,
      refreshToken: p.refreshToken,
    });
    return p.accessToken;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;

    if (__DEV__) {
      console.log('[api] error', status, originalRequest?.method, originalRequest?.url);
      console.log('[api] error body', JSON.stringify(error.response?.data));
      console.log('[api] error code', error.code, error.message);
    }

    if (status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    if (isNoRefreshPath(originalRequest.url)) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      await useAuthStore.getState().clearAuth();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = performRefresh().finally(() => {
          refreshPromise = null;
        });
      }
      const access = await refreshPromise;
      if (!access) {
        await useAuthStore.getState().clearAuth();
        return Promise.reject(error);
      }
      originalRequest.headers.Authorization = `Bearer ${access}`;
      return api(originalRequest);
    } catch {
      await useAuthStore.getState().clearAuth();
      return Promise.reject(error);
    }
  },
);
