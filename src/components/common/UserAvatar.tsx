import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';

const AVATAR_PALETTE = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6'] as const;

/** Màu nền ổn định theo tên — cùng một người luôn ra cùng màu. */
function hashColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  /** Đội xử lý — hiện icon khiên thay chữ cái, không dùng avatar cá nhân */
  isTeam?: boolean;
  /** Người gửi ẩn danh hoặc đã xóa tài khoản */
  isAnonymous?: boolean;
}

/**
 * Avatar người dùng: ưu tiên ảnh thật, fallback chữ cái đầu trên nền màu theo tên.
 * Dùng chung cho report detail, comment, và màn hồ sơ công khai.
 */
export function UserAvatar({
  name,
  avatarUrl,
  size = 36,
  isTeam = false,
  isAnonymous = false,
}: UserAvatarProps) {
  const [failed, setFailed] = useState(false);

  const showImage = Boolean(avatarUrl) && !failed && !isTeam && !isAnonymous;
  const bg = isTeam ? colors.primary : isAnonymous ? colors.textSecondary : hashColor(name || 'user');

  if (showImage) {
    return (
      <Image
        source={{ uri: avatarUrl! }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        transition={150}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View
      className="items-center justify-center rounded-full"
      style={{ width: size, height: size, backgroundColor: bg }}
    >
      {isTeam ? (
        <Ionicons name="shield-checkmark" size={size * 0.45} color={colors.white} />
      ) : isAnonymous ? (
        <Ionicons name="person" size={size * 0.45} color={colors.white} />
      ) : (
        <Text className="font-bold text-white" style={{ fontSize: size * 0.34 }}>
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
}
