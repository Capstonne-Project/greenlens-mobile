import { useCallback, useState } from 'react';
import { userService } from '@/services/user.service';
import { useAuthStore } from '@/stores/auth.store';

interface UploadAvatarInput {
  uri: string;
  mimeType: string;
  fileName: string;
}

/** Chỉ đổi tên + avatar — BE chưa hỗ trợ address/dateOfBirth/gender/email (xem docs/mobile-edit-profile-api.md) */
export function useEditProfile() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  /**
   * Đồng bộ lại từ server sau khi update — tránh lệch state cục bộ.
   * `avatarUrlOverride`: dùng bản URL đã cache-bust (query `?v=`) thay vì avatarUrl gốc từ
   * response, vì CDN có thể trả cùng URL cho ảnh mới ghi đè và expo-image sẽ dùng cache cũ.
   */
  const refetchProfile = useCallback(
    async (avatarUrlOverride?: string | null) => {
      const { data: envelope } = await userService.getProfile();
      setUser({ ...envelope.data, avatarUrl: avatarUrlOverride ?? envelope.data.avatarUrl });
    },
    [setUser],
  );

  const updateFullName = useCallback(
    async (fullName: string) => {
      setIsSavingName(true);
      try {
        await userService.updateProfile(fullName);
        await refetchProfile();
      } finally {
        setIsSavingName(false);
      }
    },
    [refetchProfile],
  );

  const uploadAvatar = useCallback(
    async (input: UploadAvatarInput) => {
      setIsUploadingAvatar(true);
      try {
        const { data: envelope } = await userService.uploadAvatar(input);
        const avatarUrl = envelope.data.avatarUrl;
        if (__DEV__) console.log('[useEditProfile] uploadAvatar response avatarUrl:', avatarUrl);

        const bustedUrl = avatarUrl ? `${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}v=${Date.now()}` : avatarUrl;
        await refetchProfile(bustedUrl);
        return bustedUrl;
      } finally {
        setIsUploadingAvatar(false);
      }
    },
    [refetchProfile],
  );

  return { user, isSavingName, isUploadingAvatar, updateFullName, uploadAvatar };
}
