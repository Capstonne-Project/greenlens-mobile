import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { useAuth } from '@/hooks/useAuth';
import { colors } from '@/theme/colors';

export default function InspectorProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 24 }}>
      <View className="px-4 pb-3 pt-2">
        <Text className="text-2xl font-bold text-textPrimary">Cá nhân</Text>
      </View>

      <View className="mx-4 mb-4 flex-row items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-primary">
          <Text className="text-lg font-bold text-white">{user?.fullName?.[0] ?? 'I'}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-textPrimary">{user?.fullName}</Text>
          <Text className="text-sm text-textSecondary">{user?.email}</Text>
          <View className="mt-1 self-start rounded-full bg-surface px-2 py-0.5">
            <Text className="text-xs font-semibold text-primary">Inspector</Text>
          </View>
        </View>
      </View>

      <Pressable
        onPress={() => router.push('/(inspector)/(tabs)/notifications' as Href)}
        className="mx-4 mb-3 flex-row items-center gap-3 rounded-2xl bg-white px-4 py-4"
      >
        <Ionicons name="notifications-outline" size={22} color={colors.textSecondary} />
        <Text className="text-base font-semibold text-textPrimary">Thông báo</Text>
      </Pressable>

      <Pressable
        onPress={() => void logout().then(() => router.replace('/(auth)/login' as Href))}
        className="mx-4 flex-row items-center gap-3 rounded-2xl bg-white px-4 py-4"
      >
        <Ionicons name="log-out-outline" size={22} color={colors.error} />
        <Text className="text-base font-semibold text-error">Đăng xuất</Text>
      </Pressable>
    </View>
  );
}
