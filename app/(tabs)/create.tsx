import { SafeScreen } from '@/components/layout/SafeScreen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { router } from 'expo-router';
import { View } from 'react-native';

/** FAB trung tâm — luồng gửi báo cáo đầy đủ sẽ thay thế màn placeholder này. */
export default function CreateReportScreen() {
  return (
    <SafeScreen className="justify-center px-6">
      <Text className="text-center text-2xl font-bold text-textPrimary">Tạo báo cáo mới</Text>
      <Text className="mt-3 text-center text-base text-textSecondary">
        Chụp ảnh, chọn vị trí và gửi báo cáo — màn hình wizard đang được xây dựng.
      </Text>
      <View className="mt-8">
        <Button className="rounded-2xl" onPress={() => router.back()}>
          <Text className="font-semibold text-primary-foreground">Quay lại bản đồ</Text>
        </Button>
      </View>
    </SafeScreen>
  );
}
