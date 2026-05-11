import { SafeScreen } from '@/components/layout/SafeScreen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/hooks/useAuth';
import { router, type Href } from 'expo-router';
import { View } from 'react-native';

export default function ProfileTabScreen() {
  const { user, logout } = useAuth();

  return (
    <SafeScreen className="px-6 pt-4">
      <Text className="text-2xl font-bold text-textPrimary">Cá nhân</Text>
      <Text className="mt-1 text-base text-textSecondary">{user?.fullName ?? 'Người dùng'}</Text>
      <Text className="mt-0.5 text-sm text-textSecondary">{user?.email}</Text>

      <View className="mt-8">
        <Button
          variant="outline"
          className="rounded-2xl"
          onPress={() => router.push('/(tabs)/change-password' as Href)}
        >
          <Text className="font-semibold text-textPrimary">Đổi mật khẩu</Text>
        </Button>
      </View>

      <View className="mt-6">
        <Button
          variant="outline"
          className="rounded-2xl border-destructive"
          onPress={async () => {
            await logout();
            router.replace('/(auth)/login' as Href);
          }}
        >
          <Text className="font-semibold text-destructive">Đăng xuất</Text>
        </Button>
      </View>
    </SafeScreen>
  );
}
