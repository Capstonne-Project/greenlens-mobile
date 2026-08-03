import { api } from './api';
import type { ApiEnvelope } from '@/types/api.types';
import type { PublicUserProfile, PublicUserReportsResponse, User } from '@/types/user.types';

interface UpdateProfileResult {
  userId: string;
  message: string;
}

interface UploadAvatarResult {
  avatarUrl: string;
  message: string;
}

interface UploadAvatarInput {
  uri: string;
  mimeType: string;
  fileName: string;
}

export const userService = {
  getProfile: () => api.get<ApiEnvelope<User>>('/users/profile'),

  /** Hồ sơ công khai của người dùng khác — không trả email/SĐT */
  getPublicProfile: (userId: string) =>
    api.get<ApiEnvelope<PublicUserProfile>>(`/users/${userId}/public-profile`),

  /** Báo cáo công khai của người dùng khác — hiển thị lưới trên hồ sơ */
  getPublicReports: (userId: string, params: { page?: number; pageSize?: number } = {}) =>
    api.get<ApiEnvelope<PublicUserReportsResponse>>(`/users/${userId}/reports`, { params }),

  /** BE chỉ hỗ trợ đổi `fullName` — không có address/dateOfBirth/gender/email */
  updateProfile: (fullName: string) =>
    api.put<ApiEnvelope<UpdateProfileResult>>('/users/profile', { fullName }),

  /** POST /users/me/consent — Accept Data Consent (Bearer). Idempotent. */
  acceptConsent: () => api.post<ApiEnvelope<null>>('/users/me/consent'),

  uploadAvatar: ({ uri, mimeType, fileName }: UploadAvatarInput) => {
    const formData = new FormData();
    formData.append('file', { uri, name: fileName, type: mimeType } as unknown as Blob);
    return api.post<ApiEnvelope<UploadAvatarResult>>('/users/avatar', formData);
  },
};
