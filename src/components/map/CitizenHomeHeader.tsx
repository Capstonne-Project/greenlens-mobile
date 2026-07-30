import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { NotificationBell } from '@/components/common/NotificationBell';
import { TapScale } from '@/components/layout/TapScale';
import { useAuthStore } from '@/stores/auth.store';
import { colors } from '@/theme/colors';

interface CitizenHomeHeaderProps {
  onProfilePress?: () => void;
  onSearchPress?: () => void;
  /** Tên vùng đang focus — hiện thay placeholder khi có */
  activeAreaName?: string | null;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function CitizenHomeHeader({
  onProfilePress,
  onSearchPress,
  activeAreaName,
}: CitizenHomeHeaderProps) {
  const user = useAuthStore((s) => s.user);

  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-2">
        {/* Pressable thay TextInput: bàn phím trên header dễ bị map che, nên mở overlay riêng */}
        <Pressable
          onPress={onSearchPress}
          className="h-11 flex-1 flex-row items-center gap-2 rounded-full border border-border bg-white px-3"
        >
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <Text
            numberOfLines={1}
            className="flex-1 text-sm"
            style={{ color: activeAreaName ? colors.textPrimary : '#94A3B8' }}
          >
            {activeAreaName ?? 'Tìm tỉnh, thành phố, phường/xã...'}
          </Text>
        </Pressable>

        <NotificationBell />

        <TapScale onPress={onProfilePress ?? (() => {})}>
          <View className="h-11 w-11 items-center justify-center rounded-full bg-info">
            <Text className="text-sm font-bold text-white">{initials(user?.fullName ?? 'VA')}</Text>
          </View>
        </TapScale>
      </View>
    </View>
  );
}
