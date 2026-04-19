import { api } from './api';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';
import type { User } from '@/types/user.types';

export const userService = {
  getLeaderboard: (page = 1) =>
    api.get<PaginatedResponse<User>>('/users/leaderboard', { params: { page } }),

  updateProfile: (data: { fullName?: string; avatarUrl?: string }) =>
    api.patch<ApiResponse<User>>('/users/me', data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post<ApiResponse<null>>('/users/me/change-password', data),
};
