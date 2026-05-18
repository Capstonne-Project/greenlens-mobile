import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { useAuth } from '@/hooks/useAuth';
import { colors } from '@/theme/colors';

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

function SettingRow({ icon, label, onPress, destructive = false }: SettingRowProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const textColor = destructive ? colors.error : colors.textPrimary;
  const iconColor = destructive ? colors.error : colors.textSecondary;

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.98, { damping: 16, stiffness: 280 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 16, stiffness: 280 }); }}
        onPress={onPress}
        className="flex-row items-center gap-3 px-4 py-4"
      >
        <View className="h-9 w-9 items-center justify-center rounded-full bg-surface">
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <Text className="flex-1 text-base" style={{ color: textColor }}>{label}</Text>
        {!destructive && <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />}
      </Pressable>
    </Animated.View>
  );
}

export default function StaffSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login' as Href);
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="px-4 pb-3 pt-2">
        <Text className="text-xl font-bold text-textPrimary">Cài đặt</Text>
      </View>

      {/* Profile section */}
      <View className="mx-4 mb-4 flex-row items-center gap-3 rounded-2xl bg-white p-4 shadow-sm" style={{ elevation: 2 }}>
        <View className="h-12 w-12 items-center justify-center rounded-full bg-primary">
          <Text className="text-lg font-bold text-white">{user?.fullName?.[0] ?? 'C'}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-textPrimary">{user?.fullName}</Text>
          <Text className="text-sm text-textSecondary">{user?.email}</Text>
          {!!user?.teamName && (
            <View className="mt-1 self-start rounded-full bg-primaryLight px-2 py-0.5">
              <Text className="text-xs font-semibold text-primary">{user.teamName}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Settings rows */}
      <View className="mx-4 overflow-hidden rounded-2xl bg-white shadow-sm" style={{ elevation: 2 }}>
        <View className="divide-y divide-border">
          <SettingRow icon="notifications-outline" label="Thông báo" onPress={() => {}} />
          <View className="h-px bg-border" />
          <SettingRow icon="lock-closed-outline" label="Đổi mật khẩu" onPress={() => {}} />
          <View className="h-px bg-border" />
          <SettingRow icon="information-circle-outline" label="Về ứng dụng" onPress={() => {}} />
        </View>
      </View>

      <View className="mx-4 mt-4 overflow-hidden rounded-2xl bg-white shadow-sm" style={{ elevation: 2 }}>
        <SettingRow icon="log-out-outline" label="Đăng xuất" onPress={handleLogout} destructive />
      </View>
    </View>
  );
}
