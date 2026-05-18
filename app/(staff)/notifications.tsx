import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';

export default function StaffNotificationsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="px-4 pb-3 pt-2">
        <Text className="text-xl font-bold text-textPrimary">Thông báo</Text>
      </View>
      <View className="flex-1 items-center justify-center px-6">
        <Ionicons name="notifications-outline" size={56} color={colors.textDisabled} />
        <Text className="mt-3 text-base font-semibold text-textPrimary">Chưa có thông báo</Text>
        <Text className="mt-1 text-center text-sm text-textSecondary">
          Các thông báo từ officer và hệ thống sẽ hiển thị ở đây.
        </Text>
      </View>
    </View>
  );
}
