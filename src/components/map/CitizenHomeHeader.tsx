import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput, View } from 'react-native';
import { TapScale } from '@/components/layout/TapScale';
import { useAuthStore } from '@/stores/auth.store';

interface CitizenHomeHeaderProps {
  onMenuPress?: () => void;
  onProfilePress?: () => void;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function CitizenHomeHeader({ onMenuPress, onProfilePress }: CitizenHomeHeaderProps) {
  const user = useAuthStore((s) => s.user);

  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-3">
        <TapScale onPress={onMenuPress ?? (() => {})}>
          <View className="h-11 w-11 items-center justify-center rounded-full border border-border bg-white">
            <Ionicons name="menu-outline" size={24} color="#334155" />
          </View>
        </TapScale>

        <View className="h-11 flex-1 flex-row items-center gap-2 rounded-full border border-border bg-white px-3">
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <TextInput
            editable={false}
            placeholder="Tìm địa điểm, báo cáo..."
            placeholderTextColor="#94A3B8"
            className="flex-1 py-0 text-sm text-textPrimary"
          />
        </View>

        <TapScale onPress={onProfilePress ?? (() => {})}>
          <View className="h-11 w-11 items-center justify-center rounded-full bg-info">
            <Text className="text-sm font-bold text-white">{initials(user?.fullName ?? 'VA')}</Text>
          </View>
        </TapScale>
      </View>
    </View>
  );
}
