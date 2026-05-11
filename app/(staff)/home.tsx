import { SafeScreen } from '@/components/layout/SafeScreen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/hooks/useAuth';
import { router, type Href } from 'expo-router';
import { View } from 'react-native';

/** CleanupTeam — thay bằng dashboard đội xử lý khi có thiết kế */
export default function StaffHomeScreen() {
  const { user, logout } = useAuth();

  return (
    <SafeScreen className="justify-center px-6">
      <Text className="text-center text-2xl font-bold text-textPrimary">Đội xử lý</Text>
      <Text className="mt-2 text-center text-base text-textSecondary">
        Xin chào {user?.fullName}. Khu vực dành cho vai trò CleanupTeam — sẽ được bổ sung sau.
      </Text>
      <View className="mt-10">
        <Button
          variant="outline"
          className="rounded-2xl"
          onPress={async () => {
            await logout();
            router.replace('/(auth)/login' as Href);
          }}
        >
          <Text className="font-semibold text-textPrimary">Đăng xuất</Text>
        </Button>
      </View>
    </SafeScreen>
  );
}
