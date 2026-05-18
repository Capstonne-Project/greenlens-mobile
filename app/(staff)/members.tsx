import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { useAuth } from '@/hooks/useAuth';
import { colors } from '@/theme/colors';

export default function StaffMembersScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="px-4 pb-3 pt-2">
        <Text className="text-xl font-bold text-textPrimary">Thành viên</Text>
        {!!user?.teamName && (
          <Text className="mt-0.5 text-sm text-textSecondary">{user.teamName}</Text>
        )}
      </View>
      <View className="flex-1 items-center justify-center px-6">
        <Ionicons name="people-outline" size={56} color={colors.textDisabled} />
        <Text className="mt-3 text-base font-semibold text-textPrimary">Danh sách thành viên</Text>
        <Text className="mt-1 text-center text-sm text-textSecondary">
          Thành viên trong nhóm xử lý sẽ hiển thị ở đây.
        </Text>
      </View>
    </View>
  );
}
