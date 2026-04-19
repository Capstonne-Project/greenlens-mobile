import { api } from './api';
import type { ApiResponse } from '@/types/api.types';
import type { User, LoginDto, RegisterDto, AuthTokens } from '@/types/user.types';

export const authService = {
  login: (dto: LoginDto) =>
    api.post<ApiResponse<{ user: User; tokens: AuthTokens }>>('/auth/login', dto),

  register: (dto: RegisterDto) =>
    api.post<ApiResponse<{ user: User; tokens: AuthTokens }>>('/auth/register', dto),

  logout: () =>
    api.post<ApiResponse<null>>('/auth/logout'),

  getMe: () =>
    api.get<ApiResponse<User>>('/auth/me'),

  refreshToken: (refreshToken: string) =>
    api.post<ApiResponse<AuthTokens>>('/auth/refresh', { refreshToken }),
};
