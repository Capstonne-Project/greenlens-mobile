import { api } from './api';
import type { ApiEnvelope } from '@/types/api.types';
import type { User } from '@/types/user.types';

export const userService = {
  getProfile: () => api.get<ApiEnvelope<User>>('/users/profile'),

  updateProfile: (data: { fullName?: string; avatarUrl?: string }) =>
    api.patch<ApiEnvelope<User>>('/users/profile', data),
};
